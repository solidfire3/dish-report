import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildTags, computeSignature, makeIdentityKey } from "@/lib/search-signature";
import { getTilesForLocation, getMetroForLocation, normalizeLocation } from "@/lib/metro-tiles";
import { extractJson } from "@/lib/extract-json";

const CACHE_TTL_MS       = 120 * 24 * 60 * 60 * 1000;
const RESTAURANT_TTL_MS  = 120 * 24 * 60 * 60 * 1000;
const STAMPEDE_GUARD_MS  = 2 * 60 * 1000;

// ─── COST LOGGING ──────────────────────────────────────────────────────────────

type TileUsage = { inputTokens: number; outputTokens: number; webSearches: number; costUSD: number };

function calcUsage(msg: Anthropic.Message): TileUsage {
  const inputTokens  = msg.usage.input_tokens;
  const outputTokens = msg.usage.output_tokens;
  const u = msg.usage as { input_tokens: number; output_tokens: number; server_tool_use?: { web_search_requests?: number } };
  const webSearches = u.server_tool_use?.web_search_requests
    ?? (msg.content as unknown as Array<Record<string, unknown>>).filter(b => b["name"] === "web_search").length;
  const costUSD = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15 + webSearches * 0.01;
  return { inputTokens, outputTokens, webSearches, costUSD };
}

function logCost(label: string, u: TileUsage): void {
  console.log(
    `[cost] ${label} — in:${u.inputTokens} out:${u.outputTokens}` +
    ` web_searches:${u.webSearches} est:$${u.costUSD.toFixed(4)}`
  );
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

const CLASSIFY_PROMPT = `You are a food search intent classifier. Determine the type of query and respond accordingly.

CASE 1 — Specific restaurant lookup (the query is a proper-noun RESTAURANT NAME, not a dish, cuisine, or food category):
Signs: A business name containing words like cafe, café, restaurant, grill, kitchen, bar, taqueria, pizzeria, bistro, tavern, eatery, cantina, diner, gastropub, steakhouse, trattoria, izakaya, ramen-ya — OR an ampersand pattern (e.g. "Name & Name") where both sides are proper nouns not food words — OR a proper-noun-style name with NO restaurant-type suffix (e.g. "Nobu", "Katsuya", "Bestia", "Otium", "In-N-Out") that does not read as a generic dish or cuisine category.
Examples: "Fig Tree Cafe", "Juniper & Ivy", "Nobu San Diego", "Nobu", "In-N-Out", "The French Laundry", "Katsuya", "Sushi Ota", "Pizzeria Mozza", "Nick's Kitchen & Market", "Kettner Exchange", "Bestia", "Republique".
NOT restaurant_search: "wagyu", "omakase", "ramen", "korean bbq", "best tacos", "dim sum near me" — these are dish/cuisine searches even if they sound specific.
BIAS RULE — When in doubt between "this could be a specific place" and "this could be a dish/category", prefer restaurant_search: true and let the confirm step validate. A wrong restaurant guess costs one confirmation tap; a missed restaurant guess silently dumps the user into a broken region search flow. Only hold back restaurant_search: true when the query is clearly a generic food term (ramen, pizza, tacos, etc.) or has an explicit search-intent prefix (best, top, good, find, where).
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
EXPERIENCE NOTE: Only if a non-food pattern directly degrades food quality AND is heavily documented. null otherwise.
VENUE TYPES: hole-in-the-wall | counter service | food truck | casual dine-in | upscale casual | fine dining

SCORING (food quality only — be genuinely critical):
DEFAULT: Average = 6.0, not 8.0. High scores are earned — being "fine" or "popular" is not enough for 8+. Use the full scale; resist rounding up. Mixed signal → score reflects that, no benefit of the doubt.

Score tiers — anchor every score here:
9.2-10.0: Michelin level. Internationally recognized or technically exceptional. Extremely rare.
8.7-9.1:  Local legend. True destination, repeatedly cited as among the city's very best. Rare.
8.1-8.6:  Always great. Consistently excellent; specific dishes that earn repeat visits.
7.5-8.0:  Solid spot. Reliable neighborhood restaurant; positive but no citywide reputation.
6.9-7.4:  Hit and miss. Inconsistent quality or one standout dish on an ordinary menu.
6.0-6.8:  Convenience. Acceptable; chosen for location or price, not quality.
5.0-5.9:  Compromise. Below expectations; noticeable quality issues.
2.5-4.9:  Disappointment. Significant problems documented across reviews.
0.1-2.4:  Disgust. Repeated serious food-quality failures.
Good local spot: 7.5-8.0. Mediocre: 6-something. Bad: below 6. 9.0+ for true standouts only.

QUERY RELEVANCE — strict destination gate:
INCLUDE only venues where the dish is a PRIMARY reason people go there. "Is this place specifically known FOR [dish]?"
EXCLUDE: secondary/side/equal-among-many offerings; a sushi restaurant that merely offers poke → excluded from a "poke" search unless widely known for poke specifically; fine-dining tasting menus in pizza/tacos searches; any general restaurant in a burger/ramen search unless it's a destination specifically.
Return fewer genuinely-relevant results rather than padding. Quality of relevance over quantity. Gate applies per tile.

GEOGRAPHIC CONTAINMENT — non-negotiable:
Only include venues physically in or within reasonable proximity of the searched area. A wrong-location result is worse than none. Verify each venue's address.

SOURCE GROUNDING:
Ground all claims in retrieved sources. Do NOT invent restaurants, addresses, dishes, or quotes. must_orders must appear in retrieved reviews as notable dishes. best_quote must be from an actual review; use "" if none. Omit anything unconfirmed.

CONFIDENCE:
"high" = strong, consistent signal from multiple independent sources.
"medium" = limited or inconsistent signal.
"low" = thin or conflicting information.
Include ALL high/medium results. Exclude low only if you already have 10 qualifying. Do NOT cap result count.

DISH BADGE: Only if genuinely celebrated for the searched dish — e.g. "local birria legend". Most results: null. Never invent.

${excl.length ? `EXCLUDE already shown: ${excl.join(", ")}.` : ""}
Return ONLY valid JSON: {"dish":"string","city":"string","results":[{"rank":number,"name":"string","neighborhood":"string","address":"string|null","venue_type":"string","what_it_is":"string","food_score":number,"dish_badge":"string|null","confidence":"high|medium|low","dish_mentions":number,"price_range":"$|$$|$$$|$$$$|null","website_domain":"string|null","hours":"string|null","specials":"string|null","experience_note":"string|null","must_orders":[{"item":"string","differentiator":"string","why":"string"}],"win_reason":"string","top_descriptors":["string"],"also_try":["string"],"best_quote":"string","warnings":["string"],"verdict":"string"}]}
${excl.length
  ? "Return up to 5 results not in the excluded list, strictly sorted food_score descending."
  : "Return up to 16 results — include every venue with meaningful evidence, strictly sorted food_score descending. If only 9 qualify, return 9."
}`;

// ─── SERVICE CLIENT ────────────────────────────────────────────────────────────

function makeSvc() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────

async function runPipeline(
  client: Anthropic, dish: string, city: string, area: string,
  locMode: string, radius: number, exclude: string[],
  locStrOverride?: string   // used by tile queries to specify the tile sub-area
): Promise<{ data: unknown; usage: TileUsage }> {
  const effectiveRadius = radius && radius > 0 && radius < 20 ? radius : null;
  const locStr = locStrOverride ?? (locMode === "area" && area
    ? `within ${radius} miles of ${area}`
    : effectiveRadius ? `within ${effectiveRadius} miles of ${city}` : `in ${city}`);
  const userMsg = `Best places for "${dish}" ${locStr}. Use targeted searches — query precisely for this dish in this exact area, not broadly. GEOGRAPHIC REQUIREMENT: Only include venues physically located ${locStr}.${exclude.length ? ` Exclude: ${exclude.join(", ")}.` : ""} Return JSON.`;
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 8000,
    system: makeSearchPrompt(exclude),
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    messages: [{ role: "user", content: userMsg }],
  });
  const usage = calcUsage(msg);
  logCost(`tile "${locStr}"`, usage);
  return { data: extractJson(msg.content), usage };
}

// ─── GEOGRAPHIC TILING ────────────────────────────────────────────────────────
// Gathers raw candidate restaurants: either via parallel tile queries (metro
// searches) or a single query (everything else). Returns the deduped raw
// results array plus the base fields (dish, city) for the response envelope.

type CandidateSet = {
  rawResults: Record<string, unknown>[];
  baseFields:  Record<string, unknown>;
};

async function gatherCandidates(
  client: Anthropic, dish: string, city: string, area: string,
  locMode: string, radius: number,
  tileQueriesOverride?: string[]  // explicit tiles from Refine step; overrides auto-detection
): Promise<CandidateSet> {
  // tileQueriesOverride → user's explicit region selection from the Refine step
  // Otherwise: auto-detect from metro config for broad city searches
  const isBroadCitySearch = !area && locMode !== "area";
  const tiles = tileQueriesOverride
    ?? (isBroadCitySearch ? getTilesForLocation(city) : null);

  if (tiles) {
    console.log(`[tiling] "${city}" → ${tiles.length} tiles in parallel: ${tiles.join(", ")}`);
    // Run all tile queries in parallel — wall time ≈ slowest single tile (~30-60s)
    const tileResponses = await Promise.all(
      tiles.map(tile => runPipeline(client, dish, city, area, locMode, radius, [], `in ${tile}`))
    );
    // Log search total across all tiles
    const totalUsage = tileResponses.reduce(
      (acc, r) => ({
        inputTokens:  acc.inputTokens  + r.usage.inputTokens,
        outputTokens: acc.outputTokens + r.usage.outputTokens,
        webSearches:  acc.webSearches  + r.usage.webSearches,
        costUSD:      acc.costUSD      + r.usage.costUSD,
      }),
      { inputTokens: 0, outputTokens: 0, webSearches: 0, costUSD: 0 }
    );
    logCost(`SEARCH TOTAL (${tiles.length} tiles)`, totalUsage);
    // Merge all tile candidates
    const allRaw = tileResponses.flatMap(
      r => ((r.data as Record<string, unknown>).results || []) as Record<string, unknown>[]
    );
    // Dedupe by identity_key: same venue from overlapping tiles → keep first occurrence.
    // First tile wins — tiles are ordered center-first, so central results get priority.
    const seen = new Map<string, Record<string, unknown>>();
    for (const r of allRaw) {
      const key = makeIdentityKey(r.name as string, r.address as string);
      if (key && key !== "|" && !seen.has(key)) seen.set(key, r);
    }
    const rawResults = Array.from(seen.values());
    console.log(`[tiling] ${allRaw.length} total candidates → ${rawResults.length} after dedupe`);
    return { rawResults, baseFields: { dish, city } };
  }

  // Single query — existing behavior
  const singleResult = await runPipeline(client, dish, city, area, locMode, radius, []);
  logCost("SEARCH TOTAL (1 tile)", singleResult.usage);
  return {
    rawResults: ((singleResult.data as Record<string, unknown>).results || []) as Record<string, unknown>[],
    baseFields: singleResult.data as Record<string, unknown>,
  };
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
    const {
      mode, dish, city, area, locMode, radius, exclude = [], forceRefresh = false,
      tileQueries,   // explicit tile queries from the Refine step (overrides auto-tiling)
      regionKey,     // sorted region IDs for unique cache key, e.g. "central,coastal"
    } = await req.json();

    // ── Normalize regionKey so equivalent region sets share one cache entry ───
    // Problem: auto-tiled searches (no regionKey) and Refine "all regions selected"
    // searches run identical tiles but produced different cache keys, causing expensive
    // re-runs that should be free cache hits.
    // Fix: when no regionKey is provided and no explicit tileQueries override exists,
    // derive the canonical "all regions" key from the metro config — the same string
    // the Refine step would produce when every region is checked.
    // Subset selections (e.g. "central,coastal" only) keep their explicit key and
    // never collide with the full-city key.
    const effectiveRegionKey: string | null = (() => {
      if (regionKey) return regionKey as string;   // explicit Refine selection — use as-is
      if (tileQueries) return null;                // explicit tiles without a key (non-metro path)
      // Auto-tile path: canonicalize to "all regions sorted" for metro cities
      const metro = getMetroForLocation(normalizeLocation((city as string) || ""));
      return metro ? metro.regions.map(r => r.id).sort().join(",") : null;
    })();

    // ── Piece 1: Quick cache check — DB lookup only, no pipeline ─────────────
    if (mode === "quick") {
      const tags = buildTags({ dish, city, area, locMode, radius, regionKey: effectiveRegionKey });
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

    // ── Classify — lightweight 3-way routing, uses Haiku (no web search needed) ──
    if (mode === "classify") {
      if (hasLocationIntent(dish || "")) return NextResponse.json(LOCATION_QUESTIONS);
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001", max_tokens: 200,
        system: CLASSIFY_PROMPT,
        messages: [{ role: "user", content: `Dish query: "${dish}"` }],
      });
      return NextResponse.json(extractJson(msg.content));
    }

    // ── Search ────────────────────────────────────────────────────────────────
    const isLoadMore = (exclude as string[]).length > 0;

    // Load more — skip cache entirely, no normalization write
    if (isLoadMore) {
      const { data } = await runPipeline(client, dish, city, area, locMode, radius, exclude as string[]);
      logUserSearch(dish, city, area, locMode, radius, null).catch(() => {});
      return NextResponse.json(data);
    }

    const tags = buildTags({ dish, city, area, locMode, radius, regionKey: effectiveRegionKey });
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
            // Background refresh also tiles so the refreshed cache is equally comprehensive
            triggerBackgroundRefresh(cached.id, async () => {
              const { rawResults, baseFields } = await gatherCandidates(client, dish, city, area, locMode, radius, tileQueries as string[] | undefined);
              return { ...baseFields, results: rawResults };
            }).catch(() => {});
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

    // Pipeline + normalization + cache write (cache miss OR forceRefresh).
    // gatherCandidates handles tiling for broad metro searches transparently.
    const { rawResults, baseFields } = await gatherCandidates(client, dish, city, area, locMode, radius, tileQueries as string[] | undefined);

    const db = makeSvc();
    const augmentedResults: Record<string, unknown>[] = await Promise.all(rawResults.map(async r => {
      const { restaurant_id, durable_score } = await processRestaurant(db, r);
      // food_score is the one displayed score — no fit adjustment applied.
      // dish_badge (from Anthropic) is a text label only; it never touches the score.
      return { ...r, food_score: durable_score, dish_badge: (r.dish_badge as string | null) ?? null, restaurant_id };
    }));

    // Enforce food_score DESC over the FULL merged set, then re-assign ranks.
    // This preserves the top-N invariant: top N shown = true top N of all candidates.
    augmentedResults.sort((a, b) => (Number(b.food_score) || 0) - (Number(a.food_score) || 0));
    augmentedResults.forEach((r, i) => { (r as Record<string, unknown>).rank = i + 1; });

    const augmentedResult = { ...baseFields, results: augmentedResults };
    const searchCacheId = await upsertCache(sig, augmentedResult, tags, dish);

    if (searchCacheId) {
      (async () => {
        for (const r of augmentedResults) {
          if (!r.restaurant_id) continue;
          try {
            await db.from("search_results").upsert({
              search_id: searchCacheId, restaurant_id: r.restaurant_id,
              rank: r.rank || null,
              fit_adjustment: 0,    // column kept for schema compat; disconnected from display
              fit_reason: null,
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
