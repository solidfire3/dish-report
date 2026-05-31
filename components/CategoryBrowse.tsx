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
  const [dark, setDark]           = useState(darkProp ?? false);
  const [active, setActive]       = useState<string | null>(null);
  const [panelCat, setPanelCat]   = useState<string | null>(null);

  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  useEffect(() => { if (!disabled) setActive(null); }, [disabled]);

  // Close panel when a search fires
  useEffect(() => { if (disabled) setPanelCat(null); }, [disabled]);

  const handleSelect = (term: string) => {
    if (disabled) return;
    setPanelCat(null);
    setActive(term);
    onSelect(term);
  };

  const openPanel = (catId: string) => {
    if (disabled) return;
    setPanelCat(catId);
  };

  const closePanel = () => setPanelCat(null);

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
              onClick={() => openPanel(cat.id)}
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

      {/* ── Subcategory panel ──────────────────────────────────────────────── */}
      {panelCat && (() => {
        const cat = CATEGORIES.find(c => c.id === panelCat);
        if (!cat) return null;
        const panelBg     = dark ? "#161616" : "#FFFFFF";
        const panelBord   = dark ? "#2C2C2C" : "#E8E3DC";
        const panelText   = dark ? "#F0EDE8" : "#1C1917";
        const panelSec    = dark ? "#9A9390" : "#6B6560";
        const accentClr   = dark ? "#FFB800" : "#B8780A";
        const accentBg    = dark ? "#2A2010" : "#FDF3E3";
        const accentBord  = dark ? "#4A3810" : "#F0D5A0";

        return (
          <>
            {/* Backdrop */}
            <div
              onClick={closePanel}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 800,
                animation: "fadeIn 0.2s ease",
              }}
            />

            {/* Panel — bottom sheet on mobile, centered constrained on desktop */}
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              zIndex: 801,
              animation: "slideUp 0.3s ease-out",
            }}>
              <div style={{
                background: panelBg,
                border: `1px solid ${panelBord}`,
                borderRadius: "16px 16px 0 0",
                padding: "20px 20px 40px",
                maxHeight: "72vh", overflowY: "auto",
                maxWidth: 540, margin: "0 auto",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.16)",
              }}>
                {/* Header row */}
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 16,
                }}>
                  <div>
                    <div style={{
                      fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                      fontSize: "1.1rem", fontWeight: 700,
                      color: accentClr, letterSpacing: "0.03em",
                    }}>{cat.id}</div>
                    <div style={{
                      fontFamily: "'Sevastopol', Georgia, serif",
                      fontSize: 9, color: panelSec,
                      textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 2,
                    }}>{cat.descriptor}</div>
                  </div>
                  <button
                    onClick={closePanel}
                    style={{
                      background: "none", border: `1px solid ${panelBord}`,
                      borderRadius: 8, width: 36, height: 36,
                      color: panelSec, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = accentClr; e.currentTarget.style.borderColor = accentClr; }}
                    onMouseLeave={e => { e.currentTarget.style.color = panelSec; e.currentTarget.style.borderColor = panelBord; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Dish option pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                  {cat.dishes.map(dish => (
                    <button
                      key={dish}
                      onClick={() => handleSelect(dish)}
                      style={{
                        background: accentBg, border: `1.5px solid ${accentBord}`,
                        borderRadius: 24, padding: "10px 20px",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.9rem", fontWeight: 600,
                        color: accentClr, cursor: "pointer",
                        minHeight: 44,
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = dark ? "#3A2A15" : "#F0D5A0"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = accentBg; }}
                    >{dish}</button>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: panelBord, margin: "4px 0 16px" }} />

                {/* Search all */}
                <button
                  onClick={() => handleSelect(cat.id)}
                  style={{
                    width: "100%", background: "none",
                    border: `1.5px solid ${panelBord}`,
                    borderRadius: 10, padding: "14px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.9rem", fontWeight: 500,
                    color: panelSec, cursor: "pointer",
                    textAlign: "center",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accentClr; e.currentTarget.style.color = accentClr; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = panelBord; e.currentTarget.style.color = panelSec; }}
                >Search all {cat.id}</button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
