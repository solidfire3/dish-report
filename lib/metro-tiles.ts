/**
 * Geographic tiling config for broad metro searches.
 *
 * When a city-level search resolves to a configured metro name, the pipeline
 * issues one Anthropic query per tile IN PARALLEL, merges all candidates,
 * dedupes by identity_key, then scores the combined set — giving far more
 * comprehensive neighborhood coverage than a single broad-city query.
 *
 * Structure: lowercase metro name → array of tile sub-area strings.
 * Each tile becomes the location in its query: "Best poke in Central San Diego."
 *
 * Metros NOT listed here use the existing single-query behavior — no change.
 * To add a metro: add an entry below.
 */
export const METRO_TILES: Record<string, string[]> = {
  "san diego": [
    "Central San Diego",
    "North County San Diego",
    "East County San Diego",
  ],

  // Add metros as coverage demand grows:
  // "los angeles": [
  //   "Downtown and Central LA",
  //   "Westside and Beach Cities",
  //   "San Fernando Valley",
  //   "South Bay LA",
  //   "East LA and San Gabriel Valley",
  // ],
  // "new york city": [
  //   "Manhattan",
  //   "Brooklyn",
  //   "Queens",
  //   "Bronx and Upper Manhattan",
  // ],
  // "san francisco": [
  //   "San Francisco City",
  //   "East Bay",
  //   "Peninsula and South Bay",
  // ],
};

// ─── NORMALIZATION ────────────────────────────────────────────────────────────
// Strips trailing state/country qualifiers so "San Diego, CA" and
// "San Diego California" both normalize to "san diego" for metro matching.
// NOTE: exact-match-after-normalization is intentional — "North Park San Diego"
// normalizes to "north park san diego" which does NOT equal "san diego", so
// neighborhood descriptors with the metro name appended still single-query.

/** US state 2-letter abbreviations (lowercase). */
const STATE_ABBREVS = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy',
]);

/** Full US state name pattern (lowercase, handles multi-word states). */
const STATE_NAME_RE = new RegExp(
  ',?\\s*(' + [
    'north carolina','north dakota','south carolina','south dakota','west virginia',
    'new hampshire','new jersey','new mexico','new york','rhode island',
    'washington','california','minnesota','mississippi','massachusetts',
    'pennsylvania','connecticut','tennessee','louisiana','oklahoma','kentucky',
    'michigan','maryland','missouri','nebraska','virginia','colorado','arkansas',
    'illinois','wisconsin','georgia','indiana','arizona','alabama','florida',
    'montana','wyoming','kansas','oregon','nevada','alaska','hawaii','idaho',
    'maine','vermont','delaware','ohio','iowa','texas','utah',
  ].join('|') + ')\\s*$'
);

const COUNTRY_RE  = /,?\s*(usa|us|united states|united states of america)\s*$/;
const ZIP_RE      = /,?\s*\d{5}(-\d{4})?\s*$/;
const TRAILING_COMMA = /,\s*$/;

/**
 * Normalize a location string for metro matching:
 * lowercase → collapse whitespace → strip zip → strip country →
 * strip full state name → strip 2-letter state abbrev → strip trailing comma.
 *
 * "San Diego, CA"        → "san diego"
 * "San Diego California" → "san diego"
 * "North Park San Diego" → "north park san diego"  (not stripped — keeps neighborhood prefix)
 * "SD"                   → "sd"  (ambiguous; not stripped since it IS the only token)
 */
export function normalizeLocation(s: string): string {
  let n = s.toLowerCase().trim().replace(/\s+/g, ' ');

  // Strip zip codes first (may appear after state: "San Diego, CA 92101")
  n = n.replace(ZIP_RE, '').trim();

  // Strip country
  n = n.replace(COUNTRY_RE, '').trim();

  // Strip full state names
  n = n.replace(STATE_NAME_RE, '').trim();

  // Strip 2-letter state abbreviation — ONLY when city content precedes it
  // ("san diego, ca" → "san diego"; "sd" alone → unchanged since cityPart would be "")
  const m = n.match(/^(.+?)(?:,\s*|\s+)([a-z]{2})\s*$/);
  if (m && STATE_ABBREVS.has(m[2]) && m[1].trim().length > 0) {
    n = m[1].trim();
  }

  // Strip trailing comma artifact
  return n.replace(TRAILING_COMMA, '').trim();
}

// ─── DETECTION ────────────────────────────────────────────────────────────────

/**
 * Returns tile sub-areas if `location` resolves to a broad configured metro.
 * Returns null if location is already sub-area level (tile name, neighborhood,
 * or unknown).
 *
 * Matching strategy (after normalization of both sides):
 * 1. If normalized location matches a tile sub-area name  → null (already specific)
 * 2. If normalized location exactly equals a metro key   → return tiles
 * 3. Otherwise                                           → null (single query)
 *
 * Exact-match-after-normalization is deliberate:
 * "North Park San Diego" normalizes to "north park san diego" ≠ "san diego"
 * so neighborhood+metro strings don't accidentally trigger metro tiling.
 * Only bare metro names (± state/country) tile.
 */
export function getTilesForLocation(location: string): string[] | null {
  const normalized = normalizeLocation(location);

  // Rule 1: Already a tile sub-area? → single query (already specific)
  for (const tiles of Object.values(METRO_TILES)) {
    if (tiles.some(tile => normalizeLocation(tile) === normalized)) return null;
  }

  // Rule 2: Exact metro match after normalization → tile
  return METRO_TILES[normalized] ?? null;
}
