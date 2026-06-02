/**
 * Lumon / Severance design system — single source of truth for all colors.
 * Change here, cascade everywhere.
 *
 * Token naming:
 *   LM.pageBg        — bone canvas (page backgrounds, open structural space)
 *   LM.cardBg        — dark teal (cards, inputs, panels — anything holding content)
 *   LM.cardText      — primary text on dark surfaces
 *   LM.pageText      — primary text on bone page frame
 *   LM.brand         — primary action button (replaces amber everywhere)
 */
export const LM = {
  // ── Structural / bone frame ──────────────────────────────────────────────
  pageBg:        "#e8ece8",   // bone canvas
  pageBorder:    "#c4cdc8",   // 1px frame border
  outlineBtn:    "#b9c4bf",   // secondary outline buttons on bone
  outlineTxt:    "#3a554f",   // text for outline buttons

  // ── Dark teal content boxes ──────────────────────────────────────────────
  cardBg:        "#10211e",   // card / input / panel background
  liftedSurf:    "#1b332e",   // chips, lifted secondary surfaces
  boxBorder:     "#2c4a44",   // border on dark surfaces

  // ── Text on dark boxes ───────────────────────────────────────────────────
  cardText:      "#f0f4f1",   // primary (names, headlines)
  cardBody:      "#d4e4df",   // body copy
  cardMuted:     "#8aa9a2",   // metadata / muted
  cardMuted2:    "#7fa39b",   // extra muted
  brightTeal:    "#7fe3c8",   // emphasis, cursor, prompt, active badges
  sectionLabel:  "#5f857d",   // tiny all-caps section labels

  // ── Text on bone frame ───────────────────────────────────────────────────
  pageText:      "#23413b",   // headings / strong labels on bone
  pageMeta:      "#7a8e8a",   // secondary / meta on bone

  // ── Brand / action (replaces amber) ────────────────────────────────────
  brand:         "#3d6b62",   // primary button fill
  brandBorder:   "#4d8377",   // primary button border
  brandText:     "#eafaf4",   // primary button label
  brandTitle1:   "#2f4f49",   // brand title on bone (screen headers)
  brandTitle2:   "#23413b",   // brand sub-labels on bone

  // ── Score tier colors (vivid — must pop on #10211e) ─────────────────────
  score9:        "#3fd98a",   // 9.0+ Local legend / vivid green
  score8:        "#7bc24a",   // 8.0+ Always great / green
  score7:        "#e8b133",   // 7.0+ Solid spot / gold
  score6:        "#e07b3a",   // 6.0+ Convenience / orange
  scoreLow:      "#d64545",   // <6.0 Compromise-below / red
  scoreTierText: "#9fe3c8",   // tier label under score (bright, weight 600)
} as const;

/** Score fill color — vivid on dark card background */
export function scoreColor(s: number): string {
  if (s >= 9) return LM.score9;
  if (s >= 8) return LM.score8;
  if (s >= 7) return LM.score7;
  if (s >= 6) return LM.score6;
  return LM.scoreLow;
}

/** Short tier label shown beneath the score number */
export function scoreTierLabel(s: number): string {
  if (s >= 9.2) return "Local legend";
  if (s >= 8.7) return "Local legend";
  if (s >= 8.1) return "Always great";
  if (s >= 7.5) return "Solid spot";
  if (s >= 6.9) return "Hit & miss";
  if (s >= 6.0) return "Convenience";
  if (s >= 5.0) return "Compromise";
  if (s >= 2.5) return "Disappointing";
  return "Disgust";
}
