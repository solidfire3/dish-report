import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractJson } from "@/lib/extract-json";
import { maintenanceResponse } from "@/lib/maintenance";


// No scores are generated for vendors — per-vendor review data is too thin for reliable grading.
// This endpoint returns a factual vendor directory: who's inside and what they serve.
const MARKET_PROMPT = `You are a food hall directory generator. The user wants to know who is inside this food hall, food court, or market and what each vendor serves. Your job: find every vendor at this location and describe their specialty and standout item.

DO NOT score or rank vendors. DO NOT output any numeric ratings. This is a factual "who's inside and what they serve" list, not a quality ranking.

For each vendor:
- Name and cuisine/concept (3-5 words)
- The one item people come to this stall for specifically
- A short specific reason why that item is notable (preparation, freshness, uniqueness) — based only on retrieved sources
- Any practical note if worth mentioning (cash only, closes early, etc.)

Hall description: 2 punchy sentences about what makes this food hall worth visiting.

Return ONLY valid JSON:
{
  "market_name": "string",
  "location": "string (neighborhood, city)",
  "vibe": "string (2 punchy sentences — what kind of food destination is this)",
  "hours": "string|null",
  "vendors": [
    {
      "name": "string",
      "specialty": "string (cuisine/concept in 3-5 words, e.g. 'Oaxacan street tacos', 'wood-fired pizza')",
      "the_order": "string (specific item name — what people seek out here)",
      "why": "string (1-2 sentences: what makes this item worth getting — be specific)",
      "price_range": "$|$$|$$$|null",
      "insider_note": "string|null"
    }
  ]
}
Include ALL vendors you can find. Do NOT include food_score or any numeric rating.`;

export async function POST(req: Request) {
  console.log("[maint] MAINTENANCE_MODE=", process.env.MAINTENANCE_MODE);
  if (process.env.MAINTENANCE_MODE === "true") return maintenanceResponse();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { name, city } = await req.json();

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 10000,
      system: MARKET_PROMPT,
      // @ts-ignore
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Market/food court: "${name}" in ${city}. Find all vendors and best item at each. Return JSON.`,
        },
      ],
    });

    const inputTokens  = msg.usage.input_tokens;
    const outputTokens = msg.usage.output_tokens;
    const u = msg.usage as { input_tokens: number; output_tokens: number; server_tool_use?: { web_search_requests?: number } };
    const webSearches = u.server_tool_use?.web_search_requests
      ?? (msg.content as unknown as Array<Record<string, unknown>>).filter(b => b["name"] === "web_search").length;
    const costUSD = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15 + webSearches * 0.01;
    console.log(`[cost] market "${name}" — in:${inputTokens} out:${outputTokens} web_searches:${webSearches} est:$${costUSD.toFixed(4)}`);

    return NextResponse.json(extractJson(msg.content));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Market guide failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
