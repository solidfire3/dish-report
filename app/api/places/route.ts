import { NextResponse } from "next/server";

const KEY = process.env.GOOGLE_PLACES_API_KEY!;

export const dynamic = "force-dynamic";

type AcPrediction = {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

type TsResult = {
  place_id: string;
  name: string;
  formatted_address: string;
  vicinity?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "";

  if (mode === "autocomplete") {
    const input = (searchParams.get("input") ?? "").trim();
    const city  = (searchParams.get("city")  ?? "").trim();
    const token = searchParams.get("token")  ?? "";

    if (input.length < 3) return NextResponse.json({ predictions: [] });

    // Append city to bias results toward the user's current search city
    const biasedInput = city ? `${input} ${city}` : input;

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", biasedInput);
    url.searchParams.set("types", "establishment");
    url.searchParams.set("components", "country:us");
    if (token) url.searchParams.set("sessiontoken", token);
    url.searchParams.set("key", KEY);

    const res  = await fetch(url.toString());
    const json = await res.json() as { predictions?: AcPrediction[]; status: string };

    const predictions = (json.predictions ?? [])
      .filter((p): p is AcPrediction => !!p.structured_formatting?.main_text)
      .slice(0, 5);

    return NextResponse.json({ predictions, status: json.status });
  }

  if (mode === "textsearch") {
    const query = (searchParams.get("query") ?? "").trim();
    const city  = (searchParams.get("city")  ?? "").trim();

    if (!query) return NextResponse.json({ results: [] });

    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", city ? `${query} ${city}` : query);
    url.searchParams.set("type", "restaurant");
    url.searchParams.set("key", KEY);

    const res  = await fetch(url.toString());
    const json = await res.json() as { results?: TsResult[]; status: string };

    return NextResponse.json({ results: (json.results ?? []).slice(0, 6), status: json.status });
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}
