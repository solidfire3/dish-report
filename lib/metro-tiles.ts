/**
 * Geographic tiling config for broad metro searches.
 *
 * When a city-level search exactly matches a configured metro name, the pipeline
 * issues one Anthropic query per tile IN PARALLEL, merges all candidates,
 * dedupes by identity_key, then scores the combined set — giving far more
 * comprehensive neighborhood coverage than a single "best X in [City]" query.
 *
 * Structure: lowercase metro name → array of tile sub-area strings.
 * Each tile becomes the location in its query: "Best poke in Central San Diego."
 *
 * Tile count scales with metro size. Keep per-tile prompts geographically tight
 * (the geographic containment instruction is applied per tile automatically).
 *
 * Metros NOT listed here use the existing single-query behavior — no change.
 * To add a metro: add an entry below. That's the only config needed.
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

/**
 * Returns the tile array if `location` is a broad configured metro,
 * or null if the location is already sub-area level (no tiling needed).
 *
 * Detection logic:
 * 1. If the location exactly matches one of the tile names for any metro
 *    → it's already specific; return null (single query).
 * 2. If the location exactly matches a metro key (case-insensitive)
 *    → return that metro's tiles.
 * 3. Otherwise → null (single query, no config match).
 *
 * Exact matching (not substring) prevents "North San Diego" from
 * accidentally triggering on the "san diego" metro entry.
 */
export function getTilesForLocation(location: string): string[] | null {
  const norm = location.toLowerCase().trim();

  // If location IS already one of the tile sub-areas → already specific, no tiling
  for (const tiles of Object.values(METRO_TILES)) {
    if (tiles.some(tile => tile.toLowerCase() === norm)) return null;
  }

  // Exact metro name match
  return METRO_TILES[norm] ?? null;
}
