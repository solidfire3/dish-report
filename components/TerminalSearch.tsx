'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import type { FilterState } from "@/components/SearchBar";

// ─── SUGGESTION MAP ───────────────────────────────────────────────────────────
const SUGGESTION_MAP: [string, string[]][] = [
  ["taco",    ["al pastor", "carne asada", "birria", "near me", "best", "cheap"]],
  ["sushi",   ["omakase", "all you can eat", "nigiri", "near me", "best"]],
  ["pizza",   ["neapolitan", "detroit", "by the slice", "near me", "best"]],
  ["burger",  ["smash", "wagyu", "near me", "best", "cheap"]],
  ["ramen",   ["tonkotsu", "shoyu", "miso", "spicy", "near me", "best"]],
  ["bbq",     ["brisket", "ribs", "burnt ends", "near me", "best"]],
  ["pasta",   ["carbonara", "cacio e pepe", "bolognese", "near me", "best"]],
  ["chicken", ["fried", "korean fried", "nashville hot", "near me", "best"]],
  ["steak",   ["wagyu", "ribeye", "dry aged", "near me", "best"]],
  ["seafood", ["oysters", "ceviche", "fish tacos", "near me", "best"]],
  ["poke",    ["ahi", "salmon", "spicy tuna", "near me", "best"]],
  ["dim sum", ["har gow", "xlb", "near me", "best", "all you can eat"]],
  ["curry",   ["thai", "indian", "japanese", "near me", "best"]],
  ["korean",  ["kbbq", "fried chicken", "bibimbap", "near me", "best"]],
  ["dumpling",["xlb", "gyoza", "potsticker", "near me", "best"]],
  ["brunch",  ["eggs benedict", "pancakes", "near me", "best", "open now"]],
];
const FALLBACK = ["near me", "best", "cheap", "open now", "date night"];

function getSuggestions(q: string): string[] {
  const lower = q.toLowerCase();
  for (const [key, sugs] of SUGGESTION_MAP) {
    if (lower.includes(key)) return sugs;
  }
  return FALLBACK;
}

// ─── FILTER OPTION SETS ───────────────────────────────────────────────────────
const DIST_OPTIONS  = ["1 mi", "2 mi", "5 mi", "10 mi", "Any"];
const MODE_OPTIONS  = ["Dine-in", "Takeout", "Delivery", "Any"];
const PRICE_OPTIONS = ["$", "$$", "$$$", "$$$$", "Any"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const TERMINAL_CSS = `
  @keyframes ts-in {
    from { opacity: 0; transform: scale(0.98); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes ts-out {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.98); }
  }
  @keyframes ts-cursor {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  @keyframes ts-chip {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ts-filters {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ts-chip:hover {
    border-color: #B8780A !important;
    color: #B8780A !important;
    background: #FDF3E3 !important;
  }
  .ts-filter-pill:hover {
    border-color: #B8780A !important;
    color: #B8780A !important;
  }
`;

// ─── PROPS ────────────────────────────────────────────────────────────────────
export type TerminalSearchProps = {
  isOpen: boolean;
  onSearch: (query: string, filters: FilterState) => void;
  onClose: () => void;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export function TerminalSearch({ isOpen, onSearch, onClose }: TerminalSearchProps) {
  const [query,      setQuery]      = useState("");
  const [closing,    setClosing]    = useState(false);
  const [distance,   setDistance]   = useState("Any");
  const [mode,       setMode]       = useState("Any");
  const [price,      setPrice]      = useState("Any");
  const [showFilters,setShowFilters]= useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDistance("Any"); setMode("Any"); setPrice("Any");
      setClosing(false); setShowFilters(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Show filters once user has started typing
  useEffect(() => {
    if (query.length >= 2) setShowFilters(true);
  }, [query]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { onClose(); setClosing(false); }, 280);
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    const filters: FilterState = {
      dineMode: mode === "Dine-in" ? "dine-in"
               : mode === "Takeout"  ? "takeout"
               : mode === "Delivery" ? "delivery"
               : null,
      openNow:    false,
      priceRange: price === "Any" ? [] : [price],
      radius:     distance === "1 mi" ? 1
                : distance === "2 mi" ? 2
                : distance === "5 mi" ? 5
                : distance === "10 mi" ? 10
                : 5,
      timeOfDay: null,
    };
    onSearch(query.trim(), filters);
    handleClose();
  }, [query, mode, price, distance, onSearch, handleClose]);

  const appendChip = (chip: string) => {
    const sep = query.endsWith(" ") ? "" : " ";
    setQuery(q => q + sep + chip);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (!isOpen && !closing) return null;

  const suggestions = query.length >= 2 ? getSuggestions(query) : [];

  return (
    <>
      <style>{TERMINAL_CSS}</style>
      <div
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: "fixed", inset: 0,
          zIndex: 5000,
          background: "#F2EEE8",
          // Subtle dot grid texture — terminal mood
          backgroundImage: `
            radial-gradient(circle, rgba(28,25,23,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
          display: "flex", flexDirection: "column",
          animation: `${closing ? "ts-out" : "ts-in"} 300ms cubic-bezier(0.4,0,0.2,1) both`,
          overflowY: "auto",
        }}
      >
        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "20px 24px 0",
          flexShrink: 0,
        }}>
          {/* Brand + blinking cursor */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1rem", fontWeight: 900, color: "#1C1917",
              letterSpacing: "0.04em", lineHeight: 1,
            }}>DISH REPORT</div>
            <div style={{
              width: 8, height: 16,
              background: "#B8780A",
              animation: "ts-cursor 1.1s step-end infinite",
              borderRadius: 1,
            }} />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Close search"
            style={{
              background: "none", border: "1px solid #D4CBC0",
              borderRadius: 8, width: 36, height: 36,
              color: "#6B6560", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s, color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8780A"; e.currentTarget.style.color = "#B8780A"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#D4CBC0"; e.currentTarget.style.color = "#6B6560"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Main input area ───────────────────────────────────────────── */}
        <div style={{
          flex: "0 0 auto",
          padding: "48px 24px 32px",
          maxWidth: 760, width: "100%", margin: "0 auto",
          boxSizing: "border-box",
        }}>
          {/* Input display — the centrepiece */}
          <div style={{ position: "relative" }}>
            {/* Visual row: › [text] █ */}
            <div
              style={{
                display: "flex", alignItems: "baseline",
                gap: 10, cursor: "text",
                lineHeight: 1.2,
              }}
              onClick={() => inputRef.current?.focus()}
            >
              {/* Amber prompt */}
              <span style={{
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
                fontWeight: 700, color: "#B8780A",
                flexShrink: 0, lineHeight: 1,
              }}>›</span>

              {/* Query text + cursor in one line */}
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                  fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
                  fontWeight: 400, color: "#1C1917",
                  lineHeight: 1, wordBreak: "break-word",
                  minHeight: "clamp(1.75rem, 5vw, 2.5rem)",
                }}>
                  {query || (
                    <span style={{ color: "#A89F99" }}>what are you hungry for?</span>
                  )}
                  {/* Blinking cursor block */}
                  <span style={{
                    display: "inline-block",
                    width: "0.55em", height: "1em",
                    background: "#B8780A",
                    verticalAlign: "text-bottom",
                    marginLeft: 2,
                    animation: "ts-cursor 1.1s step-end infinite",
                    borderRadius: 1,
                  }} />
                </div>

                {/* Transparent real input overlaid */}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Search"
                  style={{
                    position: "absolute", inset: 0,
                    opacity: 0, cursor: "text",
                    fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
                    fontFamily: "'IBM Plex Mono', monospace",
                    background: "none", border: "none", outline: "none",
                    width: "100%", height: "100%",
                    color: "transparent", caretColor: "transparent",
                  }}
                />
              </div>
            </div>

            {/* Underline */}
            <div style={{
              height: 2, background: "#1C1917", opacity: 0.12,
              marginTop: 16, borderRadius: 1,
            }} />
          </div>

          {/* ── Suggestion chips ─────────────────────────────────────────── */}
          {suggestions.length > 0 && (
            <div style={{
              marginTop: 24,
              display: "flex", flexWrap: "wrap", gap: 8,
            }}>
              {suggestions.map((chip, i) => (
                <button
                  key={chip}
                  className="ts-chip"
                  onClick={() => appendChip(chip)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E8E3DC",
                    borderRadius: 20, padding: "7px 14px",
                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                    fontSize: "0.8125rem", color: "#4A4540",
                    cursor: "pointer", whiteSpace: "nowrap",
                    animation: `ts-chip 0.25s ease both`,
                    animationDelay: `${i * 40}ms`,
                    transition: "border-color 0.15s, color 0.15s, background 0.15s",
                  }}
                >{chip}</button>
              ))}
            </div>
          )}

          {/* ── Filters ──────────────────────────────────────────────────── */}
          {showFilters && (
            <div style={{
              marginTop: 28,
              animation: "ts-filters 0.3s ease both",
            }}>
              <div style={{
                display: "flex", gap: 20, flexWrap: "wrap",
                alignItems: "flex-start",
              }}>

                {/* Distance */}
                <div>
                  <div style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.625rem", color: "#B8780A",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    marginBottom: 8,
                  }}>HOW FAR?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {DIST_OPTIONS.map(d => (
                      <button
                        key={d}
                        className="ts-filter-pill"
                        onClick={() => setDistance(d)}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "0.75rem",
                          padding: "6px 12px", borderRadius: 6,
                          cursor: "pointer",
                          border: `1.5px solid ${distance === d ? "#B8780A" : "#D4CBC0"}`,
                          background: distance === d ? "#FDF3E3" : "#FFFFFF",
                          color: distance === d ? "#B8780A" : "#6B6560",
                          fontWeight: distance === d ? 700 : 400,
                          transition: "all 0.15s",
                        }}
                      >{d}</button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <div style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.625rem", color: "#B8780A",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    marginBottom: 8,
                  }}>MODE?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {MODE_OPTIONS.map(m => (
                      <button
                        key={m}
                        className="ts-filter-pill"
                        onClick={() => setMode(m)}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "0.75rem",
                          padding: "6px 12px", borderRadius: 6,
                          cursor: "pointer",
                          border: `1.5px solid ${mode === m ? "#B8780A" : "#D4CBC0"}`,
                          background: mode === m ? "#FDF3E3" : "#FFFFFF",
                          color: mode === m ? "#B8780A" : "#6B6560",
                          fontWeight: mode === m ? 700 : 400,
                          transition: "all 0.15s",
                        }}
                      >{m}</button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.625rem", color: "#B8780A",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    marginBottom: 8,
                  }}>BUDGET?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {PRICE_OPTIONS.map(p => (
                      <button
                        key={p}
                        className="ts-filter-pill"
                        onClick={() => setPrice(p)}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "0.75rem",
                          padding: "6px 12px", borderRadius: 6,
                          cursor: "pointer",
                          border: `1.5px solid ${price === p ? "#B8780A" : "#D4CBC0"}`,
                          background: price === p ? "#FDF3E3" : "#FFFFFF",
                          color: price === p ? "#B8780A" : "#6B6560",
                          fontWeight: price === p ? 700 : 400,
                          transition: "all 0.15s",
                        }}
                      >{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Submit button ─────────────────────────────────────────────── */}
        <div style={{
          padding: "0 24px 40px",
          maxWidth: 760, width: "100%", margin: "0 auto",
          boxSizing: "border-box",
          flexShrink: 0,
        }}>
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            style={{
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              fontSize: "1rem", fontWeight: 700,
              background: query.trim() ? "#B8780A" : "#E8E3DC",
              color: query.trim() ? "#FFFFFF" : "#A89F99",
              border: "none", borderRadius: 10,
              padding: "16px 32px", cursor: query.trim() ? "pointer" : "not-allowed",
              letterSpacing: "0.06em",
              transition: "background 0.2s, color 0.2s",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => { if (query.trim()) e.currentTarget.style.background = "#9A6209"; }}
            onMouseLeave={e => { if (query.trim()) e.currentTarget.style.background = "#B8780A"; }}
          >
            RUN SEARCH ›
          </button>
        </div>

        {/* ── Bottom hint ───────────────────────────────────────────────── */}
        <div style={{
          textAlign: "center", padding: "0 24px 24px",
          fontFamily: "'Sevastopol', Georgia, serif",
          fontSize: "0.5625rem", color: "#C8B8A8",
          textTransform: "uppercase", letterSpacing: "0.2em",
          flexShrink: 0,
        }}>
          Press Enter to search · Esc to close
        </div>
      </div>
    </>
  );
}
