import { NextRequest, NextResponse } from "next/server";
import { isMaintenanceMode, maintenanceResponse } from "@/lib/maintenance";

// ─── NAME-MATCH HELPERS ───────────────────────────────────────────────────────

/** Normalise a name for comparison: lowercase, transliterate accents, strip punctuation, collapse spaces */
function normaliseName(s: string): string {
  // NFD splits accented chars into base + combining mark (é → e + U+0301).
  // U+0300-U+036F is the Combining Diacritical Marks block — stripping it leaves base letters.
  // Result: Güero→guero, Café→cafe, El Niño→el nino — same token from either source.
  // Using RegExp constructor (not /regex/ literal) to avoid requiring the 'u' flag in older targets.
  const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");
  return s
    .normalize("NFD")
    .replace(COMBINING, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokenise a normalised name into a Set of word tokens (length ≥ 2) */
function tokens(s: string): Set<string> {
  return new Set(normaliseName(s).split(" ").filter(t => t.length >= 2));
}

/**
 * True if the Google place's displayName is a reasonable match for the queried
 * restaurant name.  Accepts if:
 *   - one normalised name contains the other as a substring, OR
 *   - Jaccard token overlap ≥ 0.35 (~1 in 3 meaningful tokens in common)
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
  return shared / union >= 0.35;
}

// ─── FOOD-LIKELIHOOD SCORING ──────────────────────────────────────────────────
// Places doesn't expose explicit "food" tags in its searchText response.
// Best available proxy: aspect ratio. Food close-ups and table shots are
// roughly square to moderate landscape (0.8–1.8). Extreme-wide panoramics
// (ratio > 2.0) are almost always exterior storefronts, not dishes.
// This isn't perfect — interior wide shots can look similar — but it reliably
// pushes obvious exterior panoramics below genuine food photos.
function foodLikelihood(w: number | undefined, h: number | undefined): number {
  if (!w || !h || w <= 0 || h <= 0) return 0.5; // unknown — neutral
  const r = w / h;
  if (r >= 0.8 && r <= 1.5) return 1.0;   // square / close-up — very likely food
  if (r > 1.5 && r <= 2.0) return 0.65;   // moderate landscape — food or interior
  if (r > 2.0 && r <= 3.0) return 0.3;    // wide — likely storefront panoramic
  if (r > 3.0)             return 0.15;   // very wide — exterior banner shot
  if (r < 0.8 && r >= 0.5) return 0.7;   // slight portrait — food close-up fine
  return 0.35;                             // very portrait — unlikely food
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (isMaintenanceMode()) return maintenanceResponse();
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
        // More candidates → better chance the right place is in the list.
        // isGoodMatch() is the quality gate; dropping includedType allows cafes,
        // diners, food trucks etc. that Google doesn't categorize as "restaurant".
        maxResultCount: 6,
      }),
    });

    const data = await res.json();
    const places: Array<{
      id?: string;
      displayName?: { text?: string };
      photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
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

    // Sort by food likelihood (desc) so food close-ups lead, exterior panoramics trail.
    // Stable sort preserves Places' own ranking as a tiebreaker.
    const photos: string[] = matched.photos
      .slice(0, 10)
      .map(p => ({ name: p.name, score: foodLikelihood(p.widthPx, p.heightPx) }))
      .sort((a, b) => b.score - a.score)
      .map(p => p.name);

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}
