import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractJson } from "@/lib/extract-json";


const MARKET_PROMPT = `You are a food market guide generator. The user is visiting a food court, public market, or multi-vendor food destination. Your job: find every vendor at this location and identify THE one thing worth ordering at each — using only food-quality signal from reviews, blogs, and social media.

FILTER: INCLUDE food quality, specific items, preparation, freshness, texture, flavor. EXCLUDE service, decor, parking, generic praise.

SCORING per vendor (0-10): same scale — be realistic. 9+ requires overwhelming evidence.

For each vendor:
- Find their standout menu item — the one thing people specifically seek them out for
- WHY it's the move: specific food reason (texture, preparation, freshness, uniqueness)
- Any food-specific warning if relevant

Market description: 2 punchy sentences about what makes this market worth visiting food-wise.

Return ONLY valid JSON:
{
  "market_name": "string",
  "location": "string (neighborhood, city)",
  "vibe": "string (2 punchy sentences — food-focused, what's the overall food scene here)",
  "hours": "string|null",
  "vendors": [
    {
      "name": "string",
      "specialty": "string (cuisine/concept in 3-5 words, e.g. 'Oaxacan street tacos', 'wood-fired Neapolitan pizza')",
      "the_order": "string (specific item name — the one thing to get)",
      "why": "string (1-2 sentences: specific food reason this is THE move at this stall)",
      "price_range": "$|$$|$$$|null",
      "food_score": number (0-10, one decimal),
      "insider_note": "string|null (optional: best time, freshness tip, what to ask for — null if nothing notable)"
    }
  ]
}
Order vendors by food_score descending. Include ALL vendors you can find — don't limit the count.`;

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { name, city } = await req.json();

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 10000,
      system: MARKET_PROMPT,
      // @ts-ignore
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Market/food court: "${name}" in ${city}. Find all vendors and best item at each. Return JSON.`,
        },
      ],
    });

    return NextResponse.json(extractJson(msg.content));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Market guide failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
