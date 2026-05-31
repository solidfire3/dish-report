import { NextRequest, NextResponse } from "next/server";

// ─── NAME-MATCH HELPERS ───────────────────────────────────────────────────────

/** Normalise a name for comparison: lowercase, strip punctuation, collapse spaces */
function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Tokenise a normalised name into a Set of word tokens (length ≥ 2) */
function tokens(s: string): Set<string> {
  return new Set(normaliseName(s).split(" ").filter(t => t.length >= 2));
}

/**
 * True if the Google place's displayName is a reasonable match for the queried
 * restaurant name.  Accepts if:
 *   - one normalised name contains the other as a substring, OR
 *   - Jaccard token overlap ≥ 0.5 (i.e. at least half the tokens in common)
 * Returns false when there's no meaningful match, so the caller can skip that
 * candidate rather than accepting a wrong establishment's photos.
 */
function isGoodMatch(queryName: string, placeName: string): boolean {
  const q = normaliseName(queryName);
  const p = normaliseName(placeName);
  if (!q || !p) return false;

  // Substring containment (handles "The Grill" matching "The Grill on Fifth")
  if (q.includes(p) || p.includes(q)) return true;

  // Jaccard overlap on word tokens
  const qt = tokens(queryName);
  const pt = tokens(placeName);
  if (qt.size === 0 || pt.size === 0) return false;
  let shared = 0;
  qt.forEach(t => { if (pt.has(t)) shared++; });
  const union = qt.size + pt.size - shared;
  return shared / union >= 0.5;
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────

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
        // Request displayName so we can verify the match
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
      },
      body: JSON.stringify({
        textQuery: `${name} ${city}`.trim(),
        // Ask for a few candidates so we can find the best name match
        maxResultCount: 4,
        // Restrict to food/restaurant types to avoid matching unrelated places
        includedType: "restaurant",
      }),
    });

    const data = await res.json();
    const places: Array<{
      id?: string;
      displayName?: { text?: string };
      photos?: Array<{ name: string }>;
    }> = data.places ?? [];

    if (!places.length) return NextResponse.json({ photos: [] });

    // Find the first candidate whose displayName reasonably matches the query.
    // If none match, return empty so the card shows the amber initial placeholder
    // rather than confidently showing the wrong establishment's photos.
    const matched = places.find(p => {
      const placeName = p.displayName?.text ?? "";
      return isGoodMatch(name, placeName);
    });

    if (!matched?.photos?.length) return NextResponse.json({ photos: [] });

    const photos: string[] = matched.photos.slice(0, 10).map(p => p.name);
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}
