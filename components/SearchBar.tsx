'use client';
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/dish-shared";
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
    inputBorder:   dark ? "#3A3A3A" : "#E8E3DC",
    focusBorder:   dark ? "#FFB800" : "#C8860A",
    focusShadow:   dark ? "0 0 0 3px #2A2010" : "0 0 0 3px #FDF3E3",
    text:          dark ? "#F0EDE8" : "#1C1917",
    placeholder:   dark ? "#4A4846" : "#C8C2BC",
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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

      {/* ── Placeholder color + desktop height ─────────────────────────── */}
      <style>{`
        .dr-search-input::placeholder { color: ${t.placeholder}; }
        @media (min-width: 641px) { .dr-search-bar { min-height: 56px !important; } }
      `}</style>

      {/* ── Main bar ────────────────────────────────────────────────────── */}
      <div
        className="dr-search-bar"
        style={{
          display: "flex", alignItems: "center",
          background: t.inputBg,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 12,
          boxShadow,
          minHeight: 52,
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
  questions, dish, onComplete,
}: {
  questions: NarrowQuestion[];
  dish: string;
  onComplete: (refined: string) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const current = questions[stepIdx];
  if (!current) return null;

  const pick = (opt: string) => {
    const next = [...answers, opt];
    setAnswers(next);
    if (stepIdx < questions.length - 1) setStepIdx(stepIdx + 1);
    else onComplete([dish, ...next].filter(Boolean).join(" — "));
  };

  return (
    <div style={{ padding: "14px 16px", background: T.card, borderBottom: `1px solid ${T.border}` }}>
      {answers.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
          {answers.map((a, i) => (
            <span key={i} style={{
              background: `${T.neon}18`, border: `1px solid ${T.neon}44`,
              color: T.neon, fontSize: "0.62rem", fontWeight: 600,
              padding: "2px 8px", borderRadius: 20,
            }}>{a}</span>
          ))}
        </div>
      )}
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: T.text, marginBottom: 12 }}>
        <span style={{ color: T.neon }}>→ </span>{current.question}
        <span style={{
          fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.42rem",
          letterSpacing: 2, color: T.dim, textTransform: "uppercase", marginLeft: 10,
        }}>step {stepIdx + 1} of {questions.length}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {(Array.isArray(current.options) ? current.options : []).map((opt, i) => (
          <button
            key={i}
            onClick={() => pick(opt)}
            style={{
              border: `1.5px solid ${T.border2}`, background: T.card2, color: T.muted,
              fontFamily: "'Inter',sans-serif", fontSize: "0.78rem", fontWeight: 500,
              padding: "7px 13px", cursor: "pointer", borderRadius: 20, transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.neon; e.currentTarget.style.color = T.neon; e.currentTarget.style.background = `${T.neon}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.muted; e.currentTarget.style.background = T.card2; }}
          >{opt}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => onComplete([dish, ...answers].filter(Boolean).join(" "))}
          style={{
            border: `1px solid ${T.blue}44`, background: `${T.blue}11`, color: T.blue,
            fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.44rem",
            letterSpacing: 2, textTransform: "uppercase",
            padding: "6px 12px", cursor: "pointer", borderRadius: 20,
          }}
        >Skip — Search now</button>
        {stepIdx > 0 && (
          <button
            onClick={() => { setStepIdx(stepIdx - 1); setAnswers(answers.slice(0, -1)); }}
            style={{
              border: "none", background: "none", color: T.dim,
              fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.44rem",
              letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", padding: "6px 0",
            }}
          >Back a step</button>
        )}
      </div>
    </div>
  );
}

export function DeepDiveInputs({
  ddName, onDdNameChange, ddCity, onDdCityChange,
  isIdle, confirming, onConfirm,
  confirmMatches, onClearMatches, confirmIsMarket,
  onDeepDive, onMarketGuide,
}: {
  ddName: string; onDdNameChange: (n: string) => void;
  ddCity: string; onDdCityChange: (c: string) => void;
  isIdle: boolean; confirming: boolean; onConfirm: () => void;
  confirmMatches: ConfirmMatch[] | null; onClearMatches: () => void;
  confirmIsMarket: boolean;
  onDeepDive: (name: string, city: string) => void;
  onMarketGuide: (name: string, city: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: "0.76rem", color: T.muted, lineHeight: 1.55 }}>
        Know where you're going? Enter a restaurant for a food cheat sheet, or a food court / public market for a vendor-by-vendor guide.
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <input
          className="inp"
          placeholder="Restaurant name..."
          value={ddName}
          onChange={e => onDdNameChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ddName.trim() && onConfirm()}
          disabled={!isIdle || confirming}
          style={{ flex: 2 }}
        />
        <input
          className="inp"
          placeholder="City"
          value={ddCity}
          onChange={e => onDdCityChange(e.target.value)}
          disabled={!isIdle || confirming}
          style={{ flex: 1 }}
        />
      </div>
      <button
        className="btn"
        onClick={onConfirm}
        disabled={!ddName.trim() || !isIdle || confirming}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}
      >
        {confirming ? <><div className="spin" />Finding...</> : "CONFIRM SPOT"}
      </button>

      {Array.isArray(confirmMatches) && confirmMatches.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.44rem",
            letterSpacing: 3, color: T.dim, textTransform: "uppercase", marginBottom: 9,
          }}>Is this the right spot?</div>
          {confirmMatches.map((m, i) => (
            <div key={i} style={{
              background: T.card2, border: `1.5px solid ${T.border2}`,
              borderRadius: 7, padding: "11px 13px", marginBottom: 8,
            }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: T.text, marginBottom: 3 }}>{m.name}</div>
              <div style={{ fontSize: "0.69rem", color: T.muted, marginBottom: 8 }}>
                {[m.address, m.neighborhood, m.city].filter(Boolean).join(" · ")}
              </div>
              {m.cuisine && <div style={{ fontSize: "0.64rem", color: T.dim, marginBottom: 10 }}>{m.cuisine}</div>}
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button
                  onClick={() => onDeepDive(m.name, m.city || ddCity)}
                  style={{
                    flex: 1, minWidth: 120, background: `${T.neon}15`,
                    border: `1px solid ${T.neon}55`, color: T.neon,
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.44rem",
                    letterSpacing: 2, textTransform: "uppercase",
                    padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                    textAlign: "center", lineHeight: 1.4,
                  }}
                >Restaurant Deep Dive</button>
                <button
                  onClick={() => onMarketGuide(m.name, m.city || ddCity)}
                  style={{
                    flex: 1, minWidth: 120, background: `${T.green}15`,
                    border: `1px solid ${T.green}55`, color: T.green,
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.44rem",
                    letterSpacing: 2, textTransform: "uppercase",
                    padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                    textAlign: "center", lineHeight: 1.4,
                  }}
                >Market Guide — All Vendors</button>
              </div>
              {confirmIsMarket && (
                <div style={{ marginTop: 7, fontSize: "0.6rem", color: T.green, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1 }}>
                  Looks like a market or multi-vendor spot
                </div>
              )}
            </div>
          ))}
          <button
            onClick={onClearMatches}
            style={{
              background: "none", border: "none",
              fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.42rem",
              letterSpacing: 2, color: T.dim, textTransform: "uppercase",
              cursor: "pointer", padding: 0,
            }}
          >Try a different name</button>
        </div>
      )}
    </div>
  );
}
