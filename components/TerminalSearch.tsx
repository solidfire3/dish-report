'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import type { FilterState } from "@/components/SearchBar";

// ─── DISH NARROWING MAP ───────────────────────────────────────────────────────
// Sorted longest-first at runtime for best-specificity matching.
// A GENERIC_NARROW fallback guarantees a narrowing row for any food term.
type NarrowEntry = { label: string; options: string[] };

// Dynamic fallback — always shown when no specific match found
const GENERIC_NARROW: NarrowEntry = {
  label: "NARROW IT DOWN",
  options: ["Authentic", "Upscale", "Hole-in-the-Wall", "Best Rated", "Most Popular", "Budget"],
};

const NARROW_MAP: [string, NarrowEntry][] = [
  // ── Specific fillings / dishes (checked before their parent category) ─────
  ["quesabirria", { label: "WHAT FORMAT?",   options: ["Tacos", "Mulitas", "Bowl", "Consomé Only", "Combo"] }],
  ["birria",       { label: "WHAT FORMAT?",   options: ["Tacos", "Quesabirria", "Bowl", "Ramen Birria", "Consomé"] }],
  ["carnitas",     { label: "HOW DO YOU WANT IT?", options: ["Street Tacos", "Burrito", "Bowl", "Torta", "Quesadilla"] }],
  ["al pastor",    { label: "HOW DO YOU WANT IT?", options: ["Street Tacos", "Burrito", "Quesadilla", "Vampiro", "Bowl"] }],
  ["carne asada",  { label: "HOW DO YOU WANT IT?", options: ["Street Tacos", "Burrito", "Fries", "Mulitas", "Bowl"] }],
  ["tonkotsu",     { label: "WHAT RICHNESS?", options: ["Extra Rich", "Classic", "Spicy Tonkotsu", "Black Garlic", "Light"] }],
  ["shoyu",        { label: "WHAT NOODLE?",   options: ["Wavy", "Straight", "Thick", "Thin", "Handmade"] }],
  ["omakase",      { label: "WHAT PRICE RANGE?", options: ["Under $100", "$100–150", "$150–200", "$200+"] }],
  ["wagyu",        { label: "WHAT FORMAT?",   options: ["Steak", "Burger", "Yakiniku", "Hotpot", "Rice Bowl"] }],
  ["brisket",      { label: "WHAT STYLE?",    options: ["Texas Smoked", "Korean", "Jewish Deli", "Sandwich", "Plate"] }],
  // ── Category keywords ─────────────────────────────────────────────────────
  ["dim sum",    { label: "WHAT FOCUS?",      options: ["Har Gow", "XLB Soup", "Pan-fried", "Baked BBQ Pork", "Congee"] }],
  ["sandwich",   { label: "WHAT KIND?",       options: ["Italian Sub", "Banh Mi", "Cubano", "Deli", "Breakfast", "Grilled Cheese"] }],
  ["breakfast",  { label: "WHAT VIBE?",       options: ["Diner", "Brunch Spot", "Cafe", "Taco Spot", "Bakery"] }],
  ["dumpling",   { label: "WHAT TYPE?",       options: ["XLB Soup", "Pan-fried", "Gyoza", "Pierogi", "Momo"] }],
  ["dessert",    { label: "WHAT KIND?",       options: ["Ice Cream", "Bakery", "Pastry", "Asian Dessert", "Pie"] }],
  ["seafood",    { label: "WHAT KIND?",       options: ["Oysters", "Lobster", "Crab", "Ceviche", "Whole Fish", "Raw Bar"] }],
  ["chicken",    { label: "HOW IS IT PREPPED?", options: ["Fried", "Korean Fried", "Nashville Hot", "Grilled", "Rotisserie", "Karaage"] }],
  ["noodle",     { label: "WHICH CUISINE?",   options: ["Chinese", "Japanese", "Thai", "Vietnamese", "Korean", "Italian"] }],
  ["burger",     { label: "WHAT STYLE?",      options: ["Smash", "Classic Pub", "Wagyu", "Gourmet", "Double Smash"] }],
  ["brunch",     { label: "WHAT VIBE?",       options: ["Eggs Benedict", "Pancakes", "Chilaquiles", "Avocado Toast", "Shakshuka"] }],
  ["steak",      { label: "WHAT SETTING?",    options: ["Steakhouse", "Bistro", "Argentinian", "Korean BBQ", "French"] }],
  ["pasta",      { label: "WHAT STYLE?",      options: ["Carbonara", "Cacio e Pepe", "Bolognese", "Seafood", "Baked"] }],
  ["pizza",      { label: "WHAT STYLE?",      options: ["Neapolitan", "NY Slice", "Detroit", "Sicilian", "Deep Dish", "Grandma", "Bar"] }],
  ["curry",      { label: "WHICH CUISINE?",   options: ["Thai", "Indian", "Japanese", "Sri Lankan", "Malaysian"] }],
  ["wings",      { label: "WHAT FLAVOR?",     options: ["Buffalo", "Korean", "Lemon Pepper", "BBQ", "Garlic Parm", "Nashville Hot"] }],
  ["ramen",      { label: "WHAT BROTH?",      options: ["Tonkotsu", "Shoyu", "Miso", "Shio", "Tantanmen", "Tsukemen", "Vegan"] }],
  ["sushi",      { label: "WHAT FORMAT?",     options: ["Omakase", "Nigiri", "AYCE", "Hand Rolls", "Sashimi", "Chirashi"] }],
  ["salad",      { label: "WHAT STYLE?",      options: ["Composed", "Chopped", "Grain Bowl", "Caesar", "Mediterranean"] }],
  ["taco",       { label: "WHAT KIND?",       options: ["Carne Asada", "Al Pastor", "Birria", "Carnitas", "Fish", "Suadero", "Veggie"] }],
  ["poke",       { label: "WHAT BASE?",       options: ["Ahi", "Salmon", "Spicy Tuna", "Shrimp", "Mixed"] }],
  ["bbq",        { label: "WHAT REGION?",     options: ["Texas", "Kansas City", "Carolina", "Memphis", "Korean", "Hawaiian"] }],
  ["pho",        { label: "WHAT KIND?",       options: ["Beef (Tai)", "Brisket", "Meatball", "Chicken", "Veggie", "Combination"] }],
];

// Sorted longest-key-first so "dim sum" beats "sum", "sandwich" beats "and", etc.
const NARROW_MAP_SORTED = [...NARROW_MAP].sort((a, b) => b[0].length - a[0].length);

// Always returns a narrowing entry — specific match or generic fallback.
// Filters out options the user has already typed so narrowing always moves forward.
function getNarrowing(q: string): NarrowEntry {
  const lower = q.toLowerCase();
  let matched: NarrowEntry = GENERIC_NARROW;
  for (const [key, entry] of NARROW_MAP_SORTED) {
    if (lower.includes(key)) { matched = entry; break; }
  }
  // Remove options already present in the query (case-insensitive)
  const filtered = matched.options.filter(opt => !lower.includes(opt.toLowerCase()));
  // If all options were filtered, fall back to GENERIC_NARROW (filtered too)
  const finalOptions = filtered.length > 0
    ? filtered
    : GENERIC_NARROW.options.filter(opt => !lower.includes(opt.toLowerCase()));
  return { label: matched.label, options: finalOptions.length > 0 ? finalOptions : matched.options };
}

// ─── ADD-ON SUGGESTION MAP (richer pools, change 3) ──────────────────────────
const SUGGESTION_MAP: [string, string[]][] = [
  ["taco",    ["al pastor", "carne asada", "birria", "near me", "best in the city", "authentic", "hole-in-the-wall", "late night", "cheap"]],
  ["sushi",   ["omakase", "all you can eat", "nigiri bar", "near me", "best", "upscale", "date night", "BYO"]],
  ["pizza",   ["neapolitan", "detroit style", "by the slice", "near me", "best", "cheap", "late night", "wood fired"]],
  ["burger",  ["smash burger", "wagyu", "near me", "best", "cheap", "double smash", "upscale", "late night"]],
  ["ramen",   ["tonkotsu", "shoyu", "spicy", "near me", "best", "authentic", "open late", "date night"]],
  ["bbq",     ["brisket", "ribs", "burnt ends", "near me", "best", "cheap", "Texas style", "takeout"]],
  ["pasta",   ["carbonara", "cacio e pepe", "bolognese", "near me", "best", "authentic", "date night", "fresh pasta"]],
  ["chicken", ["fried", "korean fried", "nashville hot", "near me", "best", "cheap", "takeout", "late night"]],
  ["steak",   ["wagyu", "ribeye", "dry aged", "near me", "best", "date night", "upscale", "group dinner"]],
  ["seafood", ["oysters", "ceviche", "fish tacos", "near me", "best", "fresh catch", "raw bar", "date night"]],
  ["poke",    ["ahi", "salmon", "spicy tuna", "near me", "best", "cheap", "healthy", "quick lunch"]],
  ["dim sum", ["har gow", "xlb", "near me", "best", "all you can eat", "weekend brunch", "group"]],
  ["curry",   ["thai", "indian", "japanese", "near me", "best", "spicy", "authentic", "cheap"]],
  ["korean",  ["kbbq", "fried chicken", "bibimbap", "near me", "best", "late night", "group dinner", "authentic"]],
  ["dumpling",["xlb", "gyoza", "potsticker", "near me", "best", "steamed", "pan-fried", "cheap"]],
  ["brunch",  ["eggs benedict", "pancakes", "near me", "best", "open now", "outdoor seating", "no wait", "group"]],
];

// Richer fallback for unmatched queries
const FALLBACK = [
  "near me", "best in the city", "cheap eats", "open now",
  "date night", "group friendly", "late night", "quick lunch",
  "outdoor seating", "authentic", "hole-in-the-wall",
];

function getSuggestions(q: string): string[] {
  const lower = q.toLowerCase();
  for (const [key, sugs] of SUGGESTION_MAP) {
    if (lower.includes(key)) return sugs;
  }
  return FALLBACK;
}

// ─── FILTER OPTION SETS (unchanged) ──────────────────────────────────────────
const DIST_OPTIONS  = ["1 mi", "2 mi", "5 mi", "10 mi", "Any"];
const MODE_OPTIONS  = ["Dine-in", "Takeout", "Delivery", "Any"];
const PRICE_OPTIONS = ["$", "$$", "$$$", "$$$$", "Any"];

// ─── CSS (unchanged) ──────────────────────────────────────────────────────────
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
  @keyframes ts-confirm-pulse {
    0%   { opacity: 0.12; }
    50%  { opacity: 0.5; }
    100% { opacity: 0.12; }
  }
  @keyframes ts-refine-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ts-chip:hover {
    border-color: #7fe3c8 !important;
    color: #7fe3c8 !important;
    background: #1b332e !important;
  }
  .ts-filter-pill:hover {
    border-color: #7fe3c8 !important;
    color: #7fe3c8 !important;
  }
`;

// ─── PROPS ────────────────────────────────────────────────────────────────────
export type TerminalSearchProps = {
  isOpen: boolean;
  onSearch: (query: string, filters: FilterState) => void;
  onClose: () => void;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
type SuggestItem = { label: string; search_id?: string | null; run_count?: number; source: "mine" | "popular" };

export function TerminalSearch({ isOpen, onSearch, onClose }: TerminalSearchProps) {
  const [query,               setQuery]               = useState("");
  const [closing,             setClosing]             = useState(false);
  const [distance,            setDistance]            = useState("Any");
  const [mode,                setMode]                = useState("Any");
  const [price,               setPrice]               = useState("Any");
  const [confirmPulse, setConfirmPulse] = useState(false);
  const [suggestions,  setSuggestions]  = useState<SuggestItem[]>([]);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery(""); setSuggestions([]);
      setDistance("Any"); setMode("Any"); setPrice("Any");
      setClosing(false); setConfirmPulse(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Debounced typeahead — fetch prior searches matching the query
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (query.length < 2) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: query }),
        });
        const json = await res.json();
        setSuggestions(json.suggestions ?? []);
      } catch { setSuggestions([]); }
    }, 280);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [query]);

  // Escape closes
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

  // Enter: amber pulse feedback, never submits — RUN SEARCH is the only submit path
  const handleEnter = useCallback(() => {
    setConfirmPulse(true);
    setTimeout(() => setConfirmPulse(false), 400);
    inputRef.current?.focus();
  }, []);

  // Add-on suggestion chip (appended after query)
  const appendChip = (chip: string) => {
    const sep = query.endsWith(" ") ? "" : " ";
    setQuery(q => q + sep + chip);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // CHANGE 2: Narrowing chip (prepended before query, e.g. "tacos" + "Birria" → "Birria tacos")
  const prependNarrowChip = (chip: string) => {
    setQuery(q => `${chip} ${q.trim()}`);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (!isOpen && !closing) return null;

  // All refinements appear immediately at 2+ chars — no Enter required
  const showRefinements = query.length >= 2;
  const narrowEntry     = showRefinements ? getNarrowing(query) : GENERIC_NARROW;
  const addOnChips      = showRefinements ? getSuggestions(query) : [];

  return (
    <>
      <style>{TERMINAL_CSS}</style>
      <div
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 5000,
          background: "#F2EEE8",
          backgroundImage: "radial-gradient(circle, rgba(28,25,23,0.07) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          display: "flex", flexDirection: "column",
          animation: `${closing ? "ts-out" : "ts-in"} 300ms cubic-bezier(0.4,0,0.2,1) both`,
          overflowY: "auto",
        }}
      >
        {/* ── Top bar (unchanged) ───────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "var(--font-orbitron), 'Courier New', monospace", fontSize: "1rem", fontWeight: 900, color: "#1C1917", letterSpacing: "0.04em", lineHeight: 1 }}>
              DISH REPORT
            </div>
            <div style={{ width: 8, height: 16, background: "#7fe3c8", animation: "ts-cursor 1.1s step-end infinite", borderRadius: 1 }} />
          </div>
          <button onClick={handleClose} aria-label="Close search"
            style={{ background: "none", border: "1px solid #D4CBC0", borderRadius: 8, width: 36, height: 36, color: "#6B6560", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.15s, color 0.15s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7fe3c8"; e.currentTarget.style.color = "#7fe3c8"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#D4CBC0"; e.currentTarget.style.color = "#6B6560"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Main input area ───────────────────────────────────────────── */}
        <div style={{ flex: "0 0 auto", padding: "48px 24px 24px", maxWidth: 760, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          {/* Input display — unchanged visual */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "text", lineHeight: 1.2 }} onClick={() => inputRef.current?.focus()}>
              <span style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 700, color: "#7fe3c8", flexShrink: 0, lineHeight: 1 }}>›</span>
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 400, color: "#1C1917", lineHeight: 1, wordBreak: "break-word", minHeight: "clamp(1.75rem, 5vw, 2.5rem)" }}>
                  {query || <span style={{ color: "#A89F99" }}>what are you hungry for?</span>}
                  <span style={{ display: "inline-block", width: "0.55em", height: "1em", background: "#7fe3c8", verticalAlign: "text-bottom", marginLeft: 2, animation: "ts-cursor 1.1s step-end infinite", borderRadius: 1 }} />
                </div>
                {/* CHANGE 1: Enter triggers handleEnter (not handleSubmit) */}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEnter();
                    }
                  }}
                  autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Search"
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "text", fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontFamily: "'IBM Plex Mono', monospace", background: "none", border: "none", outline: "none", width: "100%", height: "100%", color: "transparent", caretColor: "transparent" }}
                />
              </div>
            </div>
            {/* Underline — pulses amber briefly on Enter */}
            <div style={{
              height: 2, marginTop: 16, borderRadius: 1,
              background: confirmPulse ? "#7fe3c8" : "#1C1917",
              opacity: confirmPulse ? 0.5 : 0.12,
              transition: "background 0.15s, opacity 0.15s",
            }} />
          </div>

          {/* ── Refinements — appear immediately at 2+ chars ─────────────── */}
          {showRefinements && (
            <div style={{ marginTop: 24, animation: "ts-refine-in 0.3s ease both" }}>

              {/* NARROW IT DOWN — specific category match or generic fallback */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
                  NARROW IT DOWN // {narrowEntry.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {narrowEntry.options.map((opt, i) => (
                    <button
                      key={opt}
                      className="ts-chip"
                      onClick={() => prependNarrowChip(opt)}
                      style={{
                        background: "#1b332e", border: "1.5px solid #2c4a44",
                        borderRadius: 20, padding: "7px 14px",
                        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                        fontSize: "0.8125rem", color: "#7fe3c8",
                        cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600,
                        animation: "ts-chip 0.25s ease both",
                        animationDelay: `${i * 35}ms`,
                        transition: "border-color 0.15s, color 0.15s, background 0.15s",
                      }}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* TRY ADDING — contextual add-on suggestions */}
              {addOnChips.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#A89F99", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
                    TRY ADDING
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {addOnChips.map((chip, i) => (
                      <button
                        key={chip}
                        className="ts-chip"
                        onClick={() => appendChip(chip)}
                        style={{
                          background: "#FFFFFF", border: "1px solid #E8E3DC",
                          borderRadius: 20, padding: "7px 14px",
                          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                          fontSize: "0.8125rem", color: "#4A4540",
                          cursor: "pointer", whiteSpace: "nowrap",
                          animation: "ts-chip 0.25s ease both",
                          animationDelay: `${narrowEntry.options.length * 35 + i * 35}ms`,
                          transition: "border-color 0.15s, color 0.15s, background 0.15s",
                        }}
                      >{chip}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIOR SEARCHES — typeahead from DB (Piece 2) */}
              {suggestions.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
                    PRIOR SEARCHES
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={s.label + i}
                        className="ts-chip"
                        onClick={() => {
                          onSearch(s.label, {
                            dineMode: null, openNow: false, priceRange: [],
                            radius: 5, timeOfDay: null,
                          });
                          handleClose();
                        }}
                        style={{
                          background: s.source === "mine" ? "#1b332e" : "#FFFFFF",
                          border: `1.5px solid ${s.source === "mine" ? "#2c4a44" : "#E8E3DC"}`,
                          borderRadius: 20, padding: "7px 14px",
                          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                          fontSize: "0.8125rem",
                          color: s.source === "mine" ? "#7fe3c8" : "#4A4540",
                          cursor: "pointer", whiteSpace: "nowrap",
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "border-color 0.15s",
                        }}
                      >
                        {s.source === "mine" && (
                          <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>↩</span>
                        )}
                        {s.label}
                        {s.run_count != null && s.run_count > 1 && (
                          <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>×{s.run_count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* HOW FAR / MODE / BUDGET */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>HOW FAR?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {DIST_OPTIONS.map(d => (
                      <button key={d} className="ts-filter-pill" onClick={() => setDistance(d)}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", padding: "6px 12px", borderRadius: 6, cursor: "pointer", border: `1.5px solid ${distance === d ? "#7fe3c8" : "#D4CBC0"}`, background: distance === d ? "#1b332e" : "#FFFFFF", color: distance === d ? "#7fe3c8" : "#6B6560", fontWeight: distance === d ? 700 : 400, transition: "all 0.15s" }}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>MODE?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {MODE_OPTIONS.map(m => (
                      <button key={m} className="ts-filter-pill" onClick={() => setMode(m)}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", padding: "6px 12px", borderRadius: 6, cursor: "pointer", border: `1.5px solid ${mode === m ? "#7fe3c8" : "#D4CBC0"}`, background: mode === m ? "#1b332e" : "#FFFFFF", color: mode === m ? "#7fe3c8" : "#6B6560", fontWeight: mode === m ? 700 : 400, transition: "all 0.15s" }}
                      >{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>BUDGET?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {PRICE_OPTIONS.map(p => (
                      <button key={p} className="ts-filter-pill" onClick={() => setPrice(p)}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", padding: "6px 12px", borderRadius: 6, cursor: "pointer", border: `1.5px solid ${price === p ? "#7fe3c8" : "#D4CBC0"}`, background: price === p ? "#1b332e" : "#FFFFFF", color: price === p ? "#7fe3c8" : "#6B6560", fontWeight: price === p ? 700 : 400, transition: "all 0.15s" }}
                      >{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RUN SEARCH button — more prominent once query exists ──────── */}
        <div style={{ padding: "8px 24px 40px", maxWidth: 760, width: "100%", margin: "0 auto", boxSizing: "border-box", flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            style={{
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              fontSize: "1rem", fontWeight: 700,
              background: query.trim() ? "#7fe3c8" : "#E8E3DC",
              color: query.trim() ? "#FFFFFF" : "#A89F99",
              border: query.trim() ? "2px solid #5ccfb0" : "2px solid transparent",
              borderRadius: 10,
              padding: "16px 32px",
              cursor: query.trim() ? "pointer" : "not-allowed",
              letterSpacing: "0.06em",
              transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
              display: "flex", alignItems: "center", gap: 8,
              // Subtle glow when active to make it visually obvious
              boxShadow: query.trim() ? "0 4px 16px rgba(184,120,10,0.25)" : "none",
              width: "100%", justifyContent: "center",
            }}
            onMouseEnter={e => { if (query.trim()) { e.currentTarget.style.background = "#5ccfb0"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(184,120,10,0.35)"; } }}
            onMouseLeave={e => { if (query.trim()) { e.currentTarget.style.background = "#7fe3c8"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(184,120,10,0.25)"; } }}
          >
            RUN SEARCH ›
          </button>
        </div>

        {/* Hint text */}
        <div style={{ textAlign: "center", padding: "0 24px 24px", fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.5625rem", color: "#C8B8A8", textTransform: "uppercase", letterSpacing: "0.2em", flexShrink: 0 }}>
          {showRefinements
            ? "Tap RUN SEARCH to launch · Esc to close"
            : "Type what you're hungry for · Esc to close"}
        </div>
      </div>
    </>
  );
}
