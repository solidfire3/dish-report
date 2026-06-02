
export const VENUE_META: Record<string, { icon: string; clr: string }> = {
  "hole-in-the-wall": { icon: "🏚", clr: "#AAA" },
  "counter service":  { icon: "🥡", clr: "#B56BFF" },
  "food truck":       { icon: "🚚", clr: "#FFB800" },
  "casual dine-in":   { icon: "🍽", clr: "#2ECC71" },
  "upscale casual":   { icon: "✨", clr: "#4A9EFF" },
  "fine dining":      { icon: "💎", clr: "#D4A8FF" },
};

export const ACCENTS = ["#FFB800", "#B56BFF", "#4A9EFF", "#FF6B35", "#2ECC71", "#FF4444"];

export const DISH_MAP: Record<string, string> = {
  burger:"🍔", pizza:"🍕", ramen:"🍜", taco:"🌮", sushi:"🍣",
  carnitas:"🌮", birria:"🌮", pasta:"🍝", steak:"🥩", chicken:"🍗",
  seafood:"🦞", dumpling:"🥟", curry:"🍛", pho:"🍜", pancake:"🥞",
  egg:"🍳", shrimp:"🍤", bbq:"🍖", lobster:"🦞", oyster:"🦪",
  donut:"🍩", cake:"🎂", crab:"🦀", fish:"🐟", rice:"🍚",
  noodle:"🍜", bread:"🍞", jerk:"🌶", oxtail:"🫙", poke:"🍣",
  chowder:"🍲", gumbo:"🫕", mole:"🌶",
};

export const dEmoji = (d: string | null | undefined): string => {
  if (!d) return "🍽️";
  const l = d.toLowerCase();
  return Object.entries(DISH_MAP).find(([k]) => l.includes(k))?.[1] ?? "🍽️";
};

export const gURL = (n: string, h?: string, c?: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent([n, h, c].filter(Boolean).join(" "))}`;

export const dirURL = (addr: string | undefined, n: string, c: string): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || `${n} ${c}`)}`;
