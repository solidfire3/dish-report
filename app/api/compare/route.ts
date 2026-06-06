import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractJson } from "@/lib/extract-json";
import { maintenanceResponse } from "@/lib/maintenance";


const COMPARE_PROMPT = `You are a food comparison analyst. A user just looked at a specific restaurant and wants to know if there's something similar — or better — nearby. Search for comparable restaurants within the specified radius and compare them on food quality only.

FILTER: INCLUDE only food-quality signal. EXCLUDE service, décor, parking, generic praise.

For each nearby alternative:
- How does the FOOD compare to the original spot? Be honest — sometimes the original is better.
- What's the specific food reason to prefer one over the other?
- What's the must-order item at the alternative?
- Is it better for a specific reason (superior technique, fresher ingredients, different style that might suit different moods)?

SCORING: same scale — 9-10 unicorn, 7.5-8.9 excellent, 6-7.4 good. Be honest and calibrated. The original spot's score is provided — don't inflate alternatives.

Return ONLY valid JSON:
{
  "original": { "name": "string", "food_score": number, "cuisine": "string" },
  "search_area": "string (e.g. 'within 3 miles of Downtown San Diego')",
  "alternatives": [
    {
      "rank": number,
      "name": "string",
      "neighborhood": "string",
      "address": "string|null",
      "cuisine": "string",
      "venue_type": "string",
      "food_score": number,
      "price_range": "$|$$|$$$|$$$$|null",
      "website_domain": "string|null",
      "verdict_vs_original": "string (1-2 honest sentences: how the food compares — better in some ways? Different but equal? Clearly superior or inferior?)",
      "go_here_if": "string (one sentence: the scenario where you'd pick this over the original — mood, group size, price point, specific craving)",
      "must_order": "string (the one item to get here)",
      "must_order_why": "string (specific food reason)",
      "food_score_delta": "string (e.g. '+0.4', '-0.7', '≈ equal' vs original)"
    }
  ]
}
Include 4-6 alternatives ordered by food_score desc.`;

export async function POST(req: Request) {
  console.log("[maint] MAINTENANCE_MODE=", process.env.MAINTENANCE_MODE);
  if (process.env.MAINTENANCE_MODE === "true") return maintenanceResponse();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const { name, foodScore, cuisine, radius, location, mode } =
      await req.json();

    const cuisineCtx =
      mode === "similar"
        ? `Focus on similar cuisine (${cuisine || "same type"}). Compare them on food quality vs the original.`
        : `Include ALL cuisines and restaurant types — rank purely by food quality. Don't limit to similar cuisine.`;

    const userMsg = `Compare restaurants near "${name}" (food score: ${foodScore}, cuisine: ${cuisine || "various"}) ${location}. ${cuisineCtx} Find 4-6 alternatives. Return JSON.`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: COMPARE_PROMPT,
      // @ts-ignore
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [{ role: "user", content: userMsg }],
    });

    const inputTokens  = msg.usage.input_tokens;
    const outputTokens = msg.usage.output_tokens;
    const u = msg.usage as { input_tokens: number; output_tokens: number; server_tool_use?: { web_search_requests?: number } };
    const webSearches = u.server_tool_use?.web_search_requests
      ?? (msg.content as unknown as Array<Record<string, unknown>>).filter(b => b["name"] === "web_search").length;
    const costUSD = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15 + webSearches * 0.01;
    console.log(`[cost] compare "${name}" — in:${inputTokens} out:${outputTokens} web_searches:${webSearches} est:$${costUSD.toFixed(4)}`);

    return NextResponse.json(extractJson(msg.content));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Comparison failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
