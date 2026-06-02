'use client';
import { useState, useEffect } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "American",      code: "AM", descriptor: "Burgers, BBQ, comfort",         bg: "#FFF5F0", codeClr: "#8B3A20", dishes: ["Smash burger", "Brisket", "Fried chicken", "Mac & cheese", "BBQ ribs"] },
  { id: "Mexican",       code: "MX", descriptor: "Tacos, burritos, regional",      bg: "#FFF8F0", codeClr: "#8B5A20", dishes: ["Birria tacos", "Carnitas", "Al pastor", "Carne asada", "Chilaquiles"] },
  { id: "Japanese",      code: "JP", descriptor: "Ramen, sushi, izakaya",          bg: "#F0F4FF", codeClr: "#20408B", dishes: ["Tonkotsu ramen", "Omakase", "Karaage", "Gyoza", "Chirashi bowl"] },
  { id: "Italian",       code: "IT", descriptor: "Pasta, pizza, regional",         bg: "#F5F0FF", codeClr: "#50208B", dishes: ["Cacio e pepe", "Margherita", "Carbonara", "Tiramisu", "Ribollita"] },
  { id: "Korean",        code: "KR", descriptor: "BBQ, fried chicken, stews",      bg: "#FFF0F5", codeClr: "#8B2050", dishes: ["KBBQ", "Fried chicken", "Sundubu jjigae", "Bibimbap", "Japchae"] },
  { id: "Asian",         code: "AS", descriptor: "Chinese, Thai, Vietnamese",      bg: "#F0FFF4", codeClr: "#1A6B3A", dishes: ["Dim sum", "Pad thai", "Pho", "Kung pao chicken", "Mapo tofu"] },
  { id: "Mediterranean", code: "MD", descriptor: "Greek, Lebanese, Turkish",       bg: "#F0F8FF", codeClr: "#1A4A8B", dishes: ["Hummus", "Kebab", "Shakshuka", "Falafel", "Lamb chops"] },
  { id: "Indian",        code: "IN", descriptor: "Regional, street food, curries", bg: "#FFF9F0", codeClr: "#8B6020", dishes: ["Butter chicken", "Biryani", "Dosa", "Chaat", "Dal makhani"] },
  { id: "Seafood",       code: "SF", descriptor: "Fresh catch, raw bar, coastal",  bg: "#F0FFFF", codeClr: "#1A7A7A", dishes: ["Oysters", "Ceviche", "Fish tacos", "Lobster roll", "Ahi poke"] },
  { id: "BBQ & Smoked",  code: "BB", descriptor: "Brisket, ribs, low and slow",    bg: "#FFF3F0", codeClr: "#8B2A1A", dishes: ["Brisket", "Ribs", "Burnt ends", "Pulled pork", "Smoked turkey"] },
  { id: "Breakfast",     code: "BK", descriptor: "Morning only, all day, brunch",  bg: "#FFFBF0", codeClr: "#8B7020", dishes: ["Eggs benedict", "Pancakes", "Chilaquiles", "Avocado toast", "French toast"] },
  { id: "Late Night",    code: "LN", descriptor: "Open past midnight",             bg: "#F5F0FF", codeClr: "#40208B", dishes: ["Tacos", "Ramen", "KBBQ", "Pho", "Pizza by the slice"] },
  { id: "Pizza",         code: "PZ", descriptor: "Neapolitan, NY, Detroit, more",  bg: "#FFF5F0", codeClr: "#8B3A1A", dishes: ["Neapolitan", "Detroit style", "NY slice", "Grandma pie", "White pizza"] },
  { id: "Burgers",       code: "BG", descriptor: "Smash, pub, gourmet, wagyu",     bg: "#FFF8F0", codeClr: "#8B5020", dishes: ["Smash burger", "Wagyu", "Double smash", "Mushroom Swiss", "Pub burger"] },
  { id: "Vegetarian",    code: "VG", descriptor: "Plant-based, meat-free",         bg: "#F0FFF4", codeClr: "#1A6B3A", dishes: ["Falafel", "Shakshuka", "Grain bowl", "Veggie tacos", "Mushroom risotto"] },
  { id: "Desserts",      code: "DS", descriptor: "Ice cream, pastry, sweets",      bg: "#FFF0F8", codeClr: "#8B2060", dishes: ["Gelato", "Mochi", "Croissant", "Crème brûlée", "Tiramisu"] },
];

const DISTANCES = ["1 mi", "2 mi", "5 mi", "10 mi"];
const PRICES    = ["$", "$$", "$$$", "$$$$"];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type BrowseProps = {
  onSelect: (query: string) => void;
  disabled?: boolean;
  dark?: boolean;
};

export function Browse({ onSelect, disabled = false, dark: darkProp }: BrowseProps) {
  const [dark, setDark]         = useState(darkProp ?? false);
  const [active, setActive]     = useState<string | null>(null);
  const [panelCat, setPanelCat] = useState<string | null>(null);
  const [selDist, setSelDist]   = useState<string>("");
  const [selPrice, setSelPrice] = useState<string>("");

  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  useEffect(() => { if (!disabled) setActive(null); }, [disabled]);
  useEffect(() => { if (disabled) { setPanelCat(null); } }, [disabled]);

  const openPanel = (catId: string) => {
    if (disabled) return;
    setSelDist(""); setSelPrice("");
    setPanelCat(catId);
  };

  const closePanel = () => setPanelCat(null);

  const runSearch = (query: string) => {
    if (disabled) return;
    setPanelCat(null);  // close panel first
    setActive(query);
    // 50ms delay ensures panel state flush before parent search handler fires
    setTimeout(() => onSelect(query), 50);
  };

  const runCategorySearch = (catId: string) => {
    const parts = [catId];
    if (selDist)  parts.push(`within ${selDist}`);
    if (selPrice) parts.push(`${selPrice} budget`);
    runSearch(parts.join(" "));
  };

  const cardBg   = (bg: string) => dark ? "#161616" : bg;
  const cardBord = dark ? "#2C2C2C" : "transparent";
  const nameClr  = dark ? "#F0EDE8" : "#1C1917";
  const descClr  = dark ? "#9A9390" : "#6B6560";

  // Panel theme
  const panelBg    = dark ? "#161616" : "#FFFFFF";
  const panelBord  = dark ? "#2C2C2C" : "#E8E3DC";
  const panelText  = dark ? "#F0EDE8" : "#1C1917";
  const panelSec   = dark ? "#9A9390" : "#6B6560";
  const accentClr  = dark ? "#7fe3c8" : "#7fe3c8";
  const accentBg   = dark ? "#1b332e" : "#1b332e";
  const accentBord = dark ? "#2c4a44" : "#2c4a44";

  const panelCatData = CATEGORIES.find(c => c.id === panelCat);

  return (
    <div>
      <style>{`
        .dr-carousel {
          display: flex; gap: 10px;
          overflow-x: auto; scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none; padding-bottom: 8px;
        }
        .dr-carousel::-webkit-scrollbar { display: none; }
        .dr-cat-card {
          scroll-snap-align: start; flex-shrink: 0; width: 160px; cursor: pointer;
        }
        @keyframes dr-panel-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes dr-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Carousel ─────────────────────────────────────────────────────── */}
      <div className="dr-carousel">
        {CATEGORIES.map(cat => {
          const isActive = active === cat.id;
          return (
            <div
              key={cat.id}
              className="dr-cat-card"
              onClick={e => { e.stopPropagation(); openPanel(cat.id); }}
              style={{
                background: cardBg(cat.bg),
                border: `1px solid ${isActive ? accentClr : cardBord}`,
                borderRadius: 12, padding: 14,
                opacity: disabled && !isActive ? 0.6 : 1,
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isActive ? "0 4px 16px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", minHeight: 140,
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
                color: isActive ? accentClr : nameClr,
                letterSpacing: "0.02em", marginBottom: 4, transition: "color 0.15s",
              }}>{cat.id}</div>

              {/* Descriptor */}
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.75rem", color: descClr, lineHeight: 1.3, flex: 1,
              }}>{cat.descriptor}</div>

              {/* "Tap to explore" hint */}
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: 8, color: accentClr, opacity: 0.6,
                textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 10,
              }}>Tap to explore</div>
            </div>
          );
        })}
      </div>

      {/* ── Subcategory panel ─────────────────────────────────────────────── */}
      {panelCat && panelCatData && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePanel}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 800, animation: "dr-backdrop-in 0.2s ease both",
            }}
          />

          {/* Panel — stopPropagation prevents any click reaching the backdrop */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 801,
              animation: "dr-panel-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) both",
            }}
          >
            <div style={{
              background: panelBg, border: `1px solid ${panelBord}`,
              borderRadius: "18px 18px 0 0", padding: "20px 20px 40px",
              maxHeight: "80vh", overflowY: "auto",
              maxWidth: 540, margin: "0 auto",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            }}>

              {/* ── Panel header ─────────────────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <div style={{
                    fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                    fontSize: "1.25rem", fontWeight: 700,
                    color: accentClr, letterSpacing: "0.03em", lineHeight: 1,
                  }}>{panelCatData.id}</div>
                  <div style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: 9, color: panelSec,
                    textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 4,
                  }}>{panelCatData.descriptor}</div>
                </div>
                <button
                  onClick={closePanel}
                  aria-label="Close"
                  style={{
                    background: "none", border: `1px solid ${panelBord}`,
                    borderRadius: 8, width: 36, height: 36,
                    color: panelSec, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = accentClr; e.currentTarget.style.borderColor = accentClr; }}
                  onMouseLeave={e => { e.currentTarget.style.color = panelSec; e.currentTarget.style.borderColor = panelBord; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* ── Section A: What specifically? ────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.6875rem", color: accentClr,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  marginBottom: 12,
                }}>WHAT SPECIFICALLY?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {panelCatData.dishes.map(dish => (
                    <button
                      key={dish}
                      onClick={() => runSearch(dish)}
                      style={{
                        background: accentBg, border: `1.5px solid ${accentBord}`,
                        borderRadius: 24, padding: "10px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.875rem", fontWeight: 600,
                        color: accentClr, cursor: "pointer", minHeight: 44,
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = dark ? "#24433e" : "#2c4a44"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = accentBg; }}
                    >{dish}</button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: panelBord, marginBottom: 20 }} />

              {/* ── Section B: Distance ──────────────────────────────────── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.6875rem", color: accentClr,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  marginBottom: 10,
                }}>HOW FAR?</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DISTANCES.map(d => {
                    const sel = selDist === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setSelDist(sel ? "" : d)}
                        style={{
                          background: sel ? accentClr : panelBg,
                          border: `1.5px solid ${sel ? accentClr : panelBord}`,
                          borderRadius: 20, padding: "8px 16px",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.875rem", fontWeight: sel ? 600 : 400,
                          color: sel ? (dark ? "#0A0A0A" : "#FFFFFF") : panelSec,
                          cursor: "pointer", minHeight: 40,
                          transition: "all 0.15s",
                        }}
                      >{d}</button>
                    );
                  })}
                </div>
              </div>

              {/* ── Section C: Price ─────────────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.6875rem", color: accentClr,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  marginBottom: 10,
                }}>BUDGET?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {PRICES.map(p => {
                    const sel = selPrice === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setSelPrice(sel ? "" : p)}
                        style={{
                          background: sel ? accentClr : panelBg,
                          border: `1.5px solid ${sel ? accentClr : panelBord}`,
                          borderRadius: 20, padding: "8px 18px",
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "0.875rem", fontWeight: sel ? 700 : 400,
                          color: sel ? (dark ? "#0A0A0A" : "#FFFFFF") : panelSec,
                          cursor: "pointer", minHeight: 40,
                          transition: "all 0.15s",
                        }}
                      >{p}</button>
                    );
                  })}
                </div>
              </div>

              {/* ── Search all button ─────────────────────────────────────── */}
              <button
                onClick={() => runCategorySearch(panelCatData.id)}
                style={{
                  width: "100%", background: accentClr, border: "none",
                  borderRadius: 12, padding: "15px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "1rem", fontWeight: 600,
                  color: dark ? "#0A0A0A" : "#FFFFFF",
                  cursor: "pointer", minHeight: 52,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                Search all {panelCatData.id}
                {(selDist || selPrice) && (
                  <span style={{ fontSize: "0.8rem", opacity: 0.8, marginLeft: 6 }}>
                    {[selDist, selPrice].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
