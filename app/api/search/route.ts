import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";


const CLASSIFY_PROMPT = `You are a food search narrowing assistant. When a dish query is broad, provide up to 3 sequential narrowing questions with 5-12 options each to help get specific.

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

Return ONLY valid JSON:
Broad: { "broad": true, "questions": [{ "question": "short punchy question 6-9 words", "options": ["opt1","opt2",...5-12] }] }
  Include 1-3 question objects — 2 is ideal for most cases.
Specific: { "broad": false }`;

const makeSearchPrompt = (excl: string[] = []) =>
  `Brutally honest food intelligence. Extract ONLY food-quality signal from reviews.
INCLUDE: flavor, texture, freshness, preparation, specific dishes, technique, consistency.
EXCLUDE: service, décor, parking, generic praise without specifics.
EXPERIENCE NOTE: ONLY if a non-food pattern (AYCE slowness drying food, etc.) is heavily documented AND directly degrades food quality. null otherwise.
VENUE TYPES: hole-in-the-wall | counter service | food truck | casual dine-in | upscale casual | fine dining
SCORING: 9-10 unicorn, 7.5-8.9 excellent, 6-7.4 good, 4.5-5.9 mixed, <4.5 bad. Most 5.5–7.5. NO 8+ without overwhelming evidence.
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

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { mode, dish, city, area, locMode, radius, exclude = [] } =
      await req.json();

    if (mode === "classify") {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        system: CLASSIFY_PROMPT,
        messages: [{ role: "user", content: `Dish query: "${dish}"` }],
      });
      return NextResponse.json(extractJson(msg.content));
    }

    // mode === "search"
    const locStr =
      locMode === "area" && area
        ? `within ${radius} miles of ${area}`
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

    return NextResponse.json(extractJson(msg.content));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
