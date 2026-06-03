/**
 * Metro region config for geographic tiling and the pre-search Refine step.
 *
 * Each metro entry defines selectable regions. Each region becomes:
 * - A card in the Refine UI (label + neighborhoods subtitle)
 * - A tile query when that region is selected ("Best [dish] in [tileQuery]")
 *
 * Adding a metro: add an entry to METROS. No other code changes needed.
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

export const METROS: Record<string, MetroConfig> = {
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

  // Add metros here — only config changes needed:
  // "los angeles": {
  //   displayName: "Los Angeles",
  //   regions: [
  //     { id: "dtla", label: "Downtown / Central", neighborhoods: "Downtown, Koreatown, Mid-City", tileQuery: "Central Los Angeles" },
  //     { id: "westside", label: "Westside", neighborhoods: "Santa Monica, Culver City, Mar Vista, Venice", tileQuery: "Westside Los Angeles" },
  //     { id: "sfv", label: "San Fernando Valley", neighborhoods: "Sherman Oaks, Encino, Van Nuys, Burbank", tileQuery: "San Fernando Valley Los Angeles" },
  //     { id: "south-bay-la", label: "South Bay", neighborhoods: "Torrance, Gardena, Hawthorne", tileQuery: "South Bay Los Angeles" },
  //     { id: "sgv", label: "San Gabriel Valley", neighborhoods: "Alhambra, Monterey Park, Arcadia, Rowland Heights", tileQuery: "San Gabriel Valley Los Angeles" },
  //   ],
  // },
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

const COUNTRY_RE     = /,?\s*(usa|us|united states|united states of america)\s*$/;
const ZIP_RE         = /,?\s*\d{5}(-\d{4})?\s*$/;
const TRAILING_COMMA = /,\s*$/;

export function normalizeLocation(s: string): string {
  let n = s.toLowerCase().trim().replace(/\s+/g, ' ');
  n = n.replace(ZIP_RE, '').trim();
  n = n.replace(COUNTRY_RE, '').trim();
  n = n.replace(STATE_NAME_RE, '').trim();
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

  // If location matches any tile/region query string → already specific
  for (const metro of Object.values(METROS)) {
    if (metro.regions.some(r => normalizeLocation(r.tileQuery) === normalized)) return null;
  }

  // Exact metro name match
  return METROS[normalized] ?? null;
}

/**
 * Returns all tile query strings for a metro (for backward-compat auto-tiling).
 * Returns null if no metro match or already specific.
 */
export function getTilesForLocation(location: string): string[] | null {
  const metro = getMetroForLocation(location);
  return metro ? metro.regions.map(r => r.tileQuery) : null;
}
