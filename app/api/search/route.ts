import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildTags, computeSignature, makeIdentityKey } from "@/lib/search-signature";

const CACHE_TTL_MS       = 120 * 24 * 60 * 60 * 1000;
const RESTAURANT_TTL_MS  = 120 * 24 * 60 * 60 * 1000;
const STAMPEDE_GUARD_MS  = 2 * 60 * 1000;

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

const CLASSIFY_PROMPT = `You are a food search intent classifier. Determine the type of query and respond accordingly.

CASE 1 — Specific restaurant lookup (the query is clearly a proper-noun RESTAURANT NAME, not a dish, cuisine, or food category):
Signs: A business name containing words like cafe, café, restaurant, grill, kitchen, bar, taqueria, pizzeria, bistro, tavern, eatery, cantina, diner, gastropub, steakhouse, trattoria, izakaya, ramen-ya — OR an ampersand pattern (e.g. "Name & Name") where both sides are proper nouns not dish/food words.
Examples: "Fig Tree Cafe", "Juniper & Ivy", "Nobu San Diego", "In-N-Out", "The French Laundry", "Katsuya", "Sushi Ota", "Pizzeria Mozza", "Nick's Kitchen & Market", "Kettner Exchange".
NOT restaurant_search: "wagyu", "omakase", "ramen", "korean bbq", "best tacos", "dim sum near me" — these are dish/cuisine searches even if they sound specific.
If uncertain (could be either), lean toward NOT restaurant_search and let the dish search handle it.
Return: { "restaurant_search": true, "name": "<extracted restaurant name>", "broad": false }

CASE 2 — Broad dish/cuisine (no location intent):
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

CASE 3 — Location-based search (contains "near me", "nearby", "close to", "in [neighborhood]", or is a cuisine/restaurant type without explicit distance):
Ask these questions in order to refine the search:

Q1 (always ask): "How far are you willing to go?"
Options: Within 1 mile / Within 2 miles / Within 5 miles / Within 10 miles / Any distance

Q2 (always ask): "Dining in or taking out?"
Options: Dine-in / Takeout / Delivery / Either

Q3 (ask only if no price signal in query): "What's your budget per person?"
Options: Under $15 / $15–30 / $30–60 / $60+

Return ONLY valid JSON:
Restaurant: { "restaurant_search": true, "name": "<name>", "broad": false }
Broad: { "broad": true, "questions": [{ "question": "short punchy question 6-9 words", "options": ["opt1","opt2",...5-12] }] }
Specific: { "broad": false }`;

function hasLocationIntent(query: string): boolean {
  const terms = [
    'near me', 'nearby', 'close to', 'around me',
    'in my area', 'open now', 'open late', 'tonight',
    'right now', 'this weekend', 'for dinner',
    'for lunch', 'for breakfast', 'happy hour',
  ];
  return terms.some(t => query.toLowerCase().includes(t));
}

const LOCATION_QUESTIONS = {
  broad: true,
  questions: [
    { question: "How far are you willing to go?", options: ["Within 1 mile", "Within 2 miles", "Within 5 miles", "Within 10 miles", "Any distance"] },
    { question: "Dining in or taking out?",        options: ["Dine-in", "Takeout", "Delivery", "Either"] },
    { question: "Budget per person?",              options: ["Under $15", "$15–30", "$30–60", "$60+"] },
  ],
};

const makeSearchPrompt = (excl: string[] = []) =>
  `Brutally honest food intelligence. Extract ONLY food-quality signal from reviews.
INCLUDE: flavor, texture, freshness, preparation, specific dishes, technique, consistency.
EXCLUDE: service, décor, parking, generic praise without specifics.
EXPERIENCE NOTE: ONLY if a non-food pattern (AYCE slowness drying food, etc.) is heavily documented AND directly degrades food quality. null otherwise.
VENUE TYPES: hole-in-the-wall | counter service | food truck | casual dine-in | upscale casual | fine dining
SCORING (food quality only, based on review signal):
9.0-10: Exceptional. A destination dish/spot. Consistently praised as among the best of its category in the city.
8.0-8.9: Excellent. Strong, consistent praise for specific dishes. A place locals genuinely recommend for the food. COMMON for well-reviewed spots.
7.0-7.9: Good and solid. Reliable food, some standout items, generally positive but not remarkable.
6.0-6.9: Mixed. Inconsistent food quality or underwhelming relative to reputation.
Below 6: Notable food-quality problems in reviews.
Calibration: A well-loved spot famous for a specific dish SHOULD score 8.0-8.9. Reserve 9+ for places repeatedly cited as best-in-city.
FIT ADJUSTMENT (per-search dish-fit nudge — apply CONSERVATIVELY):
- fit_adjustment: float -1.5..1.5. How well does THIS restaurant fit THIS specific query vs its general standing?
  IMPORTANT: If the query appears to be a specific restaurant name rather than a dish or category (e.g. "Fig Tree Cafe", "Juniper & Ivy"), set fit_adjustment = 0 for ALL results. A restaurant-name search has no dish-fit signal.
  Default is 0. The base food_score is the anchor; fit_adjustment is a minor nudge only.
  0 to ±0.3 = normal (most results — the dish fits their caliber as expected)
  ±0.4 to ±0.8 = notable fit difference (dish is a clear strength or clear weakness)
  ±0.9 to ±1.5 = exceptional/poor — ONLY for restaurants literally famous for or notably bad at this exact dish
  Do NOT inflate fit_adjustment to make the effective score look better. Most results: 0 or ±0.1–0.3.
- fit_reason: 4-8 words (e.g. "signature carnitas, their absolute best" or "tacos are a sideline here")
${excl.length ? `EXCLUDE already shown: ${excl.join(", ")}.` : ""}
Return ONLY valid JSON: {"dish":"string","city":"string","results":[{"rank":number,"name":"string","neighborhood":"string","address":"string|null","venue_type":"string","what_it_is":"string","food_score":number,"fit_adjustment":number,"fit_reason":"string","confidence":"high|medium|low","dish_mentions":number,"price_range":"$|$$|$$$|$$$$|null","website_domain":"string|null","hours":"string|null","specials":"string|null","experience_note":"string|null","must_orders":[{"item":"string","differentiator":"string","why":"string"}],"win_reason":"string","top_descriptors":["string"],"also_try":["string"],"best_quote":"string","warnings":["string"],"verdict":"string"}]}
Exactly 5 results, by food_score desc.`;

function extractJson(content: Anthropic.Messages.ContentBlock[]): unknown {
  const text = content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse response");
  return JSON.parse(match[0]);
}

// ─── SERVICE CLIENT ────────────────────────────────────────────────────────────

function makeSvc() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────

async function runPipeline(
  client: Anthropic, dish: string, city: string, area: string,
  locMode: string, radius: number, exclude: string[]
): Promise<unknown> {
  const effectiveRadius = radius && radius > 0 && radius < 20 ? radius : null;
  const locStr = locMode === "area" && area
    ? `within ${radius} miles of ${area}`
    : effectiveRadius ? `within ${effectiveRadius} miles of ${city}` : `in ${city}`;
  const userMsg = `Best places for "${dish}" ${locStr}.${exclude.length ? ` Exclude: ${exclude.join(", ")}.` : ""} Return JSON.`;
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 8000,
    system: makeSearchPrompt(exclude),
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMsg }],
  });
  return extractJson(msg.content);
}

// ─── RESTAURANT NORMALIZATION ──────────────────────────────────────────────────

type RestaurantRow = { id: string; food_score: number | null; refreshed_at: string };

async function processRestaurant(
  db: ReturnType<typeof makeSvc>,
  r: Record<string, unknown>
): Promise<{ restaurant_id: string | null; durable_score: number }> {
  const rawScore = Number(r.food_score) || 5;
  const ikey = makeIdentityKey(r.name as string, r.address as string);
  if (!ikey || ikey === "|" || !String(r.name ?? "").trim()) {
    return { restaurant_id: null, durable_score: rawScore };
  }

  const fields = {
    name:            String(r.name ?? ""),
    address:         (r.address as string)         || null,
    neighborhood:    (r.neighborhood as string)    || null,
    price_range:     (r.price_range as string)     || null,
    verdict:         (r.verdict as string)         || null,
    what_it_is:      (r.what_it_is as string)      || null,
    win_reason:      (r.win_reason as string)      || null,
    venue_type:      (r.venue_type as string)      || null,
    website_domain:  (r.website_domain as string)  || null,
    must_orders:     r.must_orders                 || null,
    warnings:        r.warnings                    || null,
    top_descriptors: r.top_descriptors             || null,
  };

  try {
    const { data: existing } = await db
      .from("restaurants")
      .select("id, food_score, refreshed_at")
      .eq("identity_key", ikey)
      .maybeSingle();

    const row = existing as RestaurantRow | null;

    if (!row) {
      // New restaurant — insert with Anthropic's score as initial base score
      const { data: ins } = await db
        .from("restaurants")
        .insert({ identity_key: ikey, food_score: rawScore, ...fields })
        .select("id, food_score")
        .single();
      return { restaurant_id: ins?.id ?? null, durable_score: ins?.food_score ?? rawScore };
    }

    const ageMs = Date.now() - new Date(row.refreshed_at).getTime();
    if (ageMs > RESTAURANT_TTL_MS) {
      // Stale — refresh durable fields + score
      const { data: upd } = await db
        .from("restaurants")
        .update({ food_score: rawScore, refreshed_at: new Date().toISOString(), ...fields })
        .eq("id", row.id)
        .select("id, food_score")
        .single();
      return { restaurant_id: upd?.id ?? row.id, durable_score: upd?.food_score ?? rawScore };
    }

    // Fresh — reuse durable score, don't overwrite
    return { restaurant_id: row.id, durable_score: row.food_score ?? rawScore };

  } catch {
    return { restaurant_id: null, durable_score: rawScore };
  }
}

// ─── CACHE LAYER ──────────────────────────────────────────────────────────────

type CacheRow = { id: string; results: unknown; expires_at: string; refreshing_at: string | null };

async function lookupCache(sig: string): Promise<CacheRow | null> {
  const { data, error } = await makeSvc()
    .from("searches")
    .select("id, results, expires_at, refreshing_at")
    .eq("dish_key", sig)
    .maybeSingle();
  console.log("[cache] DB LOOKUP — sig:", sig, "| row found:", !!data, "| has results:", !!(data as CacheRow | null)?.results, "| error:", error ? JSON.stringify(error) : null);
  return data as CacheRow | null;
}

async function upsertCache(sig: string, result: unknown, tags: ReturnType<typeof buildTags>, rawQuery: string): Promise<string | null> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const { data, error } = await makeSvc().rpc("upsert_search", {
    p_dish_key: sig, p_results: result, p_expires_at: expiresAt,
    p_location: tags.location || null, p_cuisine: tags.cuisine || null,
    p_dish: tags.dish || null, p_flavor: tags.flavor || null,
    p_vibe: tags.vibe || null, p_health: tags.health || null,
    p_price: tags.price || null, p_occasion: tags.occasion || null,
    p_raw_query: rawQuery,
  });
  console.log("[cache] DB WRITE — sig:", sig, "| returned_id:", data, "| error:", error ? JSON.stringify(error) : null);
  if (error) return null;
  return data as string;
}

async function triggerBackgroundRefresh(cachedId: string, pipelineFn: () => Promise<unknown>): Promise<void> {
  try {
    const db = makeSvc();
    await db.from("searches").update({ refreshing_at: new Date().toISOString() }).eq("id", cachedId);
    const freshResult = await pipelineFn();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    await db.from("searches").update({ results: freshResult, expires_at: expiresAt, refreshing_at: null }).eq("id", cachedId);
  } catch (e) { console.error("[cache] background refresh failed:", e); }
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { mode, dish, city, area, locMode, radius, exclude = [], forceRefresh = false } = await req.json();

    // ── Piece 1: Quick cache check — DB lookup only, no pipeline ─────────────
    // Used by the client before showing the loading screen.
    if (mode === "quick") {
      const tags = buildTags({ dish, city, area, locMode, radius });
      const sig  = computeSignature(tags);
      const cached = await lookupCache(sig);
      if (cached?.results && new Date(cached.expires_at).getTime() > Date.now()) {
        console.log("[search] exact-match HIT -> serving stored");
        logUserSearch(dish, city, area, locMode, radius, cached.id).catch(() => {});
        return NextResponse.json({ hit: true, results: cached.results, search_id: cached.id });
      }
      console.log("[search] no match -> running pipeline");
      return NextResponse.json({ hit: false });
    }

    // ── Classify ──────────────────────────────────────────────────────────────
    if (mode === "classify") {
      if (hasLocationIntent(dish || "")) return NextResponse.json(LOCATION_QUESTIONS);
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 700,
        system: CLASSIFY_PROMPT,
        messages: [{ role: "user", content: `Dish query: "${dish}"` }],
      });
      return NextResponse.json(extractJson(msg.content));
    }

    // ── Search ────────────────────────────────────────────────────────────────
    const isLoadMore = (exclude as string[]).length > 0;

    // Load more — skip cache entirely, no normalization write
    if (isLoadMore) {
      const result = await runPipeline(client, dish, city, area, locMode, radius, exclude as string[]);
      logUserSearch(dish, city, area, locMode, radius, null).catch(() => {});
      return NextResponse.json(result);
    }

    const tags = buildTags({ dish, city, area, locMode, radius });
    const sig  = computeSignature(tags);

    // Check DB cache (unless forceRefresh explicitly bypasses it)
    if (!forceRefresh) {
      console.log("[cache] DB LOOKUP starting — dish:", JSON.stringify(dish), "sig:", sig);
      const cached = await lookupCache(sig);

      if (cached?.results) {
        const isFresh = new Date(cached.expires_at).getTime() > Date.now();
        if (!isFresh) {
          const isRefreshing = !!cached.refreshing_at &&
            (Date.now() - new Date(cached.refreshing_at).getTime() < STAMPEDE_GUARD_MS);
          if (!isRefreshing) {
            console.log("[cache] DB HIT stale — sig:", sig, "| backgrounding refresh");
            triggerBackgroundRefresh(cached.id, () => runPipeline(client, dish, city, area, locMode, radius, [])).catch(() => {});
          }
        } else {
          console.log("[cache] DB HIT fresh — sig:", sig, "| ZERO Anthropic/Places calls");
        }
        logUserSearch(dish, city, area, locMode, radius, cached.id).catch(() => {});
        return NextResponse.json(cached.results);
      }
      console.log("[cache] DB MISS — sig:", sig, "| running pipeline");
    } else {
      console.log("[cache] forceRefresh — sig:", sig, "| skipping cache, running pipeline");
    }

    // Pipeline + normalization + cache write (cache miss OR forceRefresh)
    const rawResult = await runPipeline(client, dish, city, area, locMode, radius, []);
    const rawResults = ((rawResult as Record<string, unknown>).results || []) as Record<string, unknown>[];

    const db = makeSvc();
    const augmentedResults: Record<string, unknown>[] = await Promise.all(rawResults.map(async r => {
      const { restaurant_id, durable_score } = await processRestaurant(db, r);
      const fitAdj = Math.max(-1.5, Math.min(1.5, Number(r.fit_adjustment) || 0));
      const effectiveScore = Math.round(Math.max(0, Math.min(10, durable_score + fitAdj)) * 10) / 10;
      return { ...r, food_score: durable_score, fit_adjustment: fitAdj, _effective_score: effectiveScore, restaurant_id };
    }));

    const augmentedResult = { ...(rawResult as Record<string, unknown>), results: augmentedResults };
    const searchCacheId = await upsertCache(sig, augmentedResult, tags, dish);

    if (searchCacheId) {
      (async () => {
        for (const r of augmentedResults) {
          if (!r.restaurant_id) continue;
          try {
            await db.from("search_results").upsert({
              search_id: searchCacheId, restaurant_id: r.restaurant_id,
              rank: r.rank || null,
              fit_adjustment: r.fit_adjustment || 0,
              fit_reason: (r.fit_reason as string) || null,
            }, { onConflict: "search_id,restaurant_id" });
          } catch {}
        }
      })().catch(() => {});
    }

    logUserSearch(dish, city, area, locMode, radius, searchCacheId).catch(() => {});
    return NextResponse.json(augmentedResult);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── USER HISTORY ─────────────────────────────────────────────────────────────

async function logUserSearch(
  dish: string, city: string, area: string, locMode: string,
  radius: number, searchCacheId: string | null
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await makeSvc().from("user_searches").insert({
      user_id: user.id, dish, city: city || "", area: area || null,
      loc_mode: locMode || "city", radius: radius || null,
      search_cache_id: searchCacheId || null,
    });
  } catch {}
}
