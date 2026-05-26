import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const CONFIRM_PROMPT = `You are a location finder. Find top 1-3 matching businesses OR public markets/food courts for the user's query.
Also detect if the location is a food market, food court, public market, or multi-vendor food destination.
Return ONLY valid JSON: { "is_market": boolean, "matches": [{ "name":"string","address":"string","city":"string","neighborhood":"string|null","cuisine":"string","price_range":"$|$$|$$$|$$$$|null" }] }`;

const DEEP_PROMPT = `You are a food cheat sheet generator. The user is going to this restaurant. Give them exactly what they need to order the best possible meal. Be punchy, specific, and direct — like a well-connected local friend texting you what to get.

Focus entirely on: what to order, what makes each dish special, what to skip, insider tricks. Do NOT compare to other restaurants. Do NOT talk about service or decor.

VIBE TAGS: 2-4 punchy shorthand descriptors. Examples: "hole-in-the-wall gem", "neighborhood institution", "cult following", "hidden gem", "locals only", "cash only gem", "late night staple", "date night worthy", "chef-driven", "off the beaten path", "BYOB friendly", "no reservations needed", "tourist trap to avoid", "Michelin recognized", "James Beard winner", "market price seafood".

MUST ORDERS: 2-4 specific items. Be specific with menu names. One punchy sentence on WHY each is the move.

ALSO TRY: 2-3 secondary items, one food-specific sentence each.

SKIP: 1-3 items reviewers consistently find disappointing (food quality only). Only include if clearly documented.

INSIDER TIPS: 2-4 specific tips (best time for fresh prep, what to request, secret menu items, seasonal specials, best seat in house for food experience, etc.)

SCORING: 9-10 unicorn, 7.5-8.9 excellent, 6-7.4 good, 4.5-5.9 mixed, <4.5 bad.

Return ONLY valid JSON:
{"name":"string","neighborhood":"string","address":"string|null","cuisine":"string","venue_type":"string","vibe_tags":["string"],"food_score":number,"confidence":"high|medium|low","price_range":"$|$$|$$$|$$$$|null","website_domain":"string|null","hours":"string|null","specials":"string|null","experience_note":"string|null","must_orders":[{"item":"string","why":"string"}],"also_try":[{"dish":"string","note":"string"}],"skip":["string"],"insider_tips":["string"],"verdict":"string (2 punchy sentences)"}`;

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
  try {
    const { mode, name, city } = await req.json();

    if (mode === "confirm") {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        system: CONFIRM_PROMPT,
        // @ts-ignore
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: `Find: "${name}" in ${city}.` }],
      });
      return NextResponse.json(extractJson(msg.content));
    }

    // mode === "deepdive"
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: DEEP_PROMPT,
      // @ts-ignore
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `"${name}" in ${city}. Food cheat sheet. Return JSON.`,
        },
      ],
    });

    return NextResponse.json(extractJson(msg.content));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Deep dive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
