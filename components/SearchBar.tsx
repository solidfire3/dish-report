'use client';
import { useState, useEffect, useRef } from "react";

import type { ConfirmMatch, NarrowQuestion } from "@/lib/types";

// ─── FILTER STATE ─────────────────────────────────────────────────────────────
export type FilterState = {
  dineMode: "dine-in" | "takeout" | "delivery" | null;
  openNow: boolean;
  priceRange: string[];
  radius: number;
  timeOfDay: "Breakfast" | "Lunch" | "Dinner" | "Late Night" | null;
};

export const DEFAULT_FILTERS: FilterState = {
  dineMode: null, openNow: false, priceRange: [], radius: 5, timeOfDay: null,
};

// ─── SPELLCHECK ───────────────────────────────────────────────────────────────
const CORRECTIONS: Record<string, string> = {
  ramem: "ramen", ramin: "ramen", rammen: "ramen",
  suhsi: "sushi", susshi: "sushi",
  carintas: "carnitas", carniatas: "carnitas",
  biria: "birria", biriria: "birria",
  burguer: "burger", borger: "burger",
  piza: "pizza", pizzza: "pizza",
  burito: "burrito", burritto: "burrito",
  gyosa: "gyoza", gyozo: "gyoza",
  tonkatsu: "tonkotsu",
  paela: "paella",
  seviche: "ceviche",
  "ban mi": "banh mi",
  briscket: "brisket",
  omokase: "omakase", onikase: "omakase",
  japenese: "Japanese", japanesse: "Japanese",
  mexcian: "Mexican",
  itallian: "Italian", italain: "Italian",
  mediteranian: "Mediterranean",
  koreon: "Korean",
  indain: "Indian",
};

function spellCheck(q: string): string | null {
  const lower = q.toLowerCase().trim();
  for (const [wrong, correct] of Object.entries(CORRECTIONS)) {
    if (lower === wrong) return correct;
    if (lower.includes(wrong)) {
      const fixed = lower.replace(wrong, correct);
      if (fixed !== lower) return fixed.charAt(0).toUpperCase() + fixed.slice(1);
    }
  }
  return null;
}

// ─── THEME ────────────────────────────────────────────────────────────────────
function th(dark: boolean) {
  return {
    inputBg:       dark ? "#232323" : "#FFFFFF",
    inputBorder:   dark ? "#3A3A3A" : "#D4CBC0",
    focusBorder:   dark ? "#FFB800" : "#C8860A",
    focusShadow:   dark ? "0 0 0 3px #2A2010" : "0 0 0 3px #FDF3E3",
    text:          dark ? "#F0EDE8" : "#1C1917",
    placeholder:   dark ? "#4A4846" : "#8B8380",
    secondary:     dark ? "#9A9390" : "#6B6560",
    tertiary:      dark ? "#6B6866" : "#A89F99",
    accent:        dark ? "#FFB800" : "#C8860A",
    accentHover:   dark ? "#FFC933" : "#A86E08",
    accentLight:   dark ? "#2A2010" : "#FDF3E3",
    accentBorder:  dark ? "#4A3810" : "#F0D5A0",
    sheetBg:       dark ? "#1A1A1A" : "#FFFFFF",
    sheetBorder:   dark ? "#2C2C2C" : "#E8E3DC",
    sheetBorder2:  dark ? "#3A3A3A" : "#D4CBC0",
    pillBg:        "#FDF3E3",
    pillBorder:    "#F0D5A0",
    pillText:      "#C8860A",
    pillBgDark:    "#2A2010",
    pillBorderDark:"#4A3810",
    pillTextDark:  "#FFB800",
    optionHover:   dark ? "#232323" : "#F7F4F0",
    errorText:     dark ? "#EF4444" : "#991B1B",
    errorHover:    dark ? "#2D1B1B" : "#FEF2F2",
  };
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FilterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </svg>
);
const XLarge = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const XSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── FILTER SHEET ─────────────────────────────────────────────────────────────
function FilterSheet({
  filters, onChange, onClose, dark,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClose: () => void;
  dark: boolean;
}) {
  const [local, setLocal] = useState<FilterState>(filters);
  const t = th(dark);
  const u = (patch: Partial<FilterState>) => setLocal(f => ({ ...f, ...patch }));

  const togglePrice = (p: string) =>
    u({ priceRange: local.priceRange.includes(p) ? local.priceRange.filter(x => x !== p) : [...local.priceRange, p] });

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label} onClick={onClick}
      style={{
        border: `1.5px solid ${active ? t.focusBorder : t.sheetBorder2}`,
        background: active ? t.accentLight : t.sheetBg,
        color: active ? t.accent : t.secondary,
        fontFamily: "'Inter', sans-serif", fontSize: "0.9rem",
        fontWeight: active ? 600 : 400,
        padding: "9px 18px", cursor: "pointer", borderRadius: 24,
        transition: "all 0.15s", minHeight: 44, whiteSpace: "nowrap",
      }}
    >{label}</button>
  );

  const sectionLabel = (text: string) => (
    <div style={{
      fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600,
      color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.08em",
      marginBottom: 10,
    }}>{text}</div>
  );

  return (
    <>
      <style>{`
        .dr-fs-backdrop {
          position: fixed; inset: 0;
          background: ${dark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.35)"};
          z-index: 9000;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .dr-fs-panel {
          background: ${t.sheetBg};
          border-top: 1px solid ${t.sheetBorder};
          border-left: 1px solid ${t.sheetBorder};
          border-right: 1px solid ${t.sheetBorder};
          border-radius: 16px 16px 0 0;
          width: 100%; max-width: 540px;
          padding: 20px 20px 40px;
          max-height: 85vh; overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }
        @media (min-width: 641px) {
          .dr-fs-backdrop {
            background: transparent;
            position: absolute;
            inset: auto;
            top: calc(100% + 6px);
            right: 0; left: auto;
            z-index: 9000;
            display: block;
          }
          .dr-fs-panel {
            position: relative;
            border: 1px solid ${t.sheetBorder};
            border-radius: 12px;
            width: 400px; max-width: 400px;
            max-height: 70vh;
            animation: fadeIn 0.15s ease;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08);
          }
        }
      `}</style>

      {/* Screen-level click-to-close on mobile */}
      <div className="dr-fs-backdrop" onClick={onClose}>
        <div className="dr-fs-panel" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.05rem", fontWeight: 600, color: t.text }}>Filters</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => setLocal(DEFAULT_FILTERS)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  color: t.accent, fontWeight: 500, padding: 0,
                }}
              >Clear all</button>
              <button
                onClick={onClose}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: t.secondary, padding: 4, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  minWidth: 32, minHeight: 32,
                }}
              ><XLarge /></button>
            </div>
          </div>

          {/* Service type */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("Service type")}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["dine-in", "takeout", "delivery"] as const).map(m =>
                pill(
                  m.charAt(0).toUpperCase() + m.slice(1),
                  local.dineMode === m,
                  () => u({ dineMode: local.dineMode === m ? null : m })
                )
              )}
            </div>
          </div>

          {/* Availability */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("Availability")}
            {pill("Open now", local.openNow, () => u({ openNow: !local.openNow }))}
          </div>

          {/* Price */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("Price range")}
            <div style={{ display: "flex", gap: 8 }}>
              {["$", "$$", "$$$", "$$$$"].map(p =>
                pill(p, local.priceRange.includes(p), () => togglePrice(p))
              )}
            </div>
          </div>

          {/* Radius */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("Distance")}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[0.5, 1, 2, 5, 10, 25].map(r =>
                pill(`${r} mi`, local.radius === r, () => u({ radius: r }))
              )}
            </div>
          </div>

          {/* Time of day */}
          <div style={{ marginBottom: 28 }}>
            {sectionLabel("Time of day")}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["Breakfast", "Lunch", "Dinner", "Late Night"] as const).map(tod =>
                pill(tod, local.timeOfDay === tod, () => u({ timeOfDay: local.timeOfDay === tod ? null : tod }))
              )}
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={() => { onChange(local); onClose(); }}
            style={{
              width: "100%", background: t.accent, border: "none",
              borderRadius: 10, color: "#FFFFFF",
              fontFamily: "'Inter', sans-serif", fontSize: "1rem",
              fontWeight: 600, padding: "14px", cursor: "pointer",
              minHeight: 52, transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
          >Apply</button>
        </div>
      </div>
    </>
  );
}

// ─── FILTER TAGS ──────────────────────────────────────────────────────────────
function FilterTags({
  filters, onChange, dark,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  dark: boolean;
}) {
  const tags: { label: string; onRemove: () => void }[] = [];
  const pillBg     = dark ? "#2A2010" : "#FDF3E3";
  const pillBorder = dark ? "#4A3810" : "#F0D5A0";
  const pillColor  = dark ? "#FFB800" : "#C8860A";

  if (filters.dineMode)
    tags.push({ label: filters.dineMode.charAt(0).toUpperCase() + filters.dineMode.slice(1), onRemove: () => onChange({ ...filters, dineMode: null }) });
  if (filters.openNow)
    tags.push({ label: "Open now", onRemove: () => onChange({ ...filters, openNow: false }) });
  filters.priceRange.forEach(p =>
    tags.push({ label: p, onRemove: () => onChange({ ...filters, priceRange: filters.priceRange.filter(x => x !== p) }) })
  );
  if (filters.timeOfDay)
    tags.push({ label: filters.timeOfDay, onRemove: () => onChange({ ...filters, timeOfDay: null }) });
  if (filters.radius !== 5)
    tags.push({ label: `${filters.radius} mi`, onRemove: () => onChange({ ...filters, radius: 5 }) });

  if (!tags.length) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {tags.map((tag, i) => (
        <div
          key={i}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: pillBg, border: `1px solid ${pillBorder}`,
            color: pillColor,
            fontFamily: "'Inter', sans-serif", fontSize: "0.825rem",
            fontWeight: 500, padding: "4px 10px 4px 12px",
            borderRadius: 20, animation: "fadeIn 0.15s ease",
          }}
        >
          {tag.label}
          <button
            onClick={tag.onRemove}
            aria-label={`Remove ${tag.label} filter`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: pillColor, padding: 0,
              display: "flex", alignItems: "center",
              minWidth: 18, minHeight: 18,
            }}
          ><XSmall /></button>
        </div>
      ))}
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────
export type SearchBarProps = {
  onSearch: (query: string, filters: FilterState) => void;
  onStop?: () => void;
  isSearching?: boolean;
  dark?: boolean;
  initialQuery?: string;
  initialFilters?: Partial<FilterState>;
  // Legacy props — kept so page.tsx compiles during progressive redesign
  dish?: string;
  onDishChange?: (d: string) => void;
  canSearch?: boolean;
  isIdle?: boolean;
};

export function SearchBar({
  onSearch,
  onStop,
  isSearching = false,
  dark: darkProp,
  initialQuery = "",
  initialFilters,
  dish,
}: SearchBarProps) {
  // Dark mode: use prop if provided, else read localStorage
  const [dark, setDark] = useState(darkProp ?? false);
  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  // Sync with legacy dish prop so page.tsx controlled value is respected
  const [query, setQuery] = useState(dish ?? initialQuery);
  useEffect(() => { if (dish !== undefined) setQuery(dish); }, [dish]);

  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [focused, setFocused]         = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestion, setSuggestion]   = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const t = th(dark);

  const fireSearch = (q: string) => {
    setSuggestion(null);
    onSearch(q.trim(), filters);
  };

  const handleSubmit = () => {
    const q = query.trim();
    if (!q || isSearching) return;
    const found = spellCheck(q);
    if (found && found.toLowerCase() !== q.toLowerCase()) {
      setSuggestion(found);
    } else {
      fireSearch(q);
    }
  };

  const handleChange = (v: string) => {
    setQuery(v);
    if (suggestion) setSuggestion(null);
  };

  const clearQuery = () => {
    setQuery("");
    setSuggestion(null);
    inputRef.current?.focus();
  };

  const activeCount = [
    filters.dineMode,
    filters.openNow ? "open" : null,
    ...filters.priceRange,
    filters.timeOfDay,
    filters.radius !== 5 ? "r" : null,
  ].filter(Boolean).length;

  const borderColor = focused ? t.focusBorder : t.inputBorder;
  const boxShadow   = focused ? t.focusShadow : "none";

  return (
    <div style={{ width: "100%", position: "relative" }}>

      {/* ── Placeholder color ────────────────────────────────────────────── */}
      <style>{`
        .dr-search-input::placeholder { color: ${t.placeholder}; }
      `}</style>

      {/* ── Bar row (bar + ANALYZING indicator) ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

      {/* ── Main bar ────────────────────────────────────────────────────── */}
      <div
        className="dr-search-bar"
        style={{
          display: "flex", alignItems: "center",
          flex: 1,
          background: t.inputBg,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 12,
          boxShadow: focused
            ? boxShadow
            : `0 2px 8px rgba(0,0,0,0.06)${dark ? ", 0 1px 2px rgba(0,0,0,0.12)" : ""}`,
          minHeight: 58,
          transition: "border-color 0.15s, box-shadow 0.15s",
          overflow: "hidden",
        }}
      >
        {/* Left: search icon */}
        <div style={{
          padding: "0 10px 0 14px",
          color: t.tertiary, display: "flex", alignItems: "center", flexShrink: 0,
        }}>
          <SearchIcon />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          className="dr-search-input"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search a dish, cuisine, or restaurant..."
          disabled={isSearching}
          autoComplete="off"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: "1rem", fontWeight: 400,
            color: t.text, padding: "0 4px",
          }}
        />

        {/* Right: stop | clear | filter */}
        {isSearching ? (
          <button
            onClick={onStop}
            aria-label="Stop search"
            title="Stop search"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: t.secondary, padding: "0 14px",
              display: "flex", alignItems: "center",
              minWidth: 44, minHeight: 44, flexShrink: 0,
            }}
          ><XLarge /></button>
        ) : query.length > 0 ? (
          <button
            onClick={clearQuery}
            aria-label="Clear input"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: t.secondary, padding: "0 14px",
              display: "flex", alignItems: "center",
              minWidth: 44, minHeight: 44, flexShrink: 0,
            }}
          ><XLarge /></button>
        ) : (
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-label="Open filters"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: activeCount > 0 ? t.accent : t.secondary,
              padding: "0 14px", position: "relative",
              display: "flex", alignItems: "center",
              minWidth: 44, minHeight: 44, flexShrink: 0,
              transition: "color 0.15s",
            }}
          >
            <FilterIcon />
            {activeCount > 0 && (
              <div style={{
                position: "absolute", top: 8, right: 8,
                width: 16, height: 16, borderRadius: "50%",
                background: t.accent, color: "#FFFFFF",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.58rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>{activeCount}</div>
            )}
          </button>
        )}
      </div>

      {/* ── ANALYZING // indicator ──────────────────────────────────────── */}
      {isSearching && (
        <div style={{
          fontFamily: "'Sevastopol', Georgia, serif",
          fontSize: "0.56rem", fontWeight: 400,
          color: dark ? "#FFB800" : "#C8860A",
          textTransform: "uppercase", letterSpacing: "0.2em",
          whiteSpace: "nowrap", flexShrink: 0,
          animation: "dr-blink 1.5s ease-in-out infinite",
        }}>ANALYZING //</div>
      )}

      </div>{/* end bar row */}

      {/* ── Spellcheck suggestion ───────────────────────────────────────── */}
      {suggestion && (
        <div style={{
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
          marginTop: 8, animation: "up 0.15s ease",
        }}>
          <span style={{
            fontFamily: "'DM Sans', 'Inter', sans-serif",
            fontSize: "0.875rem", color: t.secondary,
          }}>Did you mean:</span>

          <button
            onClick={() => { setQuery(suggestion); fireSearch(suggestion); }}
            style={{
              display: "inline-flex", alignItems: "center",
              background: dark ? "#2A2010" : "#FDF3E3",
              border: `1px solid ${dark ? "#4A3810" : "#F0D5A0"}`,
              borderRadius: 20, padding: "4px 14px",
              fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
              fontWeight: 600, color: dark ? "#FFB800" : "#C8860A",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = dark ? "#3A2A15" : "#F0D5A0"; }}
            onMouseLeave={e => { e.currentTarget.style.background = dark ? "#2A2010" : "#FDF3E3"; }}
          >{suggestion}?</button>

          <button
            onClick={() => { setSuggestion(null); fireSearch(query); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', 'Inter', sans-serif",
              fontSize: "0.825rem", color: t.tertiary,
              padding: "4px 2px",
              textDecoration: "underline", textUnderlineOffset: "2px",
            }}
          >Search anyway</button>
        </div>
      )}

      {/* ── Filter tags ─────────────────────────────────────────────────── */}
      <FilterTags filters={filters} onChange={setFilters} dark={dark} />

      {/* ── Filter sheet ────────────────────────────────────────────────── */}
      {showFilters && (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
          dark={dark}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NarrowingFlow and DeepDiveInputs are kept unchanged below.
// They still use T from dish-shared and will be updated with page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export function NarrowingFlow({
  questions, dish, onComplete, dark = false,
}: {
  questions: NarrowQuestion[];
  dish: string;
  onComplete: (refined: string) => void;
  dark?: boolean;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const current = questions[stepIdx];
  if (!current) return null;

  // Theme
  const accent      = dark ? "#FFB800" : "#B8780A";
  const accentLight = dark ? "rgba(255,184,0,0.12)" : "#FDF3E3";
  const accentBdr   = dark ? "rgba(255,184,0,0.35)" : "#F0D5A0";
  const panelBg     = dark ? "#161616" : "#FFFFFF";
  const border      = dark ? "#2C2C2C" : "#E8E3DC";
  const border2     = dark ? "#3A3A3A" : "#D4CBC0";
  const textClr     = dark ? "#F0EDE8" : "#1C1917";
  const secondaryClr= dark ? "#9A9390" : "#6B6560";
  const tertiaryClr = dark ? "#6B6866" : "#A89F99";

  const pick = (opt: string) => {
    const next = [...answers, opt];
    setAnswers(next);
    if (stepIdx < questions.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      onComplete([dish, ...next].filter(Boolean).join(" — "));
    }
  };

  return (
    <>
      {/* Dark overlay so the panel is impossible to miss */}
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.35)", zIndex: 480,
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Full-width panel — slides up from below the sticky search bar */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        zIndex: 481,
        maxHeight: "80vh", overflowY: "auto",
        animation: "slideUp 0.3s cubic-bezier(0.4,0,0.2,1) both",
      }}>
        <div style={{
          background: panelBg,
          borderTop: `1px solid ${border}`,
          borderRadius: "18px 18px 0 0",
          padding: "28px 24px 48px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          maxWidth: 680, margin: "0 auto",
        }}>
          {/* Previous answers as amber chips */}
          {answers.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {answers.map((a, i) => (
                <span key={i} style={{
                  background: accentLight, border: `1.5px solid ${accentBdr}`,
                  color: accent, fontFamily: "'Inter', sans-serif",
                  fontSize: "0.875rem", fontWeight: 600,
                  padding: "6px 14px", borderRadius: 20,
                }}>{a}</span>
              ))}
            </div>
          )}

          {/* Step indicator */}
          <div style={{
            fontFamily: "'Sevastopol', Georgia, serif",
            fontSize: "0.6875rem", color: accent,
            textTransform: "uppercase", letterSpacing: "0.12em",
            marginBottom: 12,
          }}>
            Step {stepIdx + 1} of {questions.length}
          </div>

          {/* Question — large and unmissable */}
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "1.75rem", fontWeight: 700,
            color: textClr, lineHeight: 1.25,
            marginBottom: 28,
          }}>
            {current.question}
          </div>

          {/* Option pills — 48px+ tap targets */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
            {(Array.isArray(current.options) ? current.options : []).map((opt, i) => (
              <button
                key={i}
                onClick={() => pick(opt)}
                style={{
                  border: `1.5px solid ${border2}`,
                  background: panelBg, color: secondaryClr,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "1rem", fontWeight: 500,
                  padding: "12px 22px", cursor: "pointer",
                  borderRadius: 28, minHeight: 48,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.color = accent;
                  e.currentTarget.style.background = accentLight;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = border2;
                  e.currentTarget.style.color = secondaryClr;
                  e.currentTarget.style.background = panelBg;
                }}
              >{opt}</button>
            ))}
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => onComplete([dish, ...answers].filter(Boolean).join(" "))}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                color: tertiaryClr, padding: 0,
                textDecoration: "underline", textUnderlineOffset: "2px",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = secondaryClr; }}
              onMouseLeave={e => { e.currentTarget.style.color = tertiaryClr; }}
            >Skip — Search now</button>
            {stepIdx > 0 && (
              <button
                onClick={() => { setStepIdx(stepIdx - 1); setAnswers(answers.slice(0, -1)); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  color: tertiaryClr, padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = secondaryClr; }}
                onMouseLeave={e => { e.currentTarget.style.color = tertiaryClr; }}
              >← Back</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function DeepDiveInputs({
  ddName, onDdNameChange, ddCity, onDdCityChange,
  isIdle, confirming, onConfirm,
  confirmMatches, onClearMatches, confirmIsMarket,
  onDeepDive, onMarketGuide,
  dark = false,
}: {
  ddName: string; onDdNameChange: (n: string) => void;
  ddCity: string; onDdCityChange: (c: string) => void;
  isIdle: boolean; confirming: boolean; onConfirm: () => void;
  confirmMatches: ConfirmMatch[] | null; onClearMatches: () => void;
  confirmIsMarket: boolean;
  onDeepDive: (name: string, city: string) => void;
  onMarketGuide: (name: string, city: string) => void;
  dark?: boolean;
}) {
  const accent      = dark ? "#FFB800" : "#C8860A";
  const accentHov   = dark ? "#FFC933" : "#A86E08";
  const accentLight = dark ? "#2A2010" : "#FDF3E3";
  const accentBdr   = dark ? "#4A3810" : "#F0D5A0";
  const cardBg      = dark ? "#1A1A1A" : "#FFFFFF";
  const elevBg      = dark ? "#232323" : "#FDFCFB";
  const borderColor = dark ? "#2A2A2A" : "#E8E3DC";
  const borderStrong= dark ? "#3A3A3A" : "#D4CBC0";
  const textColor   = dark ? "#F0EDE8" : "#1C1917";
  const mutedColor  = dark ? "#9A9390" : "#6B6560";
  const dimColor    = dark ? "#6B6866" : "#A89F99";
  const focusBdr    = dark ? "#FFB800" : "#C8860A";
  const focusShadow = dark ? "0 0 0 3px #2A2010" : "0 0 0 3px #FDF3E3";
  const successColor= dark ? "#52D68A" : "#166534";
  const successBg   = dark ? "rgba(46,204,113,0.08)" : "rgba(22,101,52,0.06)";
  const successBdr  = dark ? "rgba(46,204,113,0.25)" : "rgba(22,101,52,0.2)";

  const inputStyle: React.CSSProperties = {
    flex: 1, background: cardBg,
    border: `1.5px solid ${borderStrong}`,
    color: textColor, fontFamily: "'Inter', sans-serif",
    fontSize: "0.9rem", fontWeight: 500,
    padding: "10px 12px", outline: "none", borderRadius: 8,
    transition: "border-color 0.15s, box-shadow 0.15s", width: "100%",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = focusBdr;
    e.currentTarget.style.boxShadow = focusShadow;
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = borderStrong;
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: "0.875rem", color: mutedColor, lineHeight: 1.55 }}>
        Know where you're going? Enter a restaurant for a food cheat sheet, or a food court / public market for a vendor-by-vendor guide.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Restaurant name..."
          value={ddName}
          onChange={e => onDdNameChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ddName.trim() && onConfirm()}
          onFocus={onFocus} onBlur={onBlur}
          disabled={!isIdle || confirming}
          style={{ ...inputStyle, flex: 2 }}
        />
        <input
          placeholder="City"
          value={ddCity}
          onChange={e => onDdCityChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          disabled={!isIdle || confirming}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
      <button
        onClick={onConfirm}
        disabled={!ddName.trim() || !isIdle || confirming}
        style={{
          alignSelf: "flex-start",
          display: "flex", alignItems: "center", gap: 8,
          background: accent, border: "none", borderRadius: 8,
          color: dark ? "#000" : "#FFFFFF",
          fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
          fontWeight: 600, padding: "10px 20px", height: 42,
          cursor: !ddName.trim() || !isIdle || confirming ? "not-allowed" : "pointer",
          opacity: !ddName.trim() || !isIdle || confirming ? 0.4 : 1,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (ddName.trim() && isIdle && !confirming) e.currentTarget.style.background = accentHov; }}
        onMouseLeave={e => { e.currentTarget.style.background = accent; }}
      >
        {confirming ? (
          <>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              border: `2px solid ${dark ? "#000" : "#FFFFFF"}44`,
              borderTopColor: dark ? "#000" : "#FFFFFF",
              animation: "spin 0.7s linear infinite", flexShrink: 0,
            }} />
            Finding...
          </>
        ) : "Confirm Spot"}
      </button>

      {Array.isArray(confirmMatches) && confirmMatches.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
            fontWeight: 600, color: dimColor,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
          }}>Is this the right spot?</div>
          {confirmMatches.map((m, i) => (
            <div key={i} style={{
              background: elevBg, border: `1px solid ${borderColor}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 8,
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1rem", fontWeight: 700, color: textColor, marginBottom: 4,
              }}>{m.name}</div>
              <div style={{ fontSize: "0.8rem", color: mutedColor, marginBottom: 8 }}>
                {[m.address, m.neighborhood, m.city].filter(Boolean).join(" · ")}
              </div>
              {m.cuisine && (
                <div style={{ fontSize: "0.75rem", color: dimColor, marginBottom: 12 }}>{m.cuisine}</div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => onDeepDive(m.name, m.city || ddCity)}
                  style={{
                    flex: 1, minWidth: 130, background: accentLight,
                    border: `1px solid ${accentBdr}`, color: accent,
                    fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                    fontWeight: 600, padding: "9px 12px", borderRadius: 8,
                    cursor: "pointer", textAlign: "center", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? "#3A2A15" : "#F0D5A0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = accentLight; }}
                >Deep Dive</button>
                <button
                  onClick={() => onMarketGuide(m.name, m.city || ddCity)}
                  style={{
                    flex: 1, minWidth: 130, background: successBg,
                    border: `1px solid ${successBdr}`, color: successColor,
                    fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                    fontWeight: 600, padding: "9px 12px", borderRadius: 8,
                    cursor: "pointer", textAlign: "center", transition: "background 0.15s",
                  }}
                >Market Guide</button>
              </div>
              {confirmIsMarket && (
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: successColor, fontWeight: 500 }}>
                  Looks like a market or multi-vendor spot
                </div>
              )}
            </div>
          ))}
          <button
            onClick={onClearMatches}
            style={{
              background: "none", border: "none",
              fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
              color: dimColor, cursor: "pointer", padding: 0,
              textDecoration: "underline", textUnderlineOffset: "2px",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = mutedColor; }}
            onMouseLeave={e => { e.currentTarget.style.color = dimColor; }}
          >Try a different name</button>
        </div>
      )}
    </div>
  );
}
