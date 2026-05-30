'use client';
import { useState, useEffect } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "American",      descriptor: "Burgers, BBQ, comfort",         code: "AM" },
  { id: "Mexican",       descriptor: "Tacos, burritos, regional",      code: "MX" },
  { id: "Japanese",      descriptor: "Ramen, sushi, izakaya",          code: "JP" },
  { id: "Italian",       descriptor: "Pasta, pizza, regional",         code: "IT" },
  { id: "Korean",        descriptor: "BBQ, fried chicken, stews",      code: "KR" },
  { id: "Asian",         descriptor: "Chinese, Thai, Vietnamese",      code: "AS" },
  { id: "Mediterranean", descriptor: "Greek, Lebanese, Turkish",       code: "MD" },
  { id: "Indian",        descriptor: "Regional, street food, curries", code: "IN" },
  { id: "Seafood",       descriptor: "Fresh catch, raw bar, coastal",  code: "SF" },
  { id: "BBQ & Smoked",  descriptor: "Brisket, ribs, low and slow",    code: "BB" },
  { id: "Breakfast",     descriptor: "Morning only, all day, brunch",  code: "BK" },
  { id: "Late Night",    descriptor: "Open past midnight",             code: "LN" },
  { id: "Pizza",         descriptor: "Neapolitan, NY, Detroit, more",  code: "PZ" },
  { id: "Burgers",       descriptor: "Smash, pub, gourmet, wagyu",     code: "BG" },
  { id: "Vegetarian",    descriptor: "Plant-based, meat-free",         code: "VG" },
  { id: "Desserts",      descriptor: "Ice cream, pastry, sweets",      code: "DS" },
];

const QUICK_SEARCHES = [
  "Open now near me",
  "Best rated",
  "Late night",
  "Takeout",
];

// ─── THEME ────────────────────────────────────────────────────────────────────
function th(dark: boolean) {
  return {
    cardBg:       dark ? "#161616" : "#FFFFFF",
    cardBorder:   dark ? "#2C2C2C" : "#E8E3DC",
    hoverBorder:  dark ? "#FFB800" : "#B8780A",
    text:         dark ? "#F0EDE8" : "#1C1917",
    secondary:    dark ? "#9A9390" : "#6B6560",
    tertiary:     dark ? "#6B6866" : "#A89F99",
    accent:       dark ? "#FFB800" : "#B8780A",
    accentLight:  dark ? "#2A2010" : "#FDF3E3",
    accentBorder: dark ? "#4A3810" : "#F0D5A0",
    codeColor:    dark ? "#3A3A3A" : "#E0D8CE",
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type BrowseProps = {
  onSelect: (dish: string) => void;
  disabled?: boolean;
  dark?: boolean;
};

export function Browse({ onSelect, disabled = false, dark: darkProp }: BrowseProps) {
  const [dark, setDark]       = useState(darkProp ?? false);
  const [active, setActive]   = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  useEffect(() => { if (!disabled) setActive(null); }, [disabled]);

  const t = th(dark);

  const handleSelect = (term: string) => {
    if (disabled) return;
    setActive(term);
    onSelect(term);
  };

  const cardStyle = (id: string): React.CSSProperties => {
    const isActive  = active === id;
    const isHovered = hovered === id;
    const highlight = isActive || isHovered;
    return {
      background:   t.cardBg,
      // Always 3px left border slot — transparent at rest, amber on hover/active
      borderLeft:   `3px solid ${highlight ? t.hoverBorder : "transparent"}`,
      borderTop:    `1px solid ${t.cardBorder}`,
      borderRight:  `1px solid ${t.cardBorder}`,
      borderBottom: `1px solid ${t.cardBorder}`,
      borderRadius: 10,
      padding:      "14px 14px 14px 13px",
      cursor:       disabled ? "default" : "pointer",
      boxShadow:    isHovered
        ? "0 4px 16px rgba(0,0,0,0.12)"
        : "0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      transition:   "border-color 0.15s ease-out, box-shadow 0.15s ease-out",
      display:      "flex",
      flexDirection: "column" as const,
      gap:          4,
      minHeight:    100,
      opacity:      disabled && !isActive ? 0.6 : 1,
      position:     "relative" as const,
    };
  };

  // Shared pill style
  const pillStyle = (hov: boolean): React.CSSProperties => ({
    background:   hov ? (dark ? "#3A2A15" : "#F5E6C8") : t.accentLight,
    border:       `1.5px solid ${hov ? (dark ? "#FFB800" : "#C8860A") : t.accentBorder}`,
    borderRadius: 20,
    padding:      "0 18px",
    height:       40,
    fontFamily:   "'Inter', sans-serif",
    fontSize:     "0.875rem",
    fontWeight:   600,
    color:        t.accent,
    cursor:       disabled ? "default" : "pointer",
    whiteSpace:   "nowrap" as const,
    flexShrink:   0,
    opacity:      disabled ? 0.5 : 1,
    display:      "flex",
    alignItems:   "center",
    transition:   "background 0.15s, border-color 0.15s",
  });

  const [hoveredPill, setHoveredPill] = useState<string | null>(null);

  return (
    <div>
      <style>{`
        .dr-cat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .dr-cat-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .dr-quick-pills {
          display: flex; gap: 8px;
          overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;
        }
        .dr-quick-pills::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── RAPID SEARCH PROTOCOLS section label ─────────────────────────── */}
      <div style={{
        fontFamily:    "'Sevastopol', Georgia, serif",
        fontSize:      "0.625rem", fontWeight: 400,
        color:         t.accent, textTransform: "uppercase",
        letterSpacing: "0.12em", marginBottom: 10,
      }}>RAPID SEARCH PROTOCOLS //</div>

      {/* ── Quick-tap pills ──────────────────────────────────────────────── */}
      <div className="dr-quick-pills" style={{ marginBottom: 32 }}>
        {QUICK_SEARCHES.map(q => (
          <button
            key={q}
            onClick={() => handleSelect(q)}
            disabled={disabled}
            style={pillStyle(hoveredPill === q)}
            onMouseEnter={() => !disabled && setHoveredPill(q)}
            onMouseLeave={() => setHoveredPill(null)}
          >{q}</button>
        ))}
      </div>

      {/* ── SELECT QUERY TYPE section label ──────────────────────────────── */}
      <div style={{
        fontFamily:    "'Sevastopol', Georgia, serif",
        fontSize:      "0.625rem", fontWeight: 400,
        color:         t.accent, textTransform: "uppercase",
        letterSpacing: "0.12em", marginBottom: 12,
      }}>SELECT QUERY TYPE //</div>

      {/* ── Category grid ────────────────────────────────────────────────── */}
      <div className="dr-cat-grid">
        {CATEGORIES.map(cat => (
          <div
            key={cat.id}
            style={cardStyle(cat.id)}
            onClick={() => handleSelect(cat.id)}
            onMouseEnter={() => !disabled && setHovered(cat.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Classification code — Orbitron, top-left */}
            <div style={{
              fontFamily:   "var(--font-orbitron), 'Courier New', monospace",
              fontSize:     "1.75rem", fontWeight: 700,
              color:        t.codeColor, lineHeight: 1,
              marginBottom: 8, letterSpacing: "0.02em",
            }}>{cat.code}</div>

            {/* Name */}
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   "1.0625rem",
              fontWeight: 700,
              color:      active === cat.id || hovered === cat.id ? t.accent : t.text,
              lineHeight: 1.2,
              transition: "color 0.15s",
            }}>{cat.id}</div>

            {/* Descriptor */}
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   "0.8125rem",
              fontWeight: 400,
              color:      "#6B6560",
              lineHeight: 1.3,
            }}>{cat.descriptor}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
