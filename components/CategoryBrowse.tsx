'use client';
import { useState, useEffect } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "American", code: "AM", descriptor: "Burgers, BBQ, comfort",
    bg: "#FFF5F0", codeClr: "#8B3A20",
    dishes: ["Smash burger", "Brisket", "Fried chicken"],
  },
  {
    id: "Mexican", code: "MX", descriptor: "Tacos, burritos, regional",
    bg: "#FFF8F0", codeClr: "#8B5A20",
    dishes: ["Birria tacos", "Carnitas", "Al pastor"],
  },
  {
    id: "Japanese", code: "JP", descriptor: "Ramen, sushi, izakaya",
    bg: "#F0F4FF", codeClr: "#20408B",
    dishes: ["Tonkotsu ramen", "Omakase", "Karaage"],
  },
  {
    id: "Italian", code: "IT", descriptor: "Pasta, pizza, regional",
    bg: "#F5F0FF", codeClr: "#50208B",
    dishes: ["Cacio e pepe", "Margherita", "Tiramisu"],
  },
  {
    id: "Korean", code: "KR", descriptor: "BBQ, fried chicken, stews",
    bg: "#FFF0F5", codeClr: "#8B2050",
    dishes: ["KBBQ", "Fried chicken", "Sundubu"],
  },
  {
    id: "Asian", code: "AS", descriptor: "Chinese, Thai, Vietnamese",
    bg: "#F0FFF4", codeClr: "#1A6B3A",
    dishes: ["Dim sum", "Pad thai", "Pho"],
  },
  {
    id: "Mediterranean", code: "MD", descriptor: "Greek, Lebanese, Turkish",
    bg: "#F0F8FF", codeClr: "#1A4A8B",
    dishes: ["Hummus", "Kebab", "Shakshuka"],
  },
  {
    id: "Indian", code: "IN", descriptor: "Regional, street food, curries",
    bg: "#FFF9F0", codeClr: "#8B6020",
    dishes: ["Butter chicken", "Biryani", "Dosa"],
  },
  {
    id: "Seafood", code: "SF", descriptor: "Fresh catch, raw bar, coastal",
    bg: "#F0FFFF", codeClr: "#1A7A7A",
    dishes: ["Oysters", "Ceviche", "Fish tacos"],
  },
  {
    id: "BBQ & Smoked", code: "BB", descriptor: "Brisket, ribs, low and slow",
    bg: "#FFF3F0", codeClr: "#8B2A1A",
    dishes: ["Brisket", "Ribs", "Burnt ends"],
  },
  {
    id: "Breakfast", code: "BK", descriptor: "Morning only, all day, brunch",
    bg: "#FFFBF0", codeClr: "#8B7020",
    dishes: ["Eggs benedict", "Pancakes", "Chilaquiles"],
  },
  {
    id: "Late Night", code: "LN", descriptor: "Open past midnight",
    bg: "#F5F0FF", codeClr: "#40208B",
    dishes: ["Tacos", "Ramen", "KBBQ"],
  },
  {
    id: "Pizza", code: "PZ", descriptor: "Neapolitan, NY, Detroit, more",
    bg: "#FFF5F0", codeClr: "#8B3A1A",
    dishes: ["Neapolitan", "Detroit", "NY slice"],
  },
  {
    id: "Burgers", code: "BG", descriptor: "Smash, pub, gourmet, wagyu",
    bg: "#FFF8F0", codeClr: "#8B5020",
    dishes: ["Smash", "Wagyu", "Double smash"],
  },
  {
    id: "Vegetarian", code: "VG", descriptor: "Plant-based, meat-free",
    bg: "#F0FFF4", codeClr: "#1A6B3A",
    dishes: ["Falafel", "Shakshuka", "Grain bowl"],
  },
  {
    id: "Desserts", code: "DS", descriptor: "Ice cream, pastry, sweets",
    bg: "#FFF0F8", codeClr: "#8B2060",
    dishes: ["Gelato", "Mochi", "Croissant"],
  },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type BrowseProps = {
  onSelect: (dish: string) => void;
  disabled?: boolean;
  dark?: boolean;
};

export function Browse({ onSelect, disabled = false, dark: darkProp }: BrowseProps) {
  const [dark, setDark]     = useState(darkProp ?? false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  useEffect(() => { if (!disabled) setActive(null); }, [disabled]);

  const handleSelect = (term: string) => {
    if (disabled) return;
    setActive(term);
    onSelect(term);
  };

  const cardBg    = (bg: string) => dark ? "#161616" : bg;
  const cardBord  = dark ? "#2C2C2C" : "transparent";
  const nameClr   = dark ? "#F0EDE8" : "#1C1917";
  const descClr   = dark ? "#9A9390" : "#6B6560";
  const pillBg    = dark ? "rgba(255,184,0,0.08)" : "rgba(0,0,0,0.06)";
  const pillBord  = dark ? "rgba(255,184,0,0.2)"  : "rgba(0,0,0,0.1)";
  const pillClr   = dark ? "rgba(255,184,0,0.75)" : "#6B6560";

  return (
    <div>
      <style>{`
        .dr-carousel {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 8px;
        }
        .dr-carousel::-webkit-scrollbar { display: none; }
        .dr-cat-card {
          scroll-snap-align: start;
          flex-shrink: 0;
          width: 160px;
          cursor: pointer;
        }
      `}</style>

      <div className="dr-carousel">
        {CATEGORIES.map(cat => {
          const isActive = active === cat.id;
          const codeColor = dark ? "rgba(255,184,0,0.2)" : cat.codeClr + "30";
          return (
            <div
              key={cat.id}
              className="dr-cat-card"
              onClick={() => handleSelect(cat.id)}
              style={{
                background: cardBg(cat.bg),
                border: `1px solid ${isActive ? (dark ? "#FFB800" : "#B8780A") : cardBord}`,
                borderRadius: 12,
                padding: 14,
                opacity: disabled && !isActive ? 0.6 : 1,
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isActive
                  ? `0 4px 16px rgba(0,0,0,0.12)`
                  : "0 1px 4px rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", minHeight: 180,
              }}
            >
              {/* Code */}
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "1.75rem", fontWeight: 900, lineHeight: 1,
                color: dark ? "rgba(255,184,0,0.25)" : cat.codeClr + "40",
                letterSpacing: "0.02em", marginBottom: 8,
              }}>{cat.code}</div>

              {/* Name */}
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "0.875rem", fontWeight: 700, lineHeight: 1.2,
                color: isActive ? (dark ? "#FFB800" : "#B8780A") : nameClr,
                letterSpacing: "0.02em", marginBottom: 4,
                transition: "color 0.15s",
              }}>{cat.id}</div>

              {/* Descriptor */}
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.75rem", color: descClr, lineHeight: 1.3,
                marginBottom: 12, flex: 1,
              }}>{cat.descriptor}</div>

              {/* Dish pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {cat.dishes.map(dish => (
                  <button
                    key={dish}
                    onClick={e => { e.stopPropagation(); handleSelect(dish); }}
                    style={{
                      background: pillBg,
                      border: `1px solid ${pillBord}`,
                      borderRadius: 20, padding: "3px 8px",
                      fontFamily: "'Sevastopol', Georgia, serif",
                      fontSize: 9, color: pillClr,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? "rgba(255,184,0,0.15)" : "rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = pillBg; }}
                  >{dish}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
