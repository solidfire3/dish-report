import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { extractJson } from "@/lib/extract-json";

const RESTAURANT_TTL_MS = 120 * 24 * 60 * 60 * 1000;
const STAMPEDE_GUARD_MS = 2 * 60 * 1000;

const CONFIRM_PROMPT = `You are a location finder. Find top 1-3 matching businesses OR public markets/food courts for the user's query.
Also detect if the location is a food market, food court, public market, or multi-vendor food destination.
Return ONLY valid JSON: { "is_market": boolean, "matches": [{ "name":"string","address":"string","city":"string","neighborhood":"string|null","cuisine":"string","price_range":"$|$$|$$$|$$$$|null" }] }`;

const DEEP_PROMPT = `You are a food cheat sheet generator. The user is going to this restaurant. Give them exactly what they need to order the best possible meal. Be punchy, specific, and direct — like a well-connected local friend texting you what to get.

Focus entirely on: what to order, what makes each dish special, what to skip, insider tricks. Do NOT compare to other restaurants. Do NOT talk about service or decor.

SOURCE GROUNDING (anti-hallucination): Ground every claim — must-orders, insider tips, skip items, and the verdict — in actually retrieved review/source material. Do NOT invent dishes, quotes, or menu details not supported by sources. If a specific claim cannot be confirmed from retrieved content, omit it rather than guess. Only describe dishes mentioned across multiple reviews as notable.

VIBE TAGS: 2-4 punchy shorthand descriptors. Examples: "hole-in-the-wall gem", "neighborhood institution", "cult following", "hidden gem", "locals only", "cash only gem", "late night staple", "date night worthy", "chef-driven", "off the beaten path", "BYOB friendly", "no reservations needed", "tourist trap to avoid", "Michelin recognized", "James Beard winner", "market price seafood".

MUST ORDERS: 2-4 specific items. Be specific with menu names. One punchy sentence on WHY each is the move.

ALSO TRY: 2-3 secondary items, one food-specific sentence each.

SKIP: 1-3 items reviewers consistently find disappointing (food quality only). Only include if clearly documented.

INSIDER TIPS: 2-4 specific tips (best time for fresh prep, what to request, secret menu items, seasonal specials, best seat in house for food experience, etc.)

SCORING (food quality only — be genuinely critical; use the SAME scale as search results):
DEFAULT ASSUMPTION: a restaurant is AVERAGE. Average = 6.0, not 8.0. Most places are unremarkable.
HIGH SCORES ARE EARNED AND RARE. Being "fine" or "popular" is not enough for 8+.
USE THE FULL SCALE — including low scores without hesitation. Resist rounding up or softening.
If review signal is mixed, the score reflects that. No benefit of the doubt.

Score tiers:
9.2-10.0: Michelin level. Internationally recognized or technically exceptional. Extremely rare.
8.7-9.1:  Local legend. A true city destination repeatedly cited as among the very best. Rare.
8.1-8.6:  Always great. Consistently excellent; specific dishes that earn repeat visits.
7.5-8.0:  Solid spot. Reliable neighborhood restaurant; positive but no citywide reputation.
6.9-7.4:  Hit and miss. Inconsistent quality or one standout dish on an ordinary menu.
6.0-6.8:  Convenience. Acceptable; chosen for location or price, not quality.
5.0-5.9:  Compromise. Below expectations; noticeable quality issues.
2.5-4.9:  Disappointment. Significant problems documented across reviews.
0.1-2.4:  Disgust. Repeated serious food-quality failures.

Typical good local spot: 7.5-8.0. Mediocre: 6-something. Bad: below 6. 9.0+ is for true standouts only.

Return ONLY valid JSON:
{"name":"string","neighborhood":"string","address":"string|null","cuisine":"string","venue_type":"string","vibe_tags":["string"],"food_score":number,"confidence":"high|medium|low","price_range":"$|$$|$$$|$$$$|null","website_domain":"string|null","hours":"string|null","specials":"string|null","experience_note":"string|null","must_orders":[{"item":"string","why":"string"}],"also_try":[{"dish":"string","note":"string"}],"skip":["string"],"insider_tips":["string"],"verdict":"string (2 punchy sentences)"}`;

function makeSvc() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function runDeepDivePipeline(client: Anthropic, name: string, city: string, address?: string): Promise<unknown> {
  const location = address ? `at ${address}` : `in ${city}`;
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 8000,
    system: DEEP_PROMPT,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: `"${name}" ${location}. Food cheat sheet. Return JSON.` }],
  });
  return extractJson(msg.content);
}

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { mode, name, city, restaurant_id, address } = await req.json();

    // ── Confirm (location lookup, unchanged) ──────────────────────────────────
    if (mode === "confirm") {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 700,
        system: CONFIRM_PROMPT,
        // @ts-ignore
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: `Find: "${name}" in ${city}.` }],
      });
      return NextResponse.json(extractJson(msg.content));
    }

    // ── Deep Dive — DB-first to eliminate score drift ─────────────────────────
    const db = makeSvc();

    if (restaurant_id) {
      const { data: rest } = await db
        .from("restaurants")
        .select("id, food_score, deep_dive, refreshed_at, refreshing_at")
        .eq("id", restaurant_id)
        .maybeSingle();

      const row = rest as {
        id: string; food_score: number | null;
        deep_dive: Record<string, unknown> | null;
        refreshed_at: string; refreshing_at: string | null;
      } | null;

      if (row?.deep_dive) {
        const ageMs = Date.now() - new Date(row.refreshed_at).getTime();
        const isFresh = ageMs < RESTAURANT_TTL_MS;
        const isRefreshing = !!row.refreshing_at &&
          (Date.now() - new Date(row.refreshing_at).getTime() < STAMPEDE_GUARD_MS);

        if (isFresh) {
          // Fresh deep dive in DB — zero Anthropic calls, score is always the durable base
          console.log("[deepdive] DB HIT fresh — restaurant_id:", restaurant_id);
          return NextResponse.json({ ...row.deep_dive, food_score: row.food_score });
        }

        if (!isRefreshing) {
          // Stale — serve immediately, refresh in background
          console.log("[deepdive] DB HIT stale — restaurant_id:", restaurant_id, "| backgrounding");
          db.from("restaurants")
            .update({ refreshing_at: new Date().toISOString() })
            .eq("id", row.id)
            .then(() => {
              runDeepDivePipeline(client, name, city).then(fresh => {
                db.from("restaurants").update({
                  deep_dive: fresh,
                  refreshed_at: new Date().toISOString(),
                  refreshing_at: null,
                  // Only update food_score if the restaurant currently has none
                  ...(row.food_score == null ? { food_score: (fresh as Record<string, unknown>).food_score } : {}),
                }).eq("id", row.id).then(() => {}, () => {});
              });
            });
        }

        return NextResponse.json({ ...row.deep_dive, food_score: row.food_score });
      }

      // Restaurant exists but no deep_dive yet — run pipeline and store
      console.log("[deepdive] DB MISS (no deep_dive) — restaurant_id:", restaurant_id, "| running pipeline");
      const fresh = await runDeepDivePipeline(client, name, city, address) as Record<string, unknown>;
      const durableScore = row?.food_score ?? fresh.food_score;
      await db.from("restaurants").update({
        deep_dive: fresh,
        refreshed_at: new Date().toISOString(),
        refreshing_at: null,
        ...(row?.food_score == null ? { food_score: fresh.food_score } : {}),
      }).eq("id", restaurant_id);
      return NextResponse.json({ ...fresh, food_score: durableScore });
    }

    // Cold open (no restaurant_id) — try to find by name in restaurants table first
    console.log("[deepdive] cold open (no restaurant_id) — name:", name, "| checking DB by name");
    try {
      const { data: byName } = await db
        .from("restaurants")
        .select("id, food_score, deep_dive, refreshed_at, refreshing_at")
        .ilike("name", name.trim())
        .maybeSingle();
      const byNameRow = byName as { id: string; food_score: number | null; deep_dive: Record<string, unknown> | null; refreshed_at: string; refreshing_at: string | null } | null;

      if (byNameRow?.deep_dive) {
        const ageMs = Date.now() - new Date(byNameRow.refreshed_at).getTime();
        if (ageMs < RESTAURANT_TTL_MS) {
          console.log("[deepdive] DB HIT by name — returning stored deep dive");
          return NextResponse.json({ ...byNameRow.deep_dive, food_score: byNameRow.food_score });
        }
      }

      // Not in DB or stale — call Anthropic
      const fresh = await runDeepDivePipeline(client, name, city, address) as Record<string, unknown>;

      // If we found a restaurant row, stamp the deep dive back (name-based cold open)
      if (byNameRow?.id) {
        db.from("restaurants").update({
          deep_dive: fresh,
          refreshed_at: new Date().toISOString(),
          refreshing_at: null,
          ...(byNameRow.food_score == null ? { food_score: fresh.food_score } : {}),
        }).eq("id", byNameRow.id).then(() => {}, () => {});
      }

      return NextResponse.json(fresh);
    } catch {
      const result = await runDeepDivePipeline(client, name, city, address);
      return NextResponse.json(result);
    }

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Deep dive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
