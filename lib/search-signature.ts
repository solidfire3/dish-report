import { createHash } from "crypto";

const STOPWORDS = new Set(["best", "top", "good", "great", "find", "show", "the", "a"]);
const LOC_INTENT_RE = /\b(near me|nearby|around me|in my area|open now|open late|tonight|right now|this weekend|for dinner|for lunch|for breakfast|happy hour)\b/gi;

function normalizeTag(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(w => w.length > 0 && !STOPWORDS.has(w))
    .join(" ");
}

export type SearchTags = {
  location: string;
  cuisine: string | null;
  dish: string;
  flavor: string | null;
  vibe: string | null;
  health: string | null;
  price: string | null;
  occasion: string | null;
};

export function buildTags({
  dish,
  city,
  area,
  locMode,
  radius,
}: {
  dish: string;
  city: string;
  area?: string | null;
  locMode?: string | null;
  radius?: number | null;
}): SearchTags {
  // Always resolve to actual place — "near me" must never survive into the signature
  const rawLocation = locMode === "area" && area ? area : city;
  const effectiveRadius = radius && radius > 0 && radius < 20 ? radius : null;
  const locationBase = normalizeTag(rawLocation);
  const location = effectiveRadius ? `${locationBase}|r${effectiveRadius}` : locationBase;

  const dishClean = (dish || "").replace(LOC_INTENT_RE, "").trim();

  return {
    location,
    cuisine: null,
    dish: normalizeTag(dishClean),
    flavor: null,
    vibe: null,
    health: null,
    price: null,
    occasion: null,
  };
}

export function computeSignature(tags: SearchTags): string {
  const ordered = [
    tags.location,
    normalizeTag(tags.cuisine),
    normalizeTag(tags.dish),
    normalizeTag(tags.flavor),
    normalizeTag(tags.vibe),
    normalizeTag(tags.health),
    normalizeTag(tags.price),
    normalizeTag(tags.occasion),
  ];
  return createHash("sha256").update(ordered.join("|")).digest("hex");
}
