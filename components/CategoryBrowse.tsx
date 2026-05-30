'use client';
import { useState, useEffect } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "American",      descriptor: "Burgers, BBQ, comfort",          icon: "american"      },
  { id: "Mexican",       descriptor: "Tacos, burritos, regional",       icon: "mexican"       },
  { id: "Japanese",      descriptor: "Ramen, sushi, izakaya",           icon: "japanese"      },
  { id: "Italian",       descriptor: "Pasta, pizza, regional",          icon: "italian"       },
  { id: "Korean",        descriptor: "BBQ, fried chicken, stews",       icon: "korean"        },
  { id: "Asian",         descriptor: "Chinese, Thai, Vietnamese",       icon: "asian"         },
  { id: "Mediterranean", descriptor: "Greek, Lebanese, Turkish",        icon: "mediterranean" },
  { id: "Indian",        descriptor: "Regional, street food, curries",  icon: "indian"        },
  { id: "Seafood",       descriptor: "Fresh catch, raw bar, coastal",   icon: "seafood"       },
  { id: "BBQ & Smoked",  descriptor: "Brisket, ribs, low and slow",     icon: "bbq"           },
  { id: "Breakfast",     descriptor: "Morning only, all day, brunch",   icon: "breakfast"     },
  { id: "Late Night",    descriptor: "Open past midnight",              icon: "latenight"     },
  { id: "Pizza",         descriptor: "Neapolitan, NY, Detroit, more",   icon: "pizza"         },
  { id: "Burgers",       descriptor: "Smash, pub, gourmet, wagyu",      icon: "burgers"       },
  { id: "Vegetarian",    descriptor: "Plant-based, meat-free",          icon: "vegetarian"    },
  { id: "Desserts",      descriptor: "Ice cream, pastry, sweets",       icon: "desserts"      },
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
    cardBg:       dark ? "#1A1A1A" : "#FFFFFF",
    cardBorder:   dark ? "#2C2C2C" : "#E8E3DC",
    text:         dark ? "#F0EDE8" : "#1C1917",
    secondary:    dark ? "#9A9390" : "#6B6560",
    tertiary:     dark ? "#6B6866" : "#A89F99",
    accent:       dark ? "#FFB800" : "#C8860A",
    accentLight:  dark ? "#2A2010" : "#FDF3E3",
    accentBorder: dark ? "#4A3810" : "#F0D5A0",
    shadow1:      dark
      ? "0 1px 3px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.20)"
      : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    shadow2:      dark
      ? "0 4px 12px rgba(0,0,0,0.40), 0 2px 4px rgba(0,0,0,0.30)"
      : "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
  };
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
// All icons: 24×24 viewBox, monoline stroke, no emoji, no fills except noted.

const SVG = (children: React.ReactNode) => (
  <svg
    width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
  >{children}</svg>
);

const ICONS: Record<string, React.ReactNode> = {
  // Knife and fork — classic diner silverware
  american: SVG(
    <>
      <line x1="8"  y1="3"  x2="8"  y2="9"  />
      <line x1="10" y1="3"  x2="10" y2="9"  />
      <line x1="6"  y1="3"  x2="6"  y2="9"  />
      <path d="M6 9 Q8 12 8 21"             />
      <path d="M16 3 C16 3 18 5 17 9 L16 9 L16 21" />
    </>
  ),
  // Taco shell — V with curved base and filling
  mexican: SVG(
    <>
      <path d="M4 19 Q12 3 20 19"           />
      <path d="M7.5 14.5 Q12 12.5 16.5 14.5"/>
      <line x1="8" y1="17.5" x2="16" y2="17.5" />
    </>
  ),
  // Two chopsticks — parallel diagonals
  japanese: SVG(
    <>
      <line x1="7"  y1="4" x2="11" y2="20" />
      <line x1="12" y1="4" x2="16" y2="20" />
      <path d="M7 4 Q9 3 11 4"              />
      <path d="M12 4 Q14 3 16 4"            />
    </>
  ),
  // Fork + pasta spiral
  italian: SVG(
    <>
      <line x1="8"  y1="3" x2="8"  y2="10" />
      <line x1="10" y1="3" x2="10" y2="10" />
      <line x1="12" y1="3" x2="12" y2="10" />
      <path d="M8 10 Q10 13 10 21"          />
      <path d="M15 8 Q19 8 19 12 Q19 16 15 16 Q12 16 13 13"/>
    </>
  ),
  // Grill grate — grid of bars
  korean: SVG(
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <line x1="3"  y1="10" x2="21" y2="10" />
      <line x1="3"  y1="14" x2="21" y2="14" />
      <line x1="8"  y1="6"  x2="8"  y2="18" />
      <line x1="14" y1="6"  x2="14" y2="18" />
    </>
  ),
  // Bowl with two chopsticks
  asian: SVG(
    <>
      <path d="M4 10 Q4 19 12 19 Q20 19 20 10" />
      <line x1="4"  y1="10" x2="20" y2="10"    />
      <line x1="9"  y1="4"  x2="11" y2="10"    />
      <line x1="14" y1="3"  x2="15" y2="10"    />
    </>
  ),
  // Olive branch — curving stem with two leaves
  mediterranean: SVG(
    <>
      <path d="M12 21 Q10 17 11 13 Q12 9 12 5" />
      <path d="M12 14 Q7  12  8  7 Q12 8 12 14" />
      <path d="M12 10 Q17  8 16  4 Q12 5 12 10" />
    </>
  ),
  // Lotus — three curved petals from center
  indian: SVG(
    <>
      <path d="M12 20 C12 20 6 14 6 9 C6 6 9 5 12 9 C15 5 18 6 18 9 C18 14 12 20 12 20Z" />
      <path d="M12 9 C10 12 10 15 12 18 C14 15 14 12 12 9Z" />
      <line x1="12" y1="18" x2="12" y2="20" />
    </>
  ),
  // Simple fish — body, tail, eye
  seafood: SVG(
    <>
      <path d="M2 12 C5 7 10 6 16 12 C10 18 5 17 2 12Z" />
      <path d="M16 12 L21 7 L22 12 L21 17 Z"             />
      <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // Flame — organic curving shape with inner wisp
  bbq: SVG(
    <>
      <path d="M12 2 C9 7 7 10 7 13 C7 17 9 20 12 20 C15 20 17 17 17 13 C17 10 15 7 12 2Z" />
      <path d="M12 10 C11 12 11 14 12 17 C13 14 13 12 12 10Z" />
    </>
  ),
  // Sun — circle with 8 rays
  breakfast: SVG(
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="3"    x2="12" y2="5"    />
      <line x1="12" y1="19"   x2="12" y2="21"   />
      <line x1="3"  y1="12"   x2="5"  y2="12"   />
      <line x1="19" y1="12"   x2="21" y2="12"   />
      <line x1="5.6" y1="5.6" x2="7"  y2="7"    />
      <line x1="17" y1="17"   x2="18.4" y2="18.4"/>
      <line x1="5.6" y1="18.4" x2="7"  y2="17"  />
      <line x1="17" y1="7"    x2="18.4" y2="5.6" />
    </>
  ),
  // Crescent moon
  latenight: SVG(
    <path d="M21 12.8 A9 9 0 1 1 11.2 3 A7 7 0 0 0 21 12.8Z" />
  ),
  // Pizza slice — triangle with three topping circles
  pizza: SVG(
    <>
      <path d="M12 3 L21 20 H3 L12 3Z"            />
      <line x1="7"  y1="20" x2="10" y2="10"        />
      <line x1="17" y1="20" x2="14" y2="10"        />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9"  cy="17" r="1"   fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1"   fill="currentColor" stroke="none" />
    </>
  ),
  // Burger — side view, bun + patty + bun
  burgers: SVG(
    <>
      <path d="M5 9 Q5 5 12 5 Q19 5 19 9"            />
      <line x1="4"  y1="9"  x2="20" y2="9"           />
      <path d="M5 12 Q8 11 12 12 Q16 13 19 12"        />
      <line x1="4"  y1="14" x2="20" y2="14"          />
      <path d="M5 17 Q5 19 12 19 Q19 19 19 17"        />
      <line x1="4"  y1="17" x2="20" y2="17"          />
    </>
  ),
  // Leaf — rounded with center vein
  vegetarian: SVG(
    <>
      <path d="M12 21 C12 21 3 18 3 10 C3 5 8 3 12 3 C16 3 21 5 21 10 C21 18 12 21 12 21Z" />
      <line x1="12" y1="21" x2="12" y2="3" />
      <line x1="12" y1="10" x2="7"  y2="7" />
      <line x1="12" y1="14" x2="17" y2="11"/>
    </>
  ),
  // Ice cream cone — scoop on cone
  desserts: SVG(
    <>
      <path d="M9 13 L12 22 L15 13"                  />
      <path d="M8 13 Q8 5 12 5 Q16 5 16 13Z"         />
      <line x1="8"  y1="13" x2="16" y2="13"          />
      <path d="M10 9 Q11.5 7.5 13 9"                 />
    </>
  ),
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type BrowseProps = {
  onSelect: (dish: string) => void;
  disabled?: boolean;
  dark?: boolean;
};

export function Browse({ onSelect, disabled = false, dark: darkProp }: BrowseProps) {
  const [dark, setDark]     = useState(darkProp ?? false);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Dark mode — use prop or read localStorage
  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  // Clear selected card when search completes
  useEffect(() => {
    if (!disabled) setActive(null);
  }, [disabled]);

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
      border:       `1px solid ${highlight ? t.accent : t.cardBorder}`,
      borderRadius: 12,
      padding:      16,
      cursor:       disabled ? "default" : "pointer",
      boxShadow:    isHovered ? t.shadow2 : t.shadow1,
      transition:   "border-color 0.15s ease-out, box-shadow 0.15s ease-out",
      display:      "flex",
      flexDirection: "column" as const,
      gap:          6,
      opacity:      disabled && !isActive ? 0.6 : 1,
    };
  };

  return (
    <div>
      <style>{`
        .dr-cat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .dr-cat-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .dr-quick-pills {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .dr-quick-pills::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Quick-tap pills ──────────────────────────────────────────────── */}
      <div style={{
        fontFamily: "'Sevastopol', Georgia, serif",
        fontSize: "0.56rem", fontWeight: 400,
        color: t.accent, textTransform: "uppercase",
        letterSpacing: "0.2em", marginBottom: 10,
      }}>RAPID SEARCH PROTOCOLS //</div>
      <div className="dr-quick-pills" style={{ marginBottom: 20 }}>
        {QUICK_SEARCHES.map(q => (
          <button
            key={q}
            onClick={() => handleSelect(q)}
            disabled={disabled}
            style={{
              background:   t.accentLight,
              border:       `1px solid ${t.accentBorder}`,
              borderRadius: 20,
              padding:      "7px 14px",
              fontFamily:   "'Inter', sans-serif",
              fontSize:     "0.8rem",
              fontWeight:   500,
              color:        t.accent,
              cursor:       disabled ? "default" : "pointer",
              whiteSpace:   "nowrap",
              flexShrink:   0,
              transition:   "opacity 0.15s",
              opacity:      disabled ? 0.5 : 1,
              minHeight:    36,
            }}
          >{q}</button>
        ))}
      </div>

      {/* ── Section header ───────────────────────────────────────────────── */}
      <div style={{
        fontFamily:    "'Sevastopol', Georgia, serif",
        fontSize:      "0.625rem",
        fontWeight:    400,
        color:         t.accent,
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        marginBottom:  12,
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
            {/* Icon */}
            <div style={{ color: t.tertiary, lineHeight: 0, marginBottom: 2 }}>
              {ICONS[cat.icon]}
            </div>

            {/* Name */}
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   "0.9rem",
              fontWeight: 600,
              color:      active === cat.id ? t.accent : t.text,
              lineHeight: 1.2,
              transition: "color 0.15s",
            }}>
              {cat.id}
            </div>

            {/* Descriptor */}
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize:   "0.72rem",
              fontWeight: 400,
              color:      t.secondary,
              lineHeight: 1.3,
            }}>
              {cat.descriptor}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
