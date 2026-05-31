import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const city = searchParams.get("city") || "";

  if (!name) return NextResponse.json({ photos: [] });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ photos: [] });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.photos",
      },
      body: JSON.stringify({ textQuery: `${name} ${city}`.trim(), maxResultCount: 1 }),
    });

    const data = await res.json();
    const place = data.places?.[0];
    if (!place?.photos?.length) return NextResponse.json({ photos: [] });

    const photos: string[] = place.photos.slice(0, 10).map((p: { name: string }) => p.name);
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}
