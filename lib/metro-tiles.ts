/**
 * Metro region config for geographic tiling and the pre-search Refine step.
 *
 * Each metro entry defines selectable regions. Each region becomes:
 * - A card in the Refine UI (label + neighborhoods subtitle)
 * - A tile query when that region is selected ("Best [dish] in [tileQuery]")
 *
 * Adding a metro: add an entry to METROS and optionally add aliases below.
 * No other code changes needed.
 */

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type MetroRegion = {
  id:            string;  // URL-safe identifier, e.g. "central"
  label:         string;  // Display name, e.g. "Central"
  neighborhoods: string;  // Subtitle shown in the card, e.g. "Downtown, North Park..."
  tileQuery:     string;  // Location string used in the search query
};

export type MetroConfig = {
  displayName: string;      // e.g. "San Diego"
  regions: MetroRegion[];
};

// ─── METRO DEFINITIONS ────────────────────────────────────────────────────────
// First-pass regions — tunable based on user feedback and food geography.

export const METROS: Record<string, MetroConfig> = {

  // ── San Diego ──────────────────────────────────────────────────────────────
  "san diego": {
    displayName: "San Diego",
    regions: [
      {
        id:            "central",
        label:         "Central",
        neighborhoods: "Downtown, North Park, Hillcrest, City Heights",
        tileQuery:     "Central San Diego",
      },
      {
        id:            "convoy",
        label:         "Convoy / Kearny Mesa",
        neighborhoods: "Convoy District, Kearny Mesa, Clairemont",
        tileQuery:     "Convoy and Kearny Mesa San Diego",
      },
      {
        id:            "coastal",
        label:         "Coastal",
        neighborhoods: "Pacific Beach, La Jolla, Ocean Beach, Point Loma",
        tileQuery:     "Coastal San Diego",
      },
      {
        id:            "south-bay",
        label:         "South Bay",
        neighborhoods: "Chula Vista, National City, Imperial Beach",
        tileQuery:     "South Bay San Diego",
      },
      {
        id:            "north-coastal",
        label:         "North County Coastal",
        neighborhoods: "Encinitas, Carlsbad, Oceanside, Del Mar",
        tileQuery:     "North County Coastal San Diego",
      },
      {
        id:            "north-inland",
        label:         "North County Inland",
        neighborhoods: "Escondido, San Marcos, Vista, Poway",
        tileQuery:     "North County Inland San Diego",
      },
      {
        id:            "east",
        label:         "East County",
        neighborhoods: "El Cajon, La Mesa, Santee",
        tileQuery:     "East County San Diego",
      },
    ],
  },

  // ── Los Angeles ────────────────────────────────────────────────────────────
  "los angeles": {
    displayName: "Los Angeles",
    regions: [
      {
        id:            "dtla",
        label:         "DTLA / East LA",
        neighborhoods: "Downtown, Koreatown, East LA, Boyle Heights, Silver Lake",
        tileQuery:     "Downtown and East Los Angeles",
      },
      {
        id:            "westside",
        label:         "Westside",
        neighborhoods: "Santa Monica, Culver City, Venice, Mar Vista, Brentwood",
        tileQuery:     "Westside Los Angeles",
      },
      {
        id:            "mid-city",
        label:         "Mid-City / Hollywood",
        neighborhoods: "Mid-City, Hollywood, Los Feliz, Fairfax, Pico-Robertson",
        tileQuery:     "Mid-City and Hollywood Los Angeles",
      },
      {
        id:            "sfv",
        label:         "San Fernando Valley",
        neighborhoods: "Sherman Oaks, Encino, Van Nuys, Burbank, Studio City",
        tileQuery:     "San Fernando Valley Los Angeles",
      },
      {
        id:            "south-bay-la",
        label:         "South Bay",
        neighborhoods: "Torrance, Gardena, Hawthorne, El Segundo, Inglewood",
        tileQuery:     "South Bay Los Angeles",
      },
      {
        id:            "sgv",
        label:         "San Gabriel Valley",
        neighborhoods: "Alhambra, Monterey Park, Arcadia, Rowland Heights, San Gabriel",
        tileQuery:     "San Gabriel Valley Los Angeles",
      },
      {
        id:            "pasadena",
        label:         "Pasadena / NE LA",
        neighborhoods: "Pasadena, Eagle Rock, Glendale, Monrovia, Sierra Madre",
        tileQuery:     "Pasadena and Northeast Los Angeles",
      },
    ],
  },

  // ── New York ───────────────────────────────────────────────────────────────
  "new york": {
    displayName: "New York City",
    regions: [
      {
        id:            "manhattan",
        label:         "Manhattan",
        neighborhoods: "Midtown, Upper East Side, Upper West Side, Harlem, Chelsea",
        tileQuery:     "Manhattan New York City",
      },
      {
        id:            "lower-manhattan",
        label:         "Lower Manhattan",
        neighborhoods: "Tribeca, Soho, West Village, Lower East Side, Chinatown, Financial District",
        tileQuery:     "Lower Manhattan New York City",
      },
      {
        id:            "brooklyn",
        label:         "Brooklyn",
        neighborhoods: "Williamsburg, Park Slope, Bushwick, Crown Heights, DUMBO, Flatbush",
        tileQuery:     "Brooklyn New York City",
      },
      {
        id:            "queens",
        label:         "Queens",
        neighborhoods: "Flushing, Astoria, Jackson Heights, Long Island City, Jamaica",
        tileQuery:     "Queens New York City",
      },
      {
        id:            "bronx",
        label:         "The Bronx",
        neighborhoods: "Fordham, Belmont, Riverdale, Tremont, Morris Park",
        tileQuery:     "The Bronx New York City",
      },
    ],
  },

  // ── San Francisco ──────────────────────────────────────────────────────────
  "san francisco": {
    displayName: "San Francisco",
    regions: [
      {
        id:            "mission",
        label:         "Mission / Bernal",
        neighborhoods: "Mission District, Bernal Heights, Noe Valley, Potrero Hill",
        tileQuery:     "Mission District and Bernal Heights San Francisco",
      },
      {
        id:            "north-beach",
        label:         "North Beach / Chinatown",
        neighborhoods: "North Beach, Chinatown, Financial District, Jackson Square",
        tileQuery:     "North Beach and Chinatown San Francisco",
      },
      {
        id:            "richmond-sunset",
        label:         "Richmond / Sunset",
        neighborhoods: "Inner Richmond, Outer Richmond, Inner Sunset, Outer Sunset",
        tileQuery:     "Richmond and Sunset Districts San Francisco",
      },
      {
        id:            "soma-downtown",
        label:         "SoMa / Downtown",
        neighborhoods: "SoMa, Union Square, Tenderloin, Civic Center, Hayes Valley",
        tileQuery:     "SoMa and Downtown San Francisco",
      },
      {
        id:            "marina-nob",
        label:         "Marina / Nob Hill",
        neighborhoods: "Marina, Pacific Heights, Nob Hill, Russian Hill, Cow Hollow",
        tileQuery:     "Marina and Nob Hill San Francisco",
      },
    ],
  },

  // ── Chicago ────────────────────────────────────────────────────────────────
  "chicago": {
    displayName: "Chicago",
    regions: [
      {
        id:            "loop",
        label:         "Loop / Downtown",
        neighborhoods: "Loop, River North, Streeterville, Magnificent Mile, West Loop",
        tileQuery:     "Loop and Downtown Chicago",
      },
      {
        id:            "north-side",
        label:         "North Side",
        neighborhoods: "Lincoln Park, Wicker Park, Bucktown, Logan Square, Lakeview",
        tileQuery:     "North Side Chicago",
      },
      {
        id:            "northwest-side",
        label:         "Northwest Side",
        neighborhoods: "Humboldt Park, Avondale, Irving Park, Albany Park, Andersonville",
        tileQuery:     "Northwest Side Chicago",
      },
      {
        id:            "south-side",
        label:         "South Side",
        neighborhoods: "Hyde Park, Bridgeport, Bronzeville, Pilsen, Back of the Yards",
        tileQuery:     "South Side Chicago",
      },
      {
        id:            "chinatown-pilsen",
        label:         "Chinatown / Pilsen",
        neighborhoods: "Chinatown, Pilsen, Little Village, Bridgeport",
        tileQuery:     "Chinatown and Pilsen Chicago",
      },
    ],
  },

};

// ─── ALIAS MAP ────────────────────────────────────────────────────────────────
// Maps common abbreviations and alternate forms to METROS keys.
// Applied in getMetroForLocation before the exact-key lookup.
const METRO_ALIASES: Record<string, string> = {
  "la":              "los angeles",
  "nyc":             "new york",
  "ny":              "new york",     // bare "NY" → New York (not Louisiana state)
  "ny city":         "new york",
  "new york city":   "new york",
  "new york, ny":    "new york",
  "sf":              "san francisco",
  "san fran":        "san francisco",
};

// ─── NORMALIZATION ────────────────────────────────────────────────────────────

const STATE_ABBREVS = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy',
]);

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

const COUNTRY_RE     = /,?\s*(usa|us|united states|united states of america)\s*$/i;
const ZIP_RE         = /,?\s*\d{5}(-\d{4})?\s*$/;
const TRAILING_COMMA = /,\s*$/;

export function normalizeLocation(s: string): string {
  let n = s.toLowerCase().trim().replace(/\s+/g, ' ');
  n = n.replace(ZIP_RE, '').trim();
  n = n.replace(COUNTRY_RE, '').trim();

  // Strip trailing state name only if it would NOT consume the entire string.
  // Bug guard: "New York" is both a city and a state — stripping it would return "".
  // Rule: only strip if the result is non-empty (there is a city before the state qualifier).
  const afterStateName = n.replace(STATE_NAME_RE, '').trim();
  if (afterStateName.length > 0) {
    n = afterStateName;
  }

  // Strip trailing 2-letter state abbreviation ("Los Angeles, CA" → "Los Angeles")
  const m = n.match(/^(.+?)(?:,\s*|\s+)([a-z]{2})\s*$/);
  if (m && STATE_ABBREVS.has(m[2]) && m[1].trim().length > 0) n = m[1].trim();

  return n.replace(TRAILING_COMMA, '').trim();
}

// ─── DETECTION ────────────────────────────────────────────────────────────────

/**
 * Returns the full MetroConfig if the location resolves to a configured metro,
 * null if already sub-area level or no config match.
 */
export function getMetroForLocation(location: string): MetroConfig | null {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;

  // If location matches any tile/region query string → already specific
  for (const metro of Object.values(METROS)) {
    if (metro.regions.some(r => normalizeLocation(r.tileQuery) === normalized)) return null;
  }

  // Check alias map first, then exact key lookup
  const key = METRO_ALIASES[normalized] ?? normalized;
  return METROS[key] ?? null;
}

/**
 * Returns all tile query strings for a metro (for backward-compat auto-tiling).
 * Returns null if no metro match or already specific.
 */
export function getTilesForLocation(location: string): string[] | null {
  const metro = getMetroForLocation(location);
  return metro ? metro.regions.map(r => r.tileQuery) : null;
}

/**
 * Given a GPS neighborhood name (e.g. "North Park", "Pacific Beach"),
 * returns the region ID whose neighborhood list contains that name.
 * Returns null if no match — caller should default to no pre-selection.
 */
export function detectRegionFromNeighborhood(neighborhood: string, metro: MetroConfig): string | null {
  if (!neighborhood) return null;
  const needle = neighborhood.toLowerCase().trim();
  for (const region of metro.regions) {
    const names = region.neighborhoods.toLowerCase().split(",").map(s => s.trim());
    if (names.some(name => name.includes(needle) || needle.includes(name))) {
      return region.id;
    }
  }
  return null;
}
