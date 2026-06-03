// Font-scale utilities — persists choice locally + to Supabase user metadata
// when signed in, so the preference follows the user across devices.

export type FontSize = "normal" | "large" | "xl";

const LS_KEY = "dr-font-size";

// Base px applied to <html> font-size — rem units throughout the app scale automatically
const BASES: Record<FontSize, string> = {
  normal: "16px",
  large:  "18px",
  xl:     "20px",
};

export const FONT_LABELS: Record<FontSize, string> = {
  normal: "Normal",
  large:  "Large",
  xl:     "X-Large",
};

export function applyFontSize(size: FontSize): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = BASES[size];
}

export function getStoredFontSize(): FontSize {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "normal" || v === "large" || v === "xl") return v;
  } catch {}
  return "normal";
}

export function persistFontSize(size: FontSize): void {
  try { localStorage.setItem(LS_KEY, size); } catch {}
  applyFontSize(size);
}
