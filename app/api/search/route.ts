import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildTags, computeSignature } from "@/lib/search-signature";

const CACHE_TTL_DAYS = 120;
const STAMPEDE_GUARD_MS = 2 * 60 * 1000;

const CLASSIFY_PROMPT = `You are a food search narrowing assistant. When a dish query is broad OR contains location intent without specifying distance/mode/price, provide sequential narrowing questions.

CASE 1 — Broad dish/cuisine (no location intent):
Provide 1-3 questions narrowing the dish type.
Examples:
- "pizza" → Q1: style (Neapolitan/NY Slice/Detroit/New Haven/Sicilian/Chicago Deep Dish/Roman al Taglio/Grandma/Bar Pizza) → Q2: focus (Margherita/White Pizza/Clam/Truffle/Prosciutto/Meat Lovers/Veggie)
- "tacos" → Q1: protein (Beef/Pork/Seafood/Chicken/Veggie) → Q2: specific (for Beef: Carne Asada/Barbacoa/Birria/Suadero; for Pork: Carnitas/Al Pastor/Adobada)
- "ramen" → Q1: broth (Tonkotsu/Shoyu/Miso/Shio/Spicy Tantanmen/Tsukemen/Mazemen/Vegan) → Q2: richness (Extra rich & fatty/Classic/Lighter/Extra noodles focus)
- "sushi" → Q1: format (Omakase/Nigiri bar/AYCE/Hand rolls/Casual rolls) → Q2: focus (Fatty fish/Lean fish/Shellfish/Seasonal uni/Mixed)
- "curry" → Q1: cuisine (Indian/Thai/Japanese/Sri Lankan/Caribbean/Malaysian/Singaporean)
- "burgers" → Q1: style (Smash/Classic pub/Gourmet/Wagyu/Fast casual) → Q2: focus (Double smash/Cheese focus/Truffle/Bacon/Mushroom Swiss/Classic)
- "chicken" → Q1: prep (Fried/Korean Fried/Nashville Hot/Grilled/Rotisserie/Braised/Karaage)
- "steak" → Q1: setting (Upscale steakhouse/Casual bistro/Argentinian/Korean BBQ/French) → Q2: cut
- "noodles" → Q1: cuisine (Chinese/Japanese/Thai/Vietnamese/Korean/Italian)
- "bbq" → Q1: regional (Texas/Kansas City/Carolina/Memphis/Korean/Hawaiian)
- "dumplings" → Q1: type (XLB Soup/Pan-fried/Gyoza/Pierogi/Manti/Momo/Har Gow)
- "seafood" → Q1: type (Oysters/Lobster/Crab/Grilled whole fish/Ceviche/Raw bar)
- "pasta" → Q1: style (Fresh pasta tasting/Carbonara/Cacio e Pepe/Bolognese/Seafood/Baked)

CASE 2 — Location-based search (contains "near me", "nearby", "close to", "in [neighborhood]", or is a cuisine/restaurant type without explicit distance):
Ask these questions in order to refine the search:

Q1 (always ask): "How far are you willing to go?"
Options: Within 1 mile / Within 2 miles / Within 5 miles / Within 10 miles / Any distance

Q2 (always ask): "Dining in or taking out?"
Options: Dine-in / Takeout / Delivery / Either

Q3 (ask only if no price signal in query): "What's your budget per person?"
Options: Under $15 / $15–30 / $30–60 / $60+

Return ONLY valid JSON:
Broad: { "broad": true, "questions": [{ "question": "short punchy question 6-9 words", "options": ["opt1","opt2",...5-12] }] }
  Include 1-3 question objects.
Specific: { "broad": false }`;

function hasLocationIntent(query: string): boolean {
  const terms = [
    'near me', 'nearby', 'close to', 'around me',
    'in my area', 'open now', 'open late', 'tonight',
    'right now', 'this weekend', 'for dinner',
    'for lunch', 'for breakfast', 'happy hour',
  ];
  const lower = query.toLowerCase();
  return terms.some(term => lower.includes(term));
}

const LOCATION_QUESTIONS = {
  broad: true,
  questions: [
    {
      question: "How far are you willing to go?",
      options: ["Within 1 mile", "Within 2 miles", "Within 5 miles", "Within 10 miles", "Any distance"],
    },
    {
      question: "Dining in or taking out?",
      options: ["Dine-in", "Takeout", "Delivery", "Either"],
    },
    {
      question: "Budget per person?",
      options: ["Under $15", "$15–30", "$30–60", "$60+"],
    },
  ],
};

const makeSearchPrompt = (excl: string[] = []) =>
  `Brutally honest food intelligence. Extract ONLY food-quality signal from reviews.
INCLUDE: flavor, texture, freshness, preparation, specific dishes, technique, consistency.
EXCLUDE: service, décor, parking, generic praise without specifics.
EXPERIENCE NOTE: ONLY if a non-food pattern (AYCE slowness drying food, etc.) is heavily documented AND directly degrades food quality. null otherwise.
VENUE TYPES: hole-in-the-wall | counter service | food truck | casual dine-in | upscale casual | fine dining
SCORING (food quality only, based on review signal):
9.0-10: Exceptional. A destination dish/spot. Consistently praised as among the best of its category in the city. Reviewers rave specifically about the food.
8.0-8.9: Excellent. Strong, consistent praise for specific dishes. A place locals genuinely recommend for the food. This should be COMMON for well-reviewed spots known for a dish.
7.0-7.9: Good and solid. Reliable food, some standout items, generally positive but not remarkable.
6.0-6.9: Mixed. Inconsistent food quality or underwhelming relative to reputation.
Below 6: Notable food-quality problems in reviews.
Calibration: A well-loved spot famous for a specific dish SHOULD score 8.0-8.9 — clear, consistent positive signal about the food is enough. Reserve 9+ for places repeatedly cited as best-in-city. The top result for a popular category in a major city should usually be high-8s or 9s. Be honest and food-focused, not stingy.
${excl.length ? `EXCLUDE already shown: ${excl.join(", ")}.` : ""}
Return ONLY valid JSON: {"dish":"string","city":"string","results":[{"rank":number,"name":"string","neighborhood":"string","address":"string|null","venue_type":"string","what_it_is":"string","food_score":number,"confidence":"high|medium|low","dish_mentions":number,"price_range":"$|$$|$$$|$$$$|null","website_domain":"string|null","hours":"string|null","specials":"string|null","experience_note":"string|null","must_orders":[{"item":"string","differentiator":"string","why":"string"}],"win_reason":"string","top_descriptors":["string"],"also_try":["string"],"best_quote":"string","warnings":["string"],"verdict":"string"}]}
Exactly 5 results, by food_score desc.`;

function extractJson(content: Anthropic.Messages.ContentBlock[]): unknown {
  const text = content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse response");
  return JSON.parse(match[0]);
}

// ─── SERVICE CLIENT ────────────────────────────────────────────────────────────

function makeSvc() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────

async function runPipeline(
  client: Anthropic,
  dish: string,
  city: string,
  area: string,
  locMode: string,
  radius: number,
  exclude: string[]
): Promise<unknown> {
  const effectiveRadius = radius && radius > 0 && radius < 20 ? radius : null;
  const locStr =
    locMode === "area" && area
      ? `within ${radius} miles of ${area}`
      : effectiveRadius
        ? `within ${effectiveRadius} miles of ${city}`
        : `in ${city}`;
  const userMsg = `Best places for "${dish}" ${locStr}.${
    exclude.length ? ` Exclude: ${exclude.join(", ")}.` : ""
  } Return JSON.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: makeSearchPrompt(exclude),
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMsg }],
  });
  return extractJson(msg.content);
}

// ─── CACHE LAYER ──────────────────────────────────────────────────────────────

type CacheRow = {
  id: string;
  results: unknown;
  expires_at: string;
  refreshing_at: string | null;
};

async function lookupCache(sig: string): Promise<CacheRow | null> {
  const { data, error } = await makeSvc()
    .from("searches")
    .select("id, results, expires_at, refreshing_at")
    .eq("dish_key", sig)
    .maybeSingle();
  console.log("[cache] DB LOOKUP — sig:", sig, "| row found:", !!data, "| has results:", !!(data as CacheRow | null)?.results, "| error:", error ? JSON.stringify(error) : null);
  return data as CacheRow | null;
}

async function upsertCache(
  sig: string,
  result: unknown,
  tags: ReturnType<typeof buildTags>,
  rawQuery: string
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await makeSvc().rpc("upsert_search", {
    p_dish_key:   sig,
    p_results:    result,
    p_expires_at: expiresAt,
    p_location:   tags.location || null,
    p_cuisine:    tags.cuisine  || null,
    p_dish:       tags.dish     || null,
    p_flavor:     tags.flavor   || null,
    p_vibe:       tags.vibe     || null,
    p_health:     tags.health   || null,
    p_price:      tags.price    || null,
    p_occasion:   tags.occasion || null,
    p_raw_query:  rawQuery,
  });
  console.log("[cache] DB WRITE — sig:", sig, "| returned_id:", data, "| error:", error ? JSON.stringify(error) : null);
  if (error) return null;
  return data as string;
}

async function triggerBackgroundRefresh(
  cachedId: string,
  pipelineFn: () => Promise<unknown>
): Promise<void> {
  try {
    const db = makeSvc();
    await db.from("searches")
      .update({ refreshing_at: new Date().toISOString() })
      .eq("id", cachedId);
    const freshResult = await pipelineFn();
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await db.from("searches")
      .update({ results: freshResult, expires_at: expiresAt, refreshing_at: null })
      .eq("id", cachedId);
  } catch (e) {
    console.error("[cache] background refresh failed:", e);
  }
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { mode, dish, city, area, locMode, radius, exclude = [] } = await req.json();

    // ── Classify ──────────────────────────────────────────────────────────────
    if (mode === "classify") {
      if (hasLocationIntent(dish || "")) return NextResponse.json(LOCATION_QUESTIONS);
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        system: CLASSIFY_PROMPT,
        messages: [{ role: "user", content: `Dish query: "${dish}"` }],
      });
      return NextResponse.json(extractJson(msg.content));
    }

    // ── Search ────────────────────────────────────────────────────────────────
    const isLoadMore = (exclude as string[]).length > 0;

    if (!isLoadMore) {
      // Layer 1 (in-memory ref cache) is handled client-side in page.tsx.
      // Layer 2: DB cache lookup.
      const tags = buildTags({ dish, city, area, locMode, radius });
      const sig  = computeSignature(tags);
      console.log("[cache:sig] dish=", JSON.stringify(dish), "city=", city, "area=", area, "locMode=", locMode, "radius=", radius);
      console.log("[cache:sig] tags=", JSON.stringify(tags));
      console.log("[cache:sig] signature=", sig);
      const cached = await lookupCache(sig);

      if (cached?.results) {
        const isFresh = new Date(cached.expires_at).getTime() > Date.now();

        if (!isFresh) {
          // Stale-while-revalidate: return cached immediately, refresh in background.
          const isRefreshing = !!cached.refreshing_at &&
            (Date.now() - new Date(cached.refreshing_at).getTime() < STAMPEDE_GUARD_MS);
          if (!isRefreshing) {
            console.log("[cache] DB HIT stale — sig:", sig, "| backgrounding refresh");
            triggerBackgroundRefresh(
              cached.id,
              () => runPipeline(client, dish, city, area, locMode, radius, [])
            ).catch(() => {});
          }
        } else {
          console.log("[cache] DB HIT fresh — sig:", sig, "| ZERO Anthropic/Places calls");
        }

        // Log to user history with the cache id (fire-and-forget, never blocks)
        logUserSearch(dish, city, area, locMode, radius, cached.id).catch(() => {});
        return NextResponse.json(cached.results);
      }

      // Cache miss — run full pipeline (Anthropic + Places)
      console.log("[cache] DB MISS — sig:", sig, "| running pipeline");
      const result = await runPipeline(client, dish, city, area, locMode, radius, []);

      // Await upsert to get the search_cache_id; it's a cheap DB write, not Anthropic
      const searchCacheId = await upsertCache(sig, result, tags, dish);

      // Log with linked id (fire-and-forget after we already have the id)
      logUserSearch(dish, city, area, locMode, radius, searchCacheId).catch(() => {});
      return NextResponse.json(result);
    }

    // Load more (exclude list present) — skip cache entirely, no cache write
    const result = await runPipeline(client, dish, city, area, locMode, radius, exclude as string[]);
    logUserSearch(dish, city, area, locMode, radius, null).catch(() => {});
    return NextResponse.json(result);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── USER HISTORY ─────────────────────────────────────────────────────────────

async function logUserSearch(
  dish: string,
  city: string,
  area: string,
  locMode: string,
  radius: number,
  searchCacheId: string | null
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await makeSvc().from("user_searches").insert({
      user_id:          user.id,
      dish,
      city:             city    || "",
      area:             area    || null,
      loc_mode:         locMode || "city",
      radius:           radius  || null,
      search_cache_id:  searchCacheId || null,
    });
  } catch {}
}
