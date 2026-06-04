'use client';
import { useState, useEffect, useRef } from "react";
import { Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  Restaurant, DeepDiveData, CompareData, MarketData, SearchMeta,
  ConfirmMatch, Fav, NarrowQuestion, NavEntry, UserList, AddToListTarget,
} from "@/lib/types";
import type { FilterState } from "@/components/SearchBar";
import { DEFAULT_FILTERS } from "@/components/SearchBar";

import { Header, BackBtn }                         from "@/components/Header";
import { SearchBar, NarrowingFlow, DeepDiveInputs } from "@/components/SearchBar";
import { TerminalSearch }                           from "@/components/TerminalSearch";
import { LoadingTracker }                           from "@/components/LoadingTracker";
import { RestCard }                                 from "@/components/RestaurantCard";
import { Browse }                                   from "@/components/CategoryBrowse";
import { DeepDiveResult, MarketGuideResult, CompareResult } from "@/components/DeepDive";
import { getTilesForLocation, normalizeLocation, getMetroForLocation, detectRegionFromNeighborhood, type MetroConfig } from "@/lib/metro-tiles";
import { applyFontSize, persistFontSize, getStoredFontSize, type FontSize } from "@/lib/font-scale";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// FIX 1: defensive client-side sort — ensures food_score DESC regardless of server order
function sortByScore(results: Restaurant[]): Restaurant[] {
  return [...results].sort((a, b) => (b.food_score ?? 0) - (a.food_score ?? 0));
}

// ─── RESTAURANT NAME DETECTOR ─────────────────────────────────────────────────
// Runs client-side before any API call — catches both terminal and bar searches.
// Returns true when the query is almost certainly a specific venue name, not a dish.
//
// Logic: restaurant-type word present AND no search-prefix/location-intent disqualifiers,
// OR ampersand pattern (e.g. "Juniper & Ivy") with no dish-category words.
const _REST_WORDS = new Set([
  'cafe', 'café', 'restaurant', 'grill', 'grille', 'kitchen', 'bar', 'tavern',
  'taqueria', 'pizzeria', 'bistro', 'eatery', 'cantina', 'diner', 'brasserie',
  'trattoria', 'osteria', 'chophouse', 'smokehouse', 'gastropub', 'pub',
  'lounge', 'inn', 'steakhouse', 'creamery', 'bakery', 'patisserie', 'ramen-ya',
  'izakaya', 'yakiniku', 'omakase-bar',
]);
const _DISH_WORDS = new Set([
  'tacos', 'taco', 'pizza', 'ramen', 'burger', 'burgers', 'sushi', 'chicken',
  'beef', 'pork', 'fish', 'seafood', 'pasta', 'noodles', 'curry', 'bbq',
  'wings', 'sandwich', 'steak', 'breakfast', 'brunch', 'lunch', 'dinner',
  'dessert', 'dim sum', 'dumplings', 'soup', 'salad', 'bowl', 'bowls',
]);
const _SEARCH_PREFIXES = new Set(['best', 'top', 'good', 'great', 'find', 'where', 'open', 'cheap', 'any', 'show']);
function isLikelyRestaurantName(query: string): boolean {
  const lower = query.trim().toLowerCase();
  const words = lower.split(/\s+/);
  if (/\b(near me|nearby|around me|open now|open late)\b/.test(lower)) return false;
  if (_SEARCH_PREFIXES.has(words[0])) return false;
  if (words.length === 1 && _DISH_WORDS.has(words[0])) return false;
  if (words.some(w => _REST_WORDS.has(w))) return true;
  // Ampersand pattern — e.g. "Juniper & Ivy" — but not "fish & chips"
  if (query.includes(' & ') && !words.some(w => _DISH_WORDS.has(w))) return true;
  // "Dish Word + Proper Name" pattern — e.g. "Sushi Ota", "Ramen Nagi", "Pizza Port".
  // First word is a known dish type; remaining words contain at least one title-case
  // token that isn't itself a dish word (i.e. it looks like a venue name, not a modifier).
  const origWords = query.trim().split(/\s+/);
  if (origWords.length >= 2 && _DISH_WORDS.has(words[0])) {
    if (origWords.slice(1).some(w => /^[A-Z]/.test(w) && !_DISH_WORDS.has(w.toLowerCase()))) return true;
  }
  return false;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function apiFetch(path: string, body: object, signal?: AbortSignal) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

let _sb: ReturnType<typeof createBrowserClient> | null = null;
const sb = () => {
  if (!_sb) _sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _sb;
};

// ─── SUGGESTION TYPES ────────────────────────────────────────────────────────
type Suggestion = { text: string; initial: string };

function generateSuggestions(locationLabel: string): Suggestion[] {
  const h = new Date().getHours();
  if (h < 11) return [
    { text: `Best breakfast near ${locationLabel}`, initial: "B" },
    { text: "Chilaquiles or eggs benedict open now", initial: "C" },
    { text: "Pancakes worth leaving the house for", initial: "P" },
    { text: `Great coffee and a bite near ${locationLabel}`, initial: "☕" },
    { text: "Best breakfast burrito in the area", initial: "B" },
    { text: "Early-open diner with strong coffee", initial: "E" },
  ];
  if (h < 15) return [
    { text: `Best lunch near ${locationLabel}`, initial: "L" },
    { text: "Birria tacos open right now", initial: "B" },
    { text: "Top ramen spots near you", initial: "R" },
    { text: "Quick lunch under $15 near me", initial: "Q" },
    { text: "Best poke bowl in the area", initial: "P" },
    { text: "Sandwich worth leaving the office for", initial: "S" },
  ];
  if (h < 22) return [
    { text: `Top dinner spots near ${locationLabel}`, initial: "D" },
    { text: "Korean BBQ worth the wait tonight", initial: "K" },
    { text: "Best pasta open for dinner", initial: "P" },
    { text: "Happy hour deals near me right now", initial: "H" },
    { text: "Date-night worthy in the area", initial: "D" },
    { text: "Best sushi open for dinner tonight", initial: "S" },
  ];
  return [
    { text: `Open late near ${locationLabel}`, initial: "L" },
    { text: "Late night tacos or ramen", initial: "T" },
    { text: "KBBQ spots still open now", initial: "K" },
    { text: "Best late-night bites nearby", initial: "B" },
    { text: "24-hour diner near me", initial: "24" },
    { text: "After-midnight food that's actually good", initial: "N" },
  ];
}

// ─── HERO EXAMPLE QUERIES ────────────────────────────────────────────────────
const HERO_EXAMPLES = [
  "Best birria tacos open now near Serra Mesa",
  "Top ramen spots within 2 miles",
  "Where to take clients for dinner tonight",
  "Best happy hour in North Park right now",
  "Carnitas that travel well for takeout",
  "Late night Korean BBQ near downtown",
];

// ─── QUICK HERO FILTERS ───────────────────────────────────────────────────────
const HERO_FILTERS = [
  { label: "Open now",   query: "open now restaurants near me" },
  { label: "Takeout",    query: "best takeout near me" },
  { label: "Happy hour", query: "happy hour deals near me" },
  { label: "Late night", query: "late night food near me" },
];

// ─── NEAR YOU CARD ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NearYouCard({ suggestion, dark: _dark, onSearch }: {
  suggestion: Suggestion; dark: boolean; onSearch: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onSearch}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 14,
        height: 56, padding: "0 16px",
        background: "#10211e",
        border: "1px solid #2c4a44",
        borderLeft: "3px solid #7fe3c8",
        borderRadius: 10,
        boxShadow: hov ? "0 4px 12px rgba(0,0,0,0.30)" : "0 2px 6px rgba(0,0,0,0.20)",
        transition: "box-shadow 0.15s",
      }}
    >
      <div style={{
        fontFamily: "'IBM Plex Mono','Courier New',monospace",
        fontSize: "1.25rem", fontWeight: 700,
        color: "#7fe3c8", lineHeight: 1,
        minWidth: 28, flexShrink: 0,
      }}>{suggestion.initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: "0.9375rem", fontWeight: 600,
          color: "#f0f4f1",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{suggestion.text}</div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, color: "#8aa9a2",
          textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 2,
        }}>Tap to search</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8aa9a2" strokeWidth="2" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── CONTEXT FILTER ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ContextFilter({ icon, label, options, value, onChange, dark: _dark }: {
  icon: string; label: string; options: string[];
  value: string; onChange: (v: string) => void; dark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = !!value;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          height: 36, padding: "0 14px",
          background: active ? "#1b332e" : "#10211e",
          border: `1px solid ${active ? "#7fe3c8" : "#2c4a44"}`,
          borderRadius: 20, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem",
          fontWeight: active ? 600 : 400,
          color: active ? "#7fe3c8" : "#8aa9a2",
          whiteSpace: "nowrap", transition: "border-color 0.15s, color 0.15s",
        }}
      >
        <span>{icon}</span>
        <span>{value || label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "#10211e",
          border: "1px solid #2c4a44",
          borderRadius: 10, padding: 6, minWidth: 140,
          boxShadow: "0 4px 16px rgba(0,0,0,0.40)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {value && (
            <button onClick={() => { onChange(""); setOpen(false); }}
              style={{
                background: "none", border: "none", padding: "7px 10px",
                textAlign: "left", cursor: "pointer", borderRadius: 6,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem",
                color: "#d64545",
              }}>Clear</button>
          )}
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                background: value === opt ? "#1b332e" : "none",
                border: "none", padding: "8px 10px",
                textAlign: "left", cursor: "pointer", borderRadius: 6,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.875rem",
                color: value === opt ? "#7fe3c8" : "#d4e4df",
                fontWeight: value === opt ? 600 : 400,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "#1b332e"; }}
              onMouseLeave={e => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// ─── SECTION 4 CONTENT (query types + common dishes) ────────────────────────
const COMMON_DISHES_PRIMARY   = ['Tacos', 'Pizza', 'Burger', 'Sushi', 'Wings', 'Ramen'];
const COMMON_DISHES_SECONDARY = ['Korean BBQ', 'Burritos', 'Fried Chicken', 'Dim Sum', 'Poke', 'Pasta', 'BBQ', 'Dumplings', 'Pho'];

function SectionContent({ dark, isSearching, handleBrowse }: { dark: boolean; isSearching: boolean; handleBrowse: (q: string) => void }) {
  const [showMoreDishes, setShowMoreDishes] = useState(false);
  const sectionTitle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono',monospace",
    fontSize: "0.75rem", fontWeight: 700, color: "#23413b",
    textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 12,
  };
  // Match the hero filter pill style exactly
  const dishChip = (label: string) => (
    <button
      key={label}
      onClick={() => handleBrowse(label)}
      style={{
        background: "#1b332e", border: "1px solid #2c4a44",
        borderRadius: 20, padding: "0 14px", height: 30,
        fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
        color: "#7fe3c8", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
        textTransform: "uppercase", letterSpacing: "0.12em",
        transition: "background 0.15s",
        display: "flex", alignItems: "center",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#24433e"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#1b332e"; }}
    >{label}</button>
  );
  return (
    <>
      <section style={{ paddingBottom: 20 }}>
        <div style={sectionTitle}>SELECT QUERY TYPE</div>
        <Browse onSelect={handleBrowse} disabled={isSearching} dark={dark} />
      </section>
      <section style={{ paddingBottom: 28 }}>
        <div style={sectionTitle}>COMMON DISHES</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {COMMON_DISHES_PRIMARY.map(dishChip)}
        </div>
        {showMoreDishes && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {COMMON_DISHES_SECONDARY.map(dishChip)}
          </div>
        )}
        <button
          onClick={() => setShowMoreDishes(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1b332e", border: "1px solid #2c4a44",
            borderRadius: 20, padding: "6px 16px", marginTop: 8,
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
            color: "#7fe3c8", cursor: "pointer", transition: "background 0.15s",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#24433e"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#1b332e"; }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "transform 0.2s", transform: showMoreDishes ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {showMoreDishes ? "LESS" : "MORE DISHES"}
        </button>
      </section>
    </>
  );
}

function DishIntel() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const abortRef         = useRef<AbortController | null>(null);
  const wasHiddenRef     = useRef(false);
  const autoSearchFired  = useRef(false);
  // Session caches — instant recall without re-hitting the API
  const deepDiveCache    = useRef<Record<string, DeepDiveData>>({});
  const searchResultCache = useRef<{ key: string; results: Restaurant[]; meta: SearchMeta } | null>(null);
  // Kept in sync so event listeners don't close over stale values
  const isSearchingRef   = useRef(false);
  const apiCompleteRef   = useRef(false);
  const loadingQueryRef  = useRef("");
  const handleDoneRef    = useRef<(() => void) | null>(null);

  // ── Dark mode ────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("dr-dark") === "1";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  // ── Font scale — applies to html font-size so all rem units scale globally ──
  const [fontSz, setFontSz] = useState<FontSize>("normal");
  useEffect(() => {
    const stored = getStoredFontSize();
    setFontSz(stored);
    applyFontSize(stored);
  }, []);

  const handleFontSz = (s: FontSize) => {
    setFontSz(s);
    persistFontSize(s);
    // Sync to Supabase user metadata when signed in (cross-device persistence)
    if (user) {
      sb().auth.updateUser({ data: { font_size: s } }).catch(() => {});
    }
  };
  const toggleDark = () => {
    setDark(v => {
      const next = !v;
      localStorage.setItem("dr-dark", next ? "1" : "0");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  // ── Location ─────────────────────────────────────────────────────────────
  const [city,             setCity]             = useState("San Diego");
  const [locMode,          setLocMode]          = useState("city");
  const [area,             setArea]             = useState("");
  const [radius,           setRadius]           = useState(5);
  const [suggestions,      setSuggestions]      = useState<Suggestion[]>([]);
  const [gpsNeighborhood,  setGpsNeighborhood]  = useState("");

  // ── Hero typewriter ───────────────────────────────────────────────────────
  const [heroExIdx, setHeroExIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setHeroExIdx(i => (i + 1) % HERO_EXAMPLES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  // ── Contextual filters ────────────────────────────────────────────────────
  const [ctxRadius, setCtxRadius] = useState("");
  const [ctxTime,   setCtxTime]   = useState("");
  const [ctxBudget, setCtxBudget] = useState("");
  const [ctxMode,   setCtxMode]   = useState("");

  // ── Search state ──────────────────────────────────────────────────────────
  const [phase,         setPhase]        = useState("idle");
  const [showTerminal,  setShowTerminal] = useState(false);
  const [fromCache,        setFromCache]        = useState(false);
  const [searchMode,       setSearchMode]       = useState<"original" | "refresh" | undefined>(undefined);
  const [showSignInNudge,  setShowSignInNudge]  = useState(false);
  // Real tile names passed to LoadingTracker so it shows what's actually being searched
  const [activeTiles,      setActiveTiles]      = useState<string[] | null>(null);
  // Refine step state — set when a broad metro search is intercepted
  const [refineState,      setRefineState]      = useState<{
    dish: string; city: string; locMode: string; area: string; searchRadius: number;
    metro: MetroConfig;
  } | null>(null);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  // Editable city inside the Refine step — user can change to any city/country
  const [refineCity,        setRefineCity]        = useState("");
  // Result count + honorable mentions controls
  const [resultCount,      setResultCount]      = useState<5 | 10>(5);
  const [showMentions,     setShowMentions]     = useState(true);
  // Pre-scored results beyond the displayed 5 — revealed on "load more" with no API call.
  const [apiComplete,   setApiComplete]  = useState(false);   // true when API returns
  const [pendingPhase,  setPendingPhase] = useState("");      // phase to set on tracker done
  const [staleSearch,   setStaleSearch]  = useState<{ query: string; fresh: boolean } | null>(null);
  const [searchedDish,  setSearchedDish] = useState("");
  const [loadingQuery,  setLoadingQuery]  = useState(""); // what LoadingTracker displays
  const [narrowQuestions, setNarrowQuestions] = useState<NarrowQuestion[] | null>(null);
  const [restaurants,   setRestaurants]  = useState<Restaurant[]>([]);
  const [meta,          setMeta]         = useState<SearchMeta | null>(null);
  const [expanded,      setExpanded]     = useState<number | null>(null);
  const [errMsg,        setErrMsg]       = useState("");
  const [resultsReady,  setResultsReady] = useState(false);

  // ── Deep dive state ───────────────────────────────────────────────────────
  const [deepData,    setDeepData]    = useState<DeepDiveData | null>(null);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [marketData,  setMarketData]  = useState<MarketData | null>(null);
  const [ddName,      setDdName]      = useState("");
  const [ddCity,      setDdCity]      = useState("San Diego");
  const [confirming,  setConfirming]  = useState(false);
  const [confirmMatches, setConfirmMatches] = useState<ConfirmMatch[] | null>(null);
  const [confirmIsMarket, setConfirmIsMarket] = useState(false);
  const [showSpotSearch, setShowSpotSearch] = useState(false);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [navStack, setNavStack] = useState<NavEntry[]>([]);

  // ── Favorites ────────────────────────────────────────────────────────────
  const [favs,      setFavs]      = useState<Fav[]>([]);
  const [showFavs,  setShowFavs]  = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);

  // ── Home swipe-rail data ──────────────────────────────────────────────────
  const [homeRecent, setHomeRecent] = useState<Array<{id: string; dish: string; city: string; search_cache_id: string | null}>>([]);
  const [homeLists,  setHomeLists]  = useState<Array<{id: string; name: string}>>([]);

  // ── List management ───────────────────────────────────────────────────────
  const [addToListTarget, setAddToListTarget] = useState<AddToListTarget | null>(null);
  const [userLists,   setUserLists]   = useState<UserList[]>([]);
  const [loadingLists,setLoadingLists]= useState(false);
  const [newListName, setNewListName] = useState("");
  const [savingList,  setSavingList]  = useState(false);

  // ─── EFFECTS ───────────────────────────────────────────────────────────────
  // Favs from localStorage
  useEffect(() => {
    try { const r = localStorage.getItem("di-favs"); if (r) setFavs(JSON.parse(r)); } catch {}
  }, []);

  // Auth
  useEffect(() => {
    const client = sb();
    client.auth.getSession().then((res: { data: { session: Session | null } }) => { if (res.data.session?.user) setUser(res.data.session.user); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_: string, session: Session | null) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // One-time sign-in nudge — shows 4s after landing, only for logged-out users, once per session
  useEffect(() => {
    if (user) { setShowSignInNudge(false); return; }
    try { if (sessionStorage.getItem("dr-signin-dismissed")) return; } catch {}
    const t = setTimeout(() => setShowSignInNudge(true), 4000);
    return () => clearTimeout(t);
  }, [user]);

  // Fetch home swipe-rail data when user signs in; also sync font size from account metadata
  useEffect(() => {
    if (!user) { setHomeRecent([]); setHomeLists([]); return; }
    sb().from("user_searches").select("id,dish,city,search_cache_id").order("created_at",{ascending:false}).limit(6)
      .then((r: {data: Array<{id:string;dish:string;city:string;search_cache_id:string|null}>|null})=>setHomeRecent(r.data??[]),()=>{});
    sb().from("lists").select("id,name").order("created_at",{ascending:false}).limit(6)
      .then((r: {data: Array<{id:string;name:string}>|null})=>setHomeLists(r.data??[]),()=>{});
    // Apply font size preference stored in account metadata (cross-device sync)
    const metaSize = user.user_metadata?.font_size as FontSize | undefined;
    if (metaSize && ["normal", "large", "xl"].includes(metaSize) && metaSize !== fontSz) {
      setFontSz(metaSize);
      persistFontSize(metaSize);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore stashed search after sign-in redirect
  useEffect(() => {
    console.log('[RESTORE] effect fired, user:', user ? user.email : 'null');
    if (!user) return;
    try {
      const raw = sessionStorage.getItem("dr-return-search");
      console.log('[RESTORE] sessionStorage key present:', !!raw);
      if (!raw) return;
      sessionStorage.removeItem("dr-return-search");
      const { query: q, results, meta: m } = JSON.parse(raw);
      console.log('[RESTORE] restoring search:', q, 'results:', results?.length);
      if (q && Array.isArray(results) && m) {
        setSearchedDish(q);
        const _ranked = sortByScore(results as Restaurant[]).map((r: Restaurant, i: number) => ({ ...r, rank: i + 1 }));
        setRestaurants(_ranked);
        setMeta(m);
        setPhase("done");
      }
    } catch (e) {
      console.log('[RESTORE] failed:', e);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background persistence
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        // Persist search to localStorage so page reload can resume it
        if (isSearchingRef.current) {
          try {
            localStorage.setItem("dr-active-search", JSON.stringify({
              query: loadingQueryRef.current,
              startTime: Date.now(),
            }));
          } catch {}
        }
      } else if (document.visibilityState === "visible" && wasHiddenRef.current) {
        wasHiddenRef.current = false;
        // API returned while hidden — show results immediately
        if (isSearchingRef.current && apiCompleteRef.current) {
          handleDoneRef.current?.();
        }
        // If still waiting for API, LoadingTracker shows its own banner
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // On mount: check for orphaned search from a previous session
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dr-active-search");
      if (!saved) return;
      const { query: q, startTime } = JSON.parse(saved);
      localStorage.removeItem("dr-active-search");
      if (!q) return;
      const age = Date.now() - startTime;
      setStaleSearch({ query: q, fresh: age < 90000 });
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open deep dive for a restaurant navigated here from the Lists page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dr-open-deep-dive");
      if (!raw) return;
      sessionStorage.removeItem("dr-open-deep-dive");
      const { name, food_score } = JSON.parse(raw);
      if (!name) return;
      setTimeout(() => handleDeepDive(name, undefined, food_score ?? undefined), 50);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore stored search result from dashboard "Open results" click — instant, zero API calls
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dr-open-search-results");
      if (!raw) return;
      sessionStorage.removeItem("dr-open-search-results");
      const { dish, city: c, restaurants: res } = JSON.parse(raw);
      if (!Array.isArray(res) || res.length === 0) return;
      const ranked = sortByScore(res as Restaurant[]).map((r, i) => ({ ...r, rank: i + 1 }));
      const m: SearchMeta = { dish: dish || "", city: c || "" };
      setRestaurants(ranked);
      setMeta(m);
      setSearchedDish(dish || "");
      if (c) setCity(c);
      if (c) setDdCity(c);
      searchResultCache.current = { key: `restored|${dish}|${c}`, results: ranked, meta: m };
      setPhase("done");
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cache-reveal phase: auto-advance to "done" after 750ms (honest brief flash, not fake work)
  useEffect(() => {
    if (phase !== "cache-reveal") return;
    const t = setTimeout(() => setPhase("done"), 750);
    return () => clearTimeout(t);
  }, [phase]);

  // GPS location on first load
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { "Accept-Language": "en" } }
        );
        const d = await res.json();
        const addr = d.address || {};
        const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || "";
        const cityName = addr.city || addr.town || addr.county || "your area";
        setCity(cityName);
        setDdCity(cityName);
        setGpsNeighborhood(neighborhood);
        setSuggestions(generateSuggestions(neighborhood || cityName) as Suggestion[]);
      } catch { /* GPS failed silently */ }
    }, () => { /* permission denied — silently continue */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search from URL params (dashboard → re-search)
  useEffect(() => {
    if (autoSearchFired.current) return;
    const d  = searchParams.get("dish"),  c  = searchParams.get("city"),
          lm = searchParams.get("locMode"), a  = searchParams.get("area"),
          r  = searchParams.get("radius"), auto = searchParams.get("autoSearch");

    // Deep-dive share link: /?deepDive=Name&city=City
    const deepDiveName = searchParams.get("deepDive");
    const deepDiveCity = searchParams.get("city");
    if (deepDiveName) {
      autoSearchFired.current = true;
      if (deepDiveCity) setCity(deepDiveCity);
      setTimeout(() => handleDeepDive(deepDiveName, deepDiveCity || undefined), 150);
      return;
    }

    if (!d || !auto) return;
    autoSearchFired.current = true;
    if (c)  setCity(c);
    if (lm) setLocMode(lm);
    if (a)  setArea(a);
    if (r)  setRadius(Number(r));
    setTimeout(() => runSearch(d), 100);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── NAVIGATION ───────────────────────────────────────────────────────────
  const pushNav = () => {
    if (["done", "deepdone", "marketdone", "comparedone"].includes(phase)) {
      setNavStack(prev => [...prev, {
        phase, restaurants: [...restaurants], meta, searchedDish,
        deepData, compareData, marketData, expanded, tab: "search",
      }]);
    }
  };

  const goBack = () => {
    if (navStack.length === 0) { reset(); return; }
    const prev = navStack[navStack.length - 1];
    setNavStack(s => s.slice(0, -1));
    setPhase(prev.phase);
    setRestaurants(prev.restaurants || []);
    setMeta(prev.meta || null);
    setSearchedDish(prev.searchedDish || "");
    setDeepData(prev.deepData || null);
    setCompareData(prev.compareData || null);
    setMarketData(prev.marketData || null);
    setExpanded(prev.expanded);
    setErrMsg(""); setNarrowQuestions(null);
  };

  const reset = () => {
    setPhase("idle"); setNarrowQuestions(null); setRestaurants([]); setMeta(null);
    setSearchedDish(""); setDeepData(null); setCompareData(null); setMarketData(null);
    setConfirmIsMarket(false); setErrMsg(""); setExpanded(null);
    setConfirmMatches(null); setNavStack([]); setResultsReady(false);
  };

  // ─── FAVORITES ────────────────────────────────────────────────────────────
  const saveFavs  = (next: Fav[]) => { setFavs(next); try { localStorage.setItem("di-favs", JSON.stringify(next)); } catch {} };
  const isFav     = (name: string) => favs.some(f => f.name === name);
  const toggleFav = (r: { name: string; neighborhood?: string; venue_type?: string; price_range?: string; food_score?: number }) => {
    if (!user) {
      // Unauthenticated user clicked Save — stash search and prompt sign-in
      try {
        sessionStorage.setItem("dr-return-search", JSON.stringify({
          query: searchedDish, results: restaurants, meta,
        }));
        console.log('[STASH] written from toggleFav for unauthenticated user');
      } catch {}
      router.push("/auth/signin");
      return;
    }
    saveFavs(isFav(r.name) ? favs.filter(f => f.name !== r.name) : [...favs, r as Fav]);
  };

  // ─── LIST MANAGEMENT ──────────────────────────────────────────────────────
  const openAddToList = (target: AddToListTarget) => {
    if (!user) {
      // Stash current search so the user lands back here after signing in
      try {
        const payload = { query: searchedDish, results: restaurants, meta };
        sessionStorage.setItem("dr-return-search", JSON.stringify(payload));
        console.log('[STASH] written from openAddToList:', searchedDish, 'results:', restaurants.length);
      } catch (e) {
        console.log('[STASH] write FAILED:', e);
      }
      router.push("/auth/signin");
      return;
    }
    setAddToListTarget(target); setNewListName("");
    if (userLists.length === 0) {
      setLoadingLists(true);
      sb().from("lists").select("id,name").order("created_at", { ascending: false }).limit(20)
        .then((res: { data: UserList[] | null }) => { setUserLists(res.data ?? []); setLoadingLists(false); }, () => setLoadingLists(false));
    }
  };

  const addToList = async (listId: string) => {
    if (!addToListTarget) return;
    setSavingList(true);
    const { data: { user: u } } = await sb().auth.getUser();
    if (!u) { setSavingList(false); return; }
    await sb().from("list_items").upsert({
      list_id: listId, user_id: u.id,
      restaurant_name: addToListTarget.name,
      neighborhood: addToListTarget.neighborhood || null,
      venue_type: addToListTarget.venue_type || null,
      price_range: addToListTarget.price_range || null,
      food_score: addToListTarget.food_score || null,
      cuisine: addToListTarget.cuisine || null,
    }, { onConflict: "list_id,restaurant_name" });
    setSavingList(false); setAddToListTarget(null);
  };

  const createAndAdd = async () => {
    if (!newListName.trim() || !addToListTarget) return;
    setSavingList(true);
    const { data: { user: u } } = await sb().auth.getUser();
    if (!u) { setSavingList(false); return; }
    const { data: list } = await sb().from("lists").insert({ name: newListName.trim(), user_id: u.id }).select().single();
    if (list) { setUserLists(prev => [{ id: list.id, name: list.name }, ...prev]); await addToList(list.id); }
    setSavingList(false); setAddToListTarget(null); setNewListName("");
  };

  // ─── SEARCH ────────────────────────────────────────────────────────────────
  // Tracks whether the current abort was triggered by the user (vs network/backgrounding).
  const userAbortedRef = useRef(false);

  const stopSearch = () => {
    userAbortedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setApiComplete(false); setPendingPhase("");
    setPhase("idle");
  };

  // Retry the last interrupted search (reuses cached result if server completed it)
  const retrySearch = () => {
    if (!searchedDish) { reset(); return; }
    setErrMsg("");
    // A small delay lets phase transition settle before runSearch fires
    setTimeout(() => runSearch(searchedDish, city, locMode, area, radius), 50);
  };

  // Called by LoadingTracker when all stages complete and API is done
  const handleAnalysisDone = () => {
    const target = pendingPhase || "done";
    setPendingPhase(""); setApiComplete(false);
    setPhase(target);
    try { localStorage.removeItem("dr-active-search"); } catch {}
  };

  // Run search with explicitly selected regions (from the Refine step).
  // Fires parallel tile queries for the chosen regions only; caches under
  // a signature that includes the region set so selections cache separately.
  const runSearchWithRegions = async (
    dish: string, city: string, searchLocMode: string, searchArea: string,
    searchRadius: number, metro: MetroConfig, regionIds: string[]
  ) => {
    const selectedRegions = metro.regions.filter(r => regionIds.includes(r.id));
    if (selectedRegions.length === 0) return;

    const tileQueries = selectedRegions.map(r => r.tileQuery);
    const regionKey   = [...regionIds].sort().join(",");

    setActiveTiles(tileQueries);
    setRefineState(null);

    const cacheKey = `${dish}|${city}|${searchLocMode}|${searchArea}|${searchRadius}|${regionKey}`;

    pushNav();
    setPhase("analyzing"); setExpanded(null); setApiComplete(false);
    setSearchedDish(dish); setLoadingQuery(dish); setNarrowQuestions(null);
    setFromCache(false); setSearchMode("original");

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await apiFetch(
        "/api/search",
        { mode: "search", dish, city, area: searchArea, locMode: searchLocMode,
          radius: searchRadius, exclude: [], tileQueries, regionKey },
        ctrl.signal
      );
      const m = { dish: data.dish, city: data.city };
      const res = (Array.isArray(data.results) ? data.results : []) as Restaurant[];
      const ranked = sortByScore(res as Restaurant[]).map((r, i) => ({ ...r, rank: i + 1 }));
      setMeta(m);
      setRestaurants(ranked);
      searchResultCache.current = { key: cacheKey, results: ranked, meta: m };
      setPendingPhase("done"); setApiComplete(true); abortRef.current = null;
    } catch (e) {
      abortRef.current = null;
      if (e instanceof Error && e.name === "AbortError") {
        if (!userAbortedRef.current) {
          setApiComplete(false); setPendingPhase("");
          setErrMsg("Connection interrupted. Tap Retry — if the search completed server-side, results load instantly.");
          setPhase("error");
        }
        userAbortedRef.current = false;
        return;
      }
      userAbortedRef.current = false;
      setApiComplete(false); setPendingPhase("");
      setErrMsg(e instanceof Error ? e.message : "Analysis failed");
      setPhase("error");
    }
  };

  // Force a live re-run, bypassing the DB cache (used by "Refresh" on cached results)
  const handleForceRefresh = async () => {
    if (!searchedDish) return;
    setFromCache(false);
    setSearchMode("refresh");
    setActiveTiles((!area && locMode !== "area")
      ? getTilesForLocation(normalizeLocation(city))
      : null);
    searchResultCache.current = null;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("analyzing"); setExpanded(null); setApiComplete(false);
    setLoadingQuery(searchedDish); setNarrowQuestions(null);
    try {
      const data = await apiFetch(
        "/api/search",
        { mode: "search", dish: searchedDish, city, area, locMode, radius, exclude: [], forceRefresh: true },
        ctrl.signal
      );
      const m = { dish: data.dish, city: data.city };
      const res = (Array.isArray(data.results) ? data.results : []) as Restaurant[];
      const ranked = sortByScore(res as Restaurant[]).map((r: Restaurant, i: number) => ({ ...r, rank: i + 1 }));
      setMeta(m); setRestaurants(ranked);
      searchResultCache.current = { key: `${searchedDish}|${city}|${locMode}|${area}|${radius}`, results: ranked, meta: m };
      setPendingPhase("done"); setApiComplete(true); abortRef.current = null;
    } catch (e) {
      abortRef.current = null;
      if (e instanceof Error && e.name === "AbortError") return;
      setErrMsg(e instanceof Error ? e.message : "Refresh failed"); setPhase("error");
    }
  };

  const runSearch = async (
    d: string,
    searchCity = city,
    searchLocMode = locMode,
    searchArea = area,
    searchRadius = radius,
    skipMetroCheck = false,        // true when called from the Refine step's non-metro path
    isLikelyRestaurant = false     // safety net: skip metro intercept → go straight to confirm
  ) => {
    const cacheKey = `${d}|${searchCity}|${searchLocMode}|${searchArea}|${searchRadius}`;

    // Layer 1: session ref cache
    if (searchResultCache.current?.key === cacheKey) {
      console.log("[cache] REF HIT — key:", cacheKey);
      pushNav();
      setMeta(searchResultCache.current.meta);
      const _ref = searchResultCache.current.results;
      setRestaurants(_ref);
      setSearchedDish(d);
      setFromCache(true);
      setPhase("cache-reveal");  // brief honest flash: "CACHED RESULT FOUND"
      return;
    }
    console.log("[cache] REF MISS — key:", cacheKey);

    // ── Refine step: intercept broad metro searches ───────────────────────────
    // Show region-select UI before running. Skip for: already-specific areas,
    // radius-mode searches, metros not in the config, or when called from the
    // Refine step itself (skipMetroCheck prevents re-triggering the intercept).
    if (!skipMetroCheck) {
      const _metro = (!searchArea && searchLocMode !== "area")
        ? getMetroForLocation(normalizeLocation(searchCity))
        : null;
      if (_metro) {
        // Safety net: if the query was flagged as a restaurant name (by the caller
        // or by a re-check here — covers URL params, recent-search taps, classify
        // failures, and any other path that bypasses handleSearchFromBar detection),
        // route to the restaurant confirm flow instead of the region picker.
        if (isLikelyRestaurant || isLikelyRestaurantName(d)) {
          await triggerRestaurantConfirm(d, searchCity);
          return;
        }
        setRefineState({ dish: d, city: searchCity, locMode: searchLocMode, area: searchArea, searchRadius, metro: _metro });
        setRefineCity(searchCity);
        // Pre-select only the user's GPS neighborhood, if detectable.
        const detectedId = detectRegionFromNeighborhood(gpsNeighborhood, _metro);
        setSelectedRegionIds(detectedId ? [detectedId] : []);
        setPhase("refine");
        return;
      }
    }

    // Layer 2: DB quick check BEFORE showing loading screen
    // If it's a cache hit, results appear instantly with no loading animation.
    try {
      const quick = await apiFetch("/api/search", {
        mode: "quick", dish: d, city: searchCity, area: searchArea,
        locMode: searchLocMode, radius: searchRadius,
      });
      if (quick?.hit && quick.results) {
        console.log("[search] exact-match HIT -> serving stored");
        pushNav();
        const res = (Array.isArray(quick.results.results) ? quick.results.results : []) as Restaurant[];
        const ranked = sortByScore(res as Restaurant[]).map((r: Restaurant, i: number) => ({ ...r, rank: i + 1 }));
        const m: SearchMeta = { dish: quick.results.dish || d, city: quick.results.city || searchCity };
        setMeta(m);
        setRestaurants(ranked);
        setSearchedDish(d);
        searchResultCache.current = { key: cacheKey, results: ranked, meta: m };
        setFromCache(true);
        setPhase("cache-reveal");  // brief honest flash: "CACHED RESULT FOUND"
        return;
      }
    } catch {}

    console.log("[search] no match -> running pipeline");
    setFromCache(false);
    setSearchMode("original");
    // Compute real tile names now so LoadingTracker shows what's actually being searched
    setActiveTiles((!searchArea && searchLocMode !== "area")
      ? getTilesForLocation(normalizeLocation(searchCity))
      : null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    pushNav();
    setPhase("analyzing"); setExpanded(null); setApiComplete(false);
    setSearchedDish(d); setLoadingQuery(d); setNarrowQuestions(null);

    try {
      const data = await apiFetch(
        "/api/search",
        { mode: "search", dish: d, city: searchCity, area: searchArea, locMode: searchLocMode, radius: searchRadius, exclude: [] },
        ctrl.signal
      );
      const meta = { dish: data.dish, city: data.city };
      const res = (Array.isArray(data.results) ? data.results : []) as Restaurant[];
      const ranked = sortByScore(res as Restaurant[]).map((r, i) => ({ ...r, rank: i + 1 }));
      setMeta(meta);
      setRestaurants(ranked);
      searchResultCache.current = { key: cacheKey, results: ranked, meta }; // cache for session
      setPendingPhase("done");
      setApiComplete(true);
      abortRef.current = null;
    } catch (e) {
      abortRef.current = null;
      if (e instanceof Error && e.name === "AbortError") {
        if (!userAbortedRef.current) {
          // Network/backgrounding interruption — show recovery on the screen
          setApiComplete(false); setPendingPhase("");
          setErrMsg("Connection interrupted. Tap Retry — if the search completed server-side, results load instantly.");
          setPhase("error");
        }
        userAbortedRef.current = false;
        return;
      }
      userAbortedRef.current = false;
      setApiComplete(false); setPendingPhase("");
      setErrMsg(e instanceof Error ? e.message : "Analysis failed");
      setPhase("error");
    }
  };

  // Shared restaurant-confirm flow — used by both the heuristic and the Claude classify path
  const triggerRestaurantConfirm = async (name: string, searchCity: string) => {
    setDdName(name);
    setDdCity(searchCity);
    setPhase("idle");
    setConfirming(true);
    setConfirmMatches(null);
    try {
      const confirmData = await apiFetch("/api/deepdive", { mode: "confirm", name, city: searchCity });
      setConfirmIsMarket(!!confirmData.is_market);
      setConfirmMatches(
        confirmData.matches?.length
          ? confirmData.matches
          : [{ name, address: "", city: searchCity, neighborhood: "", cuisine: "" }]
      );
    } catch {
      setConfirmMatches([{ name, address: "", city: searchCity, neighborhood: "", cuisine: "" }]);
    } finally {
      setConfirming(false);
    }
  };

  // Unified search handler — called by SearchBar with (query, filters)
  const handleSearchFromBar = async (q: string, filters: FilterState, skipClassify = false) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    // ── Pre-flight validation ────────────────────────────────────────────────
    // Catch obviously malformed queries before they consume an Anthropic call.
    if (trimmed.length < 2) {
      setErrMsg("Search needs at least 2 characters.");
      setPhase("error");
      return;
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      setErrMsg("Search must include words, not just numbers or symbols.");
      setPhase("error");
      return;
    }

    const searchRadius = filters.radius || radius;

    // Step 0: client-side restaurant name detection — runs BEFORE skipClassify check
    // so it intercepts terminal searches too (terminal uses skipClassify=true and would
    // otherwise skip the classify API call entirely, missing restaurant intent).
    if (isLikelyRestaurantName(q)) {
      await triggerRestaurantConfirm(q, city);
      return;
    }

    // Append filter context to query for API (dish searches only)
    let enriched = q;
    if (filters.dineMode)  enriched += ` ${filters.dineMode}`;
    if (filters.openNow)   enriched += ` open now`;
    if (filters.timeOfDay) enriched += ` ${filters.timeOfDay}`;
    if (filters.priceRange.length) enriched += ` ${filters.priceRange.join("")}`;

    setNarrowQuestions(null);

    // Terminal-origin searches skip classify — user already set distance/mode/price
    if (skipClassify) {
      await runSearch(enriched, city, locMode, area, searchRadius);
      return;
    }

    setPhase("classifying");
    try {
      const cls = await apiFetch("/api/search", { mode: "classify", dish: enriched });

      // Claude-based restaurant detection (fallback for names the heuristic missed)
      if (cls.restaurant_search && cls.name) {
        await triggerRestaurantConfirm(String(cls.name), city);
        return;
      }

      if (cls.broad && cls.questions?.length) {
        setNarrowQuestions(cls.questions);
        setPhase("narrowing");
        setSearchedDish(enriched);
      } else {
        await runSearch(enriched, city, locMode, area, searchRadius);
      }
    } catch {
      // Classify failed — pass restaurant hint so the safety net in runSearch
      // can skip the metro intercept if the original query looked like a venue name.
      await runSearch(enriched, city, locMode, area, searchRadius, false, isLikelyRestaurantName(q));
    }
  };

  // loadMore removed — replaced by honorable mentions system.

  // Route every browse/suggested/category tap through classify so location
  // follow-up questions appear when needed. Direct runSearch() skips classify.
  const handleBrowse = (d: string) => {
    setNarrowQuestions(null);
    handleSearchFromBar(d, DEFAULT_FILTERS);
  };

  // ─── DEEP DIVE ─────────────────────────────────────────────────────────────
  const handleCompare = async (r: number, currentData: DeepDiveData, mode = "similar") => {
    pushNav(); setPhase("analyzing"); setApiComplete(false); setCompareData(null); setNarrowQuestions(null);
    setLoadingQuery(`Comparing near ${currentData?.name || "this spot"}`);
    const loc = currentData?.address || currentData?.neighborhood
      ? `within ${r} miles of ${currentData?.address || currentData?.neighborhood}`
      : `within ${r} miles`;
    try {
      const data = await apiFetch("/api/compare", {
        name: currentData?.name, foodScore: currentData?.food_score,
        cuisine: currentData?.cuisine || "various", radius: r, location: loc, mode,
      });
      setCompareData({ ...data, _originalScore: currentData?.food_score, _mode: mode });
      setPendingPhase("comparedone"); setApiComplete(true);
    } catch (e) { setApiComplete(false); setPendingPhase(""); setErrMsg(e instanceof Error ? e.message : "Comparison failed"); setPhase("error"); }
  };

  const handleMarketGuide = async (name: string | undefined, cityStr?: string) => {
    pushNav(); const c = cityStr || ddCity;
    setConfirmMatches(null); setPhase("analyzing"); setApiComplete(false); setNarrowQuestions(null);
    setLoadingQuery(name || "Market guide");
    try {
      const data = await apiFetch("/api/market", { name, city: c });
      setMarketData({ ...data, vendors: Array.isArray(data.vendors) ? data.vendors : [] });
      setPendingPhase("marketdone"); setApiComplete(true);
    } catch (e) { setApiComplete(false); setPendingPhase(""); setErrMsg(e instanceof Error ? e.message : "Market guide failed"); setPhase("error"); }
  };

  const handleDeepDive = async (
    name: string, cityStr?: string, searchScore?: number,
    restaurantId?: string, googlePlaceId?: string, address?: string
  ) => {
    const c = cityStr || ddCity;
    // Cache key priority: google place_id > internal restaurant_id > name+city
    const cacheKey = googlePlaceId
      ? `gp:${googlePlaceId}`
      : restaurantId ? `rid:${restaurantId}` : `${name}|${c}`.toLowerCase();

    // Instant recall from session cache — no API, no loading screen
    if (deepDiveCache.current[cacheKey]) {
      pushNav();
      setDeepData(deepDiveCache.current[cacheKey]);
      setDdCity(c);
      setPhase("deepdone");
      return;
    }

    pushNav();
    setConfirmMatches(null); setPhase("analyzing"); setApiComplete(false); setNarrowQuestions(null);
    setLoadingQuery(`Deep diving ${name}`);
    try {
      const data = await apiFetch("/api/deepdive", {
        mode: "deepdive", name, city: c, restaurant_id: restaurantId,
        ...(address ? { address } : {}),
      });
      // DB-first path already serves the correct durable food_score.
      // Stamp searchScore only for cold opens (no restaurant_id) as safety fallback.
      if (searchScore != null && !restaurantId) data.food_score = searchScore;
      deepDiveCache.current[cacheKey] = data;
      setDeepData(data);
      setPendingPhase("deepdone"); setApiComplete(true);
    } catch (e) { setApiComplete(false); setPendingPhase(""); setErrMsg(e instanceof Error ? e.message : "Deep dive failed"); setPhase("error"); }
  };

  // ─── PLACE SELECTION (from typeahead dropdown) ─────────────────────────────

  // Extract city name from a Google Places address string
  // e.g. "207 Poplar Ave, San Diego, CA 92101, USA" → "San Diego"
  function extractCityFromAddress(addr: string): string {
    const parts = addr.split(",").map(s => s.trim());
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (/^(USA|United States)$/i.test(p)) continue;
      if (/^[A-Z]{2}(\s+\d+)?$/.test(p)) continue;
      return p;
    }
    return "";
  }

  // User clicked a specific place from the autocomplete dropdown → straight to deep dive
  const handlePlaceSelect = (placeId: string, name: string, address: string) => {
    const targetCity = extractCityFromAddress(address) || city;
    setConfirmMatches(null);
    handleDeepDive(name, targetCity, undefined, undefined, placeId, address);
  };

  // User clicked "Find exact place: [query]" → text search → 1 result: deep dive; multiple: picker
  const handleExactPlaceSearch = async (query: string) => {
    setPhase("classifying");
    try {
      const res  = await fetch(`/api/places?mode=textsearch&query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
      const data = await res.json() as { results?: Array<{ place_id: string; name: string; formatted_address: string; vicinity?: string }> };
      const results = data.results ?? [];

      if (results.length === 0) {
        await triggerRestaurantConfirm(query, city);
      } else if (results.length === 1) {
        const p = results[0];
        handlePlaceSelect(p.place_id, p.name, p.formatted_address);
      } else {
        // Multiple locations — show picker using the confirmMatches UI
        setDdName(query); setDdCity(city);
        setConfirmMatches(results.slice(0, 6).map(r => ({
          name: r.name,
          address: r.formatted_address,
          city: extractCityFromAddress(r.formatted_address) || city,
          neighborhood: r.vicinity || "",
          cuisine: "",
          googlePlaceId: r.place_id,
        })));
        setPhase("idle");
      }
    } catch {
      await triggerRestaurantConfirm(query, city);
    }
  };

  const handleConfirm = async () => {
    if (!ddName.trim()) return; setConfirming(true); setConfirmMatches(null); setConfirmIsMarket(false);
    try {
      const data = await apiFetch("/api/deepdive", { mode: "confirm", name: ddName, city: ddCity });
      setConfirmIsMarket(!!data.is_market); setConfirmMatches(data.matches || []);
    } catch { setConfirmMatches([{ name: ddName, address: "", city: ddCity, neighborhood: "", cuisine: "" }]); }
    finally { setConfirming(false); }
  };

  // ─── DERIVED STATE ──────────────────────────────────────────────────────────
  const hasBack    = navStack.length > 0;
  const isSearching = phase === "analyzing";
  const showIdle   = phase === "idle" && !showFavs;

  // Keep event-listener refs in sync (no stale closure issues)
  useEffect(() => { isSearchingRef.current  = isSearching;       }, [isSearching]);
  useEffect(() => { apiCompleteRef.current  = apiComplete;        }, [apiComplete]);
  useEffect(() => { loadingQueryRef.current = loadingQuery;       }, [loadingQuery]);
  useEffect(() => { handleDoneRef.current   = handleAnalysisDone; });

  // ─── LUMON THEME ──────────────────────────────────────────────────────────
  // Bone page frame + dark teal content boxes. Source: lib/lumon-theme.ts
  const bg        = "#e8ece8";    // bone canvas (page bg)
  const cardBg    = "#10211e";    // dark teal (cards, modals, panels)
  const border    = "#c4cdc8";    // subtle separator on BONE PAGE
  const boxBorder = "#2c4a44";    // border ON DARK SURFACES
  const text      = "#23413b";    // primary text on BONE PAGE
  const cardText  = "#f0f4f1";    // primary text on DARK CARDS
  const secondary = "#7a8e8a";    // secondary / meta on bone page
  const cardSec   = "#d4e4df";    // body text on dark cards
  const tertiary  = "#8aa9a2";    // muted (dark surfaces)
  const accent    = "#7fe3c8";    // bright teal — prompt, badge, active states
  const accentBg  = "#1b332e";    // lifted surface (chips, sub-panels)
  const accentBdr = "#2c4a44";    // border on lifted surfaces / dark chips
  const brand     = "#3d6b62";    // primary action button fill (replaces amber)
  const brandTxt  = "#eafaf4";    // primary button text
  const redColor  = "#d64545";    // error / below-threshold red
  const redBg     = "rgba(214,69,69,0.12)";

  // ─── ADD TO LIST MODAL (inline JSX — NOT a function component so React never remounts it,
  //     which would cause the input to lose focus on every keystroke) ────────────────────────
  const addToListModalJsx = addToListTarget ? (
    <div onClick={() => setAddToListTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: cardBg, borderRadius: "14px 14px 0 0", width: "100%", maxWidth: 480, padding: "20px 16px 40px", border: `1px solid ${boxBorder}`, maxHeight: "80vh", overflowY: "auto" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.6875rem", color: accent, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 6 }}>ADD TO LIST</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: cardText, marginBottom: 16 }}>{addToListTarget.name}</div>

          <div style={{ background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 10, padding: "12px", marginBottom: 12 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.6875rem", color: accent, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 8 }}>CREATE NEW LIST</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="List name..."
                onKeyDown={e => e.key === "Enter" && newListName.trim() && createAndAdd()}
                style={{ flex: 1, background: cardBg, border: `1.5px solid ${boxBorder}`, borderRadius: 8, padding: "9px 12px", color: cardText, fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", outline: "none" }} />
              <button onClick={createAndAdd} disabled={!newListName.trim() || savingList}
                style={{ background: brand, border: "none", borderRadius: 8, color: brandTxt, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", fontWeight: 600, padding: "0 16px", cursor: "pointer", opacity: !newListName.trim() || savingList ? 0.5 : 1 }}>
                {savingList ? "..." : "Create"}
              </button>
            </div>
          </div>

          {loadingLists && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: tertiary, padding: "8px 0" }}>Loading lists...</div>}
          {!loadingLists && userLists.length > 0 && (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.6875rem", color: accent, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 8 }}>ADD TO EXISTING LIST</div>
              {userLists.map(l => (
                <button key={l.id} onClick={() => addToList(l.id)} disabled={savingList}
                  style={{ width: "100%", background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 8, padding: "11px 12px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: cardText, fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", textAlign: "left", opacity: savingList ? 0.6 : 1 }}>
                  <span>{l.name}</span><span style={{ color: accent }}>+</span>
                </button>
              ))}
            </>
          )}
          {!loadingLists && userLists.length === 0 && !newListName && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: tertiary, padding: "4px 0" }}>No lists yet — create one above.</div>
          )}
          <button onClick={() => setAddToListTarget(null)} style={{ marginTop: 12, width: "100%", background: "none", border: `1px solid ${accentBdr}`, borderRadius: 8, color: tertiary, fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", padding: "11px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
  ) : null;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>

      <div style={{ background: bg, color: text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <Header
          user={user}
          onSignOut={async () => { await sb().auth.signOut(); setUser(null); }}
          hasBack={hasBack}
          onBack={goBack}
          dark={dark}
          onToggleDark={toggleDark}
          favCount={favs.length}
          fontSz={fontSz}
          onFontSz={handleFontSz}
          onFavsClick={() => {
            if (["done", "deepdone"].includes(phase)) pushNav();
            setPhase("idle"); setShowFavs(v => !v);
          }}
        />

        {/* ── Sticky search bar — shown only when not idle ────────────── */}
        <style>{`
          .dr-sticky-search { position: sticky; top: 64px; z-index: 90; }
          @media (max-width: 640px) { .dr-sticky-search { top: 56px; } }
        `}</style>
        {phase !== "idle" && (
          <div className="dr-sticky-search" style={{
            background: bg, borderBottom: `1px solid ${border}`, padding: "10px 20px",
          }}>
            {/* Click interceptor — opens terminal instead of inline input */}
            <div onClick={() => !isSearching && setShowTerminal(true)} style={{ cursor: isSearching ? "default" : "text" }}>
              <div style={{ pointerEvents: isSearching ? "auto" : "none" }}>
                <SearchBar onSearch={handleSearchFromBar} onStop={stopSearch} isSearching={isSearching} dark={dark} />
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: LUMON HOME — bone canvas, bone search band ────── */}
        {showIdle && (
          <div style={{ width: "100%", background: bg, borderBottom: `1px solid ${border}` }}>
            {/* Faint teal dot grid */}
            <div style={{
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "radial-gradient(circle, rgba(47,79,73,0.055) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }} />
              <div style={{ position: "relative", zIndex: 1, padding: "22px 20px 16px", maxWidth: 900, margin: "0 auto" }}>
                {/* Identity block */}
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
                    {/* ONLINE dot */}
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3fd98a", display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: secondary, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                      {suggestions.length > 0 ? (suggestions[0]?.text?.split(" near ")[1] || "your area") : "online"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "clamp(1.5rem,5vw,2rem)", fontWeight: 700, color: text, letterSpacing: "0.28em", textTransform: "uppercase", lineHeight: 1.1 }}>
                    DISH REPORT
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: secondary, letterSpacing: "0.30em", textTransform: "uppercase", marginTop: 5 }}>
                    FOOD INTELLIGENCE TERMINAL
                  </div>
                </div>

                {/* Search bar — click opens terminal overlay */}
                <div onClick={() => setShowTerminal(true)} style={{ cursor: "text" }}>
                  <div style={{ pointerEvents: "none" }}>
                    <SearchBar
                      onSearch={handleSearchFromBar}
                      onStop={stopSearch}
                      isSearching={isSearching}
                      dark={false}
                    />
                  </div>
                </div>

                {/* Quick filter pills — teal on bone */}
                <div style={{
                  display: "flex", gap: 8, marginTop: 14,
                  overflowX: "auto", scrollbarWidth: "none" as const,
                  paddingBottom: 4,
                }}>
                  {HERO_FILTERS.map(f => (
                    <button
                      key={f.label}
                      onClick={() => runSearch(f.query)}
                      style={{
                        background: accentBg, border: `1px solid ${accentBdr}`,
                        borderRadius: 20, padding: "0 14px", height: 30,
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 10, color: accent,
                        textTransform: "uppercase", letterSpacing: "0.14em",
                        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                        transition: "background 0.15s",
                        display: "flex", alignItems: "center",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#24433e"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = accentBg; }}
                    >{f.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RECENT SEARCHES rail ─────────────────────────────────────── */}
            {(homeRecent.length > 0 || favs.length > 0) && (
              <div style={{ padding: "16px 0 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 10px" }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: secondary, letterSpacing: "0.26em", textTransform: "uppercase" }}>
                    RECENT &amp; SAVED
                  </span>
                  <button onClick={() => router.push("/dashboard/searches")} style={{ background:"none",border:"none",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:accent,letterSpacing:"0.12em" }}>VIEW ALL →</button>
                </div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 20px 16px", scrollbarWidth: "none" as const }}>
                  {homeRecent.map(s => (
                    <button key={s.id} onClick={async () => {
                      if (s.search_cache_id) {
                        const { data } = await sb().from("searches").select("results").eq("id", s.search_cache_id).single();
                        if (data?.results) {
                          const blob = data.results as { dish?: string; city?: string; results?: Restaurant[] };
                          const rs = Array.isArray(blob.results) ? blob.results : [];
                          if (rs.length > 0) {
                            const ranked = sortByScore(rs).map((r,i)=>({...r,rank:i+1}));
                            const m = {dish: blob.dish||s.dish, city: blob.city||s.city};
                            setMeta(m); setRestaurants(ranked); setSearchedDish(s.dish); setPhase("done"); setFromCache(true); return;
                          }
                        }
                      }
                      runSearch(s.dish, s.city);
                    }}
                    style={{ background: cardBg, border: `1px solid ${boxBorder}`, borderRadius: 8, padding: "10px 12px", minWidth: 120, maxWidth: 130, flexShrink: 0, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=boxBorder}
                    >
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", fontWeight: 700, color: cardText, lineHeight: 1.25, marginBottom: 4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{s.dish}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: tertiary, letterSpacing: "0.04em" }}>{s.city}</div>
                    </button>
                  ))}
                  {favs.slice(0,4).map((f,i) => (
                    <button key={`fav-${i}`} onClick={() => { setShowFavs(true); setPhase("idle"); }}
                    style={{ background: cardBg, border: `1px solid ${accentBdr}`, borderRadius: 8, padding: "10px 12px", minWidth: 120, maxWidth: 130, flexShrink: 0, cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: accent, letterSpacing: "0.14em", marginBottom: 4, textTransform: "uppercase" }}>♥ Saved</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", fontWeight: 700, color: cardText, lineHeight: 1.25, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{f.name}</div>
                      {f.food_score && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700, color: "#7bc24a", marginTop: 4 }}>{f.food_score.toFixed(1)}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── YOUR LISTS rail ──────────────────────────────────────────── */}
            {homeLists.length > 0 && (
              <div style={{ borderTop: `1px solid ${border}`, padding: "14px 0 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 10px" }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: secondary, letterSpacing: "0.26em", textTransform: "uppercase" }}>YOUR LISTS</span>
                  <button onClick={() => router.push("/dashboard/lists")} style={{ background:"none",border:"none",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:accent,letterSpacing:"0.12em" }}>VIEW ALL →</button>
                </div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 20px 16px", scrollbarWidth: "none" as const }}>
                  {homeLists.map(l => (
                    <button key={l.id} onClick={() => router.push("/dashboard/lists")}
                    style={{ background: cardBg, border: `1px solid ${boxBorder}`, borderRadius: 8, padding: "10px 12px", minWidth: 120, maxWidth: 130, flexShrink: 0, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=boxBorder}
                    >
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: accent, letterSpacing: "0.14em", marginBottom: 5, textTransform: "uppercase" }}>LIST</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", fontWeight: 700, color: cardText, lineHeight: 1.25, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{l.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Main content ────────────────────────────────────────────── */}
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>

          {/* ── Deep dive — rendered exclusively, no card underneath ──── */}
          {phase === "deepdone" && deepData ? (
            <div style={{ marginLeft: -20, marginRight: -20 }}>
              <DeepDiveResult
                data={deepData} city={ddCity}
                isFav={isFav(deepData.name)}
                onFav={() => toggleFav({ name: deepData.name, neighborhood: deepData.neighborhood, venue_type: deepData.venue_type, price_range: deepData.price_range, food_score: deepData.food_score })}
                onCompare={handleCompare}
                onMarket={name => handleMarketGuide(name, ddCity)}
                onAddToList={openAddToList}
                onBack={goBack}
                searchQuery={searchedDish || undefined}
              />
            </div>
          ) : (
          <>

          {/* ── REFINE STEP — region picker with editable location ──── */}
          {phase === "refine" && refineState && (() => {
            // Compute metro live from the editable city — updates as user types
            const currentMetro = getMetroForLocation(normalizeLocation(refineCity));
            // Only keep region IDs that are valid for the current metro
            const validSelectedIds = currentMetro
              ? selectedRegionIds.filter(id => currentMetro.regions.some(r => r.id === id))
              : [];
            const canRun = currentMetro ? validSelectedIds.length > 0 : refineCity.trim().length > 0;

            return (
            <div style={{ paddingTop: 20, paddingBottom: 40 }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.65rem", fontWeight: 700, color: "#5f857d", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10 }}>REFINE SEARCH</div>

                {/* Dish name */}
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", fontWeight: 700, color: text, marginBottom: 10 }}>
                  {refineState.dish}
                </div>

                {/* Editable location — "in [city input]" */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.7rem", color: secondary, letterSpacing: "0.08em" }}>in</span>
                  <input
                    value={refineCity}
                    onChange={e => {
                      setRefineCity(e.target.value);
                      // When city changes, reset region selection to avoid stale IDs
                      setSelectedRegionIds([]);
                    }}
                    onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
                    placeholder="City, State or Country"
                    style={{
                      background: cardBg,
                      border: `1.5px solid ${accentBdr}`,
                      borderRadius: 8,
                      padding: "7px 12px",
                      color: cardText,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      outline: "none",
                      minWidth: 180,
                      maxWidth: 260,
                      textAlign: "center",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={e => { e.target.style.borderColor = accent; }}
                    onBlur={e => { e.target.style.borderColor = accentBdr; }}
                  />
                </div>

                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.68rem", color: secondary }}>
                  {currentMetro
                    ? (validSelectedIds.length === 1 && gpsNeighborhood
                        ? "Your area selected — tap to add more regions"
                        : "Tap regions to include them · fewer = faster")
                    : refineCity.trim()
                      ? "No area breakdown for this location — searching the full city"
                      : "Enter a city to search"}
                </div>
              </div>

              {currentMetro ? (
                <>
                  {/* ALL OF [CITY] button — only shown when a metro is recognized */}
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    {(() => {
                      const allSelected = validSelectedIds.length === currentMetro.regions.length;
                      return (
                        <button
                          onClick={() => setSelectedRegionIds(
                            allSelected ? [] : currentMetro.regions.map(r => r.id)
                          )}
                          style={{
                            background: allSelected ? brand : accentBg,
                            border: `1.5px solid ${allSelected ? accent : accentBdr}`,
                            borderRadius: 6, padding: "7px 20px",
                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            color: allSelected ? brandTxt : accent,
                            cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
                          }}
                        >
                          {allSelected ? "✓ " : ""}ALL OF {currentMetro.displayName.toUpperCase()} COUNTY
                        </button>
                      );
                    })()}
                  </div>

                  {/* Region cards grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                    {currentMetro.regions.map(region => {
                      const isSelected = validSelectedIds.includes(region.id);
                      return (
                        <button
                          key={region.id}
                          onClick={() => setSelectedRegionIds(prev =>
                            prev.includes(region.id)
                              ? prev.filter(id => id !== region.id)
                              : [...prev, region.id]
                          )}
                          style={{
                            background: isSelected ? "#1b332e" : "#0b1614",
                            border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? accent : "#1a2e28"}`,
                            borderRadius: 8, padding: isSelected ? "11px 11px" : "12px 12px",
                            textAlign: "left", cursor: "pointer",
                            transition: "border-color 0.15s, background 0.15s",
                            minHeight: 76,
                            display: "flex", flexDirection: "column", gap: 5,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, lineHeight: 1, color: accent, width: 14, flexShrink: 0, opacity: isSelected ? 1 : 0 }}>✓</span>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color: isSelected ? accent : "#3d5e58", letterSpacing: "0.06em", transition: "color 0.15s" }}>
                              {region.label}
                            </div>
                          </div>
                          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.65rem", lineHeight: 1.35, color: isSelected ? tertiary : "#2b4440", paddingLeft: 19, transition: "color 0.15s" }}>
                            {region.neighborhoods}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Non-metro city: no region picker — full city search */
                refineCity.trim() && (
                  <div style={{
                    background: accentBg, border: `1px solid ${accentBdr}`,
                    borderRadius: 8, padding: "14px 16px", marginBottom: 20,
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem",
                    color: tertiary, letterSpacing: "0.06em", textAlign: "center",
                  }}>
                    Searching all of <span style={{ color: accent, fontWeight: 700 }}>{refineCity.trim()}</span> — no area breakdown configured for this location
                  </div>
                )
              )}

              {/* Result controls */}
              <div style={{ background: cardBg, border: `1px solid ${boxBorder}`, borderRadius: 8, padding: "14px 14px", marginBottom: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.6rem", color: "#5f857d", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>RESULT OPTIONS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 6, overflow: "hidden" }}>
                    {([5, 10] as const).map(n => (
                      <button key={n} onClick={() => setResultCount(n)} style={{
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.10em",
                        padding: "5px 12px", border: "none", cursor: "pointer",
                        background: resultCount === n ? brand : "transparent",
                        color: resultCount === n ? brandTxt : accent, transition: "background 0.15s",
                      }}>TOP {n}</button>
                    ))}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={showMentions} onChange={e => setShowMentions(e.target.checked)} style={{ accentColor: brand, width: 14, height: 14 }} />
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: secondary, letterSpacing: "0.08em" }}>HONORABLE MENTIONS</span>
                  </label>
                </div>
              </div>

              {/* RUN SEARCH */}
              <button
                onClick={() => {
                  if (!canRun) return;
                  if (currentMetro) {
                    // Metro path: fire parallel tile queries for selected regions
                    runSearchWithRegions(
                      refineState.dish, refineCity.trim(), refineState.locMode,
                      refineState.area, refineState.searchRadius, currentMetro, validSelectedIds
                    );
                  } else {
                    // Non-metro path: direct full-city search, skip metro intercept
                    setRefineState(null);
                    runSearch(
                      refineState.dish, refineCity.trim(), refineState.locMode,
                      refineState.area, refineState.searchRadius, true
                    );
                  }
                }}
                disabled={!canRun}
                style={{
                  width: "100%", padding: "14px",
                  background: canRun ? brand : accentBg,
                  border: `1px solid ${canRun ? brand : accentBdr}`,
                  borderRadius: 8, cursor: canRun ? "pointer" : "not-allowed",
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.875rem",
                  fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: canRun ? brandTxt : tertiary,
                  transition: "background 0.15s",
                }}
              >
                {!refineCity.trim()
                  ? "ENTER A CITY TO SEARCH"
                  : currentMetro
                    ? validSelectedIds.length === 0
                      ? "SELECT AT LEAST ONE REGION"
                      : `RUN SEARCH · ${validSelectedIds.length} ${validSelectedIds.length === 1 ? "REGION" : "REGIONS"}`
                    : `SEARCH ${refineCity.trim().toUpperCase()}`}
              </button>

              {/* Back to idle */}
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button onClick={() => { setPhase("idle"); setRefineState(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: secondary, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.10em", textDecoration: "underline" }}>
                  Cancel
                </button>
              </div>
            </div>
            );
          })()}

          {/* ── Classifying ──────────────────────────────────────────── */}
          {phase === "classifying" && (
            <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: tertiary }}>
              <div className="spin" style={{ borderColor: border, borderTopColor: accent }} />
              Reading your query...
            </div>
          )}

          {/* ── Narrowing questions ──────────────────────────────────── */}
          {phase === "narrowing" && narrowQuestions && (
            <div style={{ paddingTop: 8 }}>
              <NarrowingFlow
                questions={narrowQuestions}
                dish={searchedDish}
                onComplete={refined => runSearch(refined)}
                dark={dark}
              />
            </div>
          )}

          {/* ── Error ────────────────────────────────────────────────── */}
          {phase === "error" && (
            <div style={{
              margin: "16px 0", padding: "14px 16px",
              background: redBg,
              borderLeft: `3px solid ${redColor}`,
              borderRadius: "0 8px 8px 0",
              fontFamily: "'Inter',sans-serif", fontSize: "0.875rem",
              color: redColor, lineHeight: 1.5,
            }}>
              {errMsg || "Something went wrong."}
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                {searchedDish && (
                  <button
                    onClick={retrySearch}
                    style={{
                      background: brand, border: "none", borderRadius: 6,
                      color: brandTxt, fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em",
                      padding: "6px 14px", cursor: "pointer",
                    }}
                  >RETRY</button>
                )}
                <button
                  onClick={reset}
                  style={{ background: "none", border: "none", cursor: "pointer", color: redColor, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}
                >New search</button>
              </div>
            </div>
          )}

          {/* ── Idle state ───────────────────────────────────────────────── */}
          {showIdle && (
            <>
              {/* ── Stale / resumed search banner ───────────────────────── */}
              {staleSearch && (
                <div style={{
                  margin: "16px 0 0",
                  background: accentBg,
                  border: `1px solid ${accentBdr}`,
                  borderRadius: 10, padding: "14px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                  <div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: "0.6875rem", color: accent,
                      textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4,
                    }}>{staleSearch.fresh ? "RESUMING SEARCH" : "PREVIOUS SEARCH TIMED OUT"}</div>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "0.9375rem", fontWeight: 600, color: cardText,
                    }}>{staleSearch.query}</div>
                    {!staleSearch.fresh && (
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: tertiary, marginTop: 2 }}>
                        Your previous search timed out. Try again?
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => { setStaleSearch(null); runSearch(staleSearch.query); }}
                      style={{
                        background: brand, border: "none", borderRadius: 8,
                        color: brandTxt, fontFamily: "'Inter', sans-serif",
                        fontSize: "0.875rem", fontWeight: 600,
                        padding: "8px 16px", cursor: "pointer",
                      }}
                    >{staleSearch.fresh ? "Continue" : "Try again"}</button>
                    <button
                      onClick={() => setStaleSearch(null)}
                      style={{
                        background: "none", border: `1px solid ${accentBdr}`, borderRadius: 8,
                        color: tertiary, fontFamily: "'Inter', sans-serif",
                        fontSize: "0.875rem", padding: "8px 12px", cursor: "pointer",
                      }}
                    >Dismiss</button>
                  </div>
                </div>
              )}

              {/* ── SECTION 3: NEAR YOU NOW — 2×3 square-card grid ────── */}
              {suggestions.length > 0 && (
                <section style={{ paddingTop: 28, paddingBottom: 24 }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: "0.75rem", fontWeight: 700, color: "#23413b",
                    textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 12,
                  textAlign: "center" }}>NEAR YOU NOW</div>
                  {/* Match CategoryBrowse card style exactly: same radius, padding, minHeight, fonts */}
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" as const }}>
                    {suggestions.slice(0, 6).map((s, i) => (
                      <div
                        key={i}
                        onClick={() => handleBrowse(s.text)}
                        style={{
                          background: "#10211e", border: "1px solid #2c4a44",
                          borderRadius: 12, padding: 14,
                          minHeight: 140, width: 160, flexShrink: 0,
                          cursor: "pointer",
                          display: "flex", flexDirection: "column",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#7fe3c8"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.22)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2c4a44"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.12)"; }}
                      >
                        {/* Initial — matches the "code" in query-type cards */}
                        <div style={{
                          fontFamily: "var(--font-orbitron),'Courier New',monospace",
                          fontSize: "1.75rem", fontWeight: 900, lineHeight: 1,
                          color: "rgba(127,227,200,0.25)", letterSpacing: "0.02em", marginBottom: 8,
                        }}>{s.initial}</div>
                        {/* Query text — matches the "name" line */}
                        <div style={{
                          fontFamily: "var(--font-orbitron),'Courier New',monospace",
                          fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.2,
                          color: "#7fe3c8", letterSpacing: "0.02em", marginBottom: 4,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                        }}>{s.text.split(" near ")[0]}</div>
                        {/* Descriptor */}
                        <div style={{
                          fontFamily: "'DM Sans','Inter',sans-serif",
                          fontSize: "0.72rem", color: "#8aa9a2", lineHeight: 1.3, flex: 1,
                        }}>{s.text.includes(" near ") ? `near ${s.text.split(" near ")[1]}` : "tap to search"}</div>
                        {/* Hint — matches "Tap to explore" */}
                        <div style={{
                          fontFamily: "'Sevastopol',Georgia,serif",
                          fontSize: 8, color: "#7fe3c8", opacity: 0.6,
                          textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 10,
                        }}>Tap to search</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── SECTION 4: QUERY TYPES + DISHES ─────────────────────── */}
              <SectionContent
                dark={dark}
                isSearching={isSearching}
                handleBrowse={handleBrowse}
              />
            </>
          )}

          {/* ── Piece 4: Restaurant confirm panel ──────────────────── */}
          {(confirmMatches || confirming) && phase === "idle" && (
            <div style={{ paddingTop: 20 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6875rem", color: accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                {confirming ? "LOCATING RESTAURANT..." : confirmMatches?.[0]?.googlePlaceId ? "WHICH LOCATION?" : "DID YOU MEAN?"}
              </div>
              {confirming && <div className="spin" style={{ borderColor: border, borderTopColor: accent, width: 20, height: 20 }} />}
              {confirmMatches && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {confirmMatches.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setConfirmMatches(null);
                        handleDeepDive(m.name, m.city || ddCity, undefined, undefined, m.googlePlaceId, m.address);
                      }}
                      style={{
                        background: cardBg, border: `1px solid ${border}`,
                        borderRadius: 10, padding: "14px 16px",
                        textAlign: "left", cursor: "pointer",
                        transition: "border-color 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = border; }}
                    >
                      <div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: text }}>{m.name}</div>
                        {m.address && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: secondary, marginTop: 3 }}>{m.address}</div>}
                        {m.neighborhood && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", color: tertiary, marginTop: 2 }}>{m.neighborhood}</div>}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: accent, flexShrink: 0, marginLeft: 12 }}>Deep Dive →</div>
                    </button>
                  ))}
                  <button
                    onClick={() => setConfirmMatches(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", marginTop: 4, padding: 0, textAlign: "left", textDecoration: "underline" }}
                  >Not what I meant — search instead</button>
                </div>
              )}
            </div>
          )}

          {/* ── Favorites ────────────────────────────────────────────── */}
          {showFavs && phase === "idle" && (
            <div style={{ paddingTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", fontWeight: 700, color: text }}>Saved Spots</div>
                <button onClick={() => setShowFavs(false)} style={{ background: "none", border: `1px solid ${border}`, borderRadius: 8, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", padding: "6px 12px", cursor: "pointer" }}>Close</button>
              </div>
              {favs.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", color: tertiary, lineHeight: 1.7 }}>
                  No saved spots yet.<br />Tap the heart on any result to save it.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {favs.map((f, i) => (
                    <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: text }}>{f.name}</div>
                        {f.neighborhood && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: secondary, marginTop: 2 }}>{f.neighborhood}</div>}
                      </div>
                      <button onClick={() => handleDeepDive(f.name, undefined, f.food_score)} style={{ background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 8, color: accent, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", fontWeight: 500, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}>Deep Dive</button>
                      <button onClick={() => saveFavs(favs.filter(fv => fv.name !== f.name))} style={{ background: "none", border: "none", cursor: "pointer", color: accent, fontSize: "1rem", padding: 4, flexShrink: 0 }}>♥</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Results ──────────────────────────────────────────────── */}
          {phase === "done" && meta && (
            <div style={{ paddingTop: 32, animation: fromCache ? "results-in 0.45s cubic-bezier(0.4,0,0.2,1) both" : undefined }}>
            <style>{`@keyframes results-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
              {/* Piece 1: Cached-result indicator */}
              {fromCache && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: dark ? "#1A1A1A" : "#F7F4F0",
                  border: `1px solid ${border}`, borderRadius: 8,
                  padding: "8px 14px", marginBottom: 12,
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem",
                  color: secondary,
                }}>
                  <span>Showing saved results</span>
                  <button
                    onClick={handleForceRefresh}
                    style={{ background: "none", border: "none", cursor: "pointer", color: accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", fontWeight: 600, padding: 0, textDecoration: "underline" }}
                  >Refresh</button>
                </div>
              )}
              {/* Results header + controls */}
              {(() => {
                // Pure honest ranking — no score floors, no padding.
                // Definitives = true top N by score. Mentions = next-ranked results that genuinely exist.
                const definitives = restaurants.slice(0, resultCount);
                // No score gate: mentions are simply the next ranked results below the definitive cut.
                const mentionCandidates = restaurants.slice(resultCount, resultCount + 5);
                const mentions = showMentions ? mentionCandidates : [];
                return (
                  <>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${border}` }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", color: text, flex: 1, minWidth: 0, textAlign: "center" }}>
                        <span style={{ fontWeight: 600, color: accent }}>{definitives.length} results</span>
                        {" "}for{" "}
                        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{meta.dish}</span>
                        {meta.city && <span style={{ color: secondary }}>{" "}near {meta.city}</span>}
                      </div>
                      {hasBack && <BackBtn onBack={goBack} dark={dark} />}
                      <button onClick={reset} style={{ background: "none", border: `1px solid ${border}`, borderRadius: 6, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", padding: "5px 10px", cursor: "pointer" }}>New search</button>
                    </div>

                    {/* Controls: result count + mentions toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                      {/* Count selector */}
                      <div style={{ display: "flex", background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                        {([5, 10] as const).map(n => (
                          <button key={n} onClick={() => setResultCount(n)} style={{
                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.10em",
                            padding: "5px 12px", border: "none", cursor: "pointer",
                            background: resultCount === n ? brand : "transparent",
                            color: resultCount === n ? brandTxt : accent,
                            transition: "background 0.15s",
                          }}>TOP {n}</button>
                        ))}
                      </div>
                      {/* Mentions toggle */}
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={showMentions}
                          onChange={e => setShowMentions(e.target.checked)}
                          style={{ accentColor: brand, width: 14, height: 14 }}
                        />
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: secondary, letterSpacing: "0.08em" }}>HONORABLE MENTIONS</span>
                      </label>
                    </div>

                    {/* Definitive result cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {definitives.filter(r => r != null).map((r, i) => (
                        <RestCard
                          key={i} r={r} i={i} expanded={expanded}
                          onToggle={j => setExpanded(expanded === j ? null : j)}
                          onDeepDive={(name, score, restaurantId) => handleDeepDive(name, meta.city, score, restaurantId)}
                          meta={meta} searchedDish={searchedDish}
                          isFav={isFav(r.name)} onToggleFav={toggleFav}
                          onAddToList={openAddToList}
                        />
                      ))}
                    </div>

                    {/* Honorable mentions section — shown when toggle is ON */}
                    {showMentions && (
                      <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${border}` }}>
                        <div style={{
                          fontFamily: "'IBM Plex Mono',monospace",
                          fontSize: "0.65rem", fontWeight: 700,
                          color: "#5f857d", letterSpacing: "0.22em",
                          textTransform: "uppercase", textAlign: "center",
                          marginBottom: 4,
                        }}>HONORABLE MENTIONS</div>
                        <div style={{
                          fontFamily: "'IBM Plex Mono',monospace",
                          fontSize: "0.6rem", color: secondary,
                          textAlign: "center", marginBottom: 14,
                          letterSpacing: "0.04em",
                        }}>Next-ranked results — real scores, less detail</div>
                        {mentions.length === 0 && (
                          <div style={{
                            fontFamily: "'IBM Plex Mono',monospace",
                            fontSize: "0.7rem", color: tertiary,
                            textAlign: "center", padding: "14px 0",
                            letterSpacing: "0.06em",
                          }}>No honorable mentions for this search</div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {mentions.map((r, i) => {
                            const sc = r.food_score ?? 5;
                            const scClr = sc >= 9 ? "#3fd98a" : sc >= 8 ? "#7bc24a" : sc >= 7 ? "#e8b133" : sc >= 6 ? "#e07b3a" : "#d64545";
                            return (
                              <button
                                key={i}
                                onClick={() => handleDeepDive(r.name, meta.city, r.food_score, r.restaurant_id)}
                                style={{
                                  background: cardBg, border: `1px solid ${boxBorder}`,
                                  borderRadius: 8, padding: "12px 16px",
                                  display: "flex", alignItems: "center", gap: 14,
                                  textAlign: "left", cursor: "pointer", width: "100%",
                                  transition: "border-color 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                                onMouseLeave={e => e.currentTarget.style.borderColor = boxBorder}
                              >
                                <div style={{
                                  fontFamily: "var(--font-orbitron),'Courier New',monospace",
                                  fontSize: "1.4rem", fontWeight: 900,
                                  color: scClr, lineHeight: 1, flexShrink: 0, width: 46,
                                }}>{sc.toFixed(1)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: "0.95rem", fontWeight: 700, color: cardText,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                  }}>{r.name}</div>
                                  <div style={{
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    fontSize: "0.68rem", color: tertiary, marginTop: 2,
                                  }}>
                                    {[r.neighborhood, r.venue_type, r.price_range].filter(Boolean).join(" · ")}
                                  </div>
                                  {r.win_reason && (
                                    <div style={{ fontFamily: "'DM Sans','Inter',sans-serif", fontSize: "0.8rem", color: cardSec, marginTop: 3, lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                      {r.win_reason}
                                    </div>
                                  )}
                                </div>
                                <div style={{ color: tertiary, fontSize: "0.85rem", flexShrink: 0 }}>→</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── Deep dive ────────────────────────────────────────────── */}
          {/* ── Compare ──────────────────────────────────────────────── */}
          {phase === "comparedone" && compareData && (
            <div style={{ marginLeft: -16, marginRight: -16 }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${border}` }}>
                {hasBack && <BackBtn onBack={goBack} dark={dark} />}
                <button onClick={reset} style={{ marginLeft: "auto", background: "none", border: `1px solid ${border}`, borderRadius: 6, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", padding: "5px 10px", cursor: "pointer" }}>New search</button>
              </div>
              <CompareResult data={compareData} originalScore={compareData._originalScore} onDeepDive={(name, _city, score) => handleDeepDive(name, ddCity, score, undefined)} />
            </div>
          )}

          {/* ── Market guide ─────────────────────────────────────────── */}
          {phase === "marketdone" && marketData && (
            <div style={{ marginLeft: -16, marginRight: -16 }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${border}` }}>
                {hasBack && <BackBtn onBack={goBack} dark={dark} />}
                <button onClick={reset} style={{ marginLeft: "auto", background: "none", border: `1px solid ${border}`, borderRadius: 6, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", padding: "5px 10px", cursor: "pointer" }}>New search</button>
              </div>
              <MarketGuideResult data={marketData} />
            </div>
          )}

          </>
          )}

        </main>

        {/* ── System status bar ────────────────────────────────────────── */}
        {["idle", "done", "error"].includes(phase) && (
          <footer style={{ padding: "24px 16px 28px", textAlign: "center", marginTop: 24 }}>
            {/* Amber rule */}
            <div style={{
              height: 1,
              background: dark ? "#7fe3c8" : "#7fe3c8",
              opacity: dark ? 0.4 : 0.2,
              marginBottom: 12,
            }} />
            <div style={{
              fontFamily: "'Sevastopol', Georgia, serif",
              fontSize: "0.5rem", color: tertiary,
              textTransform: "uppercase", letterSpacing: "0.25em",
            }}>
              SYS v1.3.0 // DISH REPORT ANALYTICAL
            </div>
          </footer>
        )}
      </div>

      {/* ── Terminal search overlay ─────────────────────────────────── */}
      <TerminalSearch
        isOpen={showTerminal}
        onSearch={(q, f) => { setShowTerminal(false); handleSearchFromBar(q, f, true); }}
        onClose={() => setShowTerminal(false)}
        onPlaceSelect={(placeId, name, address) => { setShowTerminal(false); handlePlaceSelect(placeId, name, address); }}
        onExactPlaceSearch={(q) => { setShowTerminal(false); handleExactPlaceSearch(q); }}
        locationHint={city}
      />

      {/* ── Full-screen loading overlay ─────────────────────────────── */}
      {isSearching && (
        <LoadingTracker
          query={loadingQuery}
          dish={searchedDish || loadingQuery}
          location={city}
          radius={radius}
          apiDone={apiComplete}
          onDone={handleAnalysisDone}
          onStop={stopSearch}
          searchMode={searchMode}
          tiles={activeTiles}
          resultCount={apiComplete ? restaurants.length : undefined}
        />
      )}

      {/* ── Cache-reveal: honest brief flash for cache hits ─────────── */}
      {phase === "cache-reveal" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9400,
          background: "#F2EEE8",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          animation: "cr-in 0.15s ease both",
        }}>
          <style>{`
            @keyframes cr-in  { from{opacity:0} to{opacity:1} }
            @keyframes cr-bar { from{width:0%}  to{width:100%} }
          `}</style>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: "0.65rem", color: "#A89F99", letterSpacing: "0.2em", marginBottom: 16 }}>
              DISH REPORT // CACHE
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#7fe3c8", letterSpacing: "0.07em", marginBottom: 8 }}>
              CACHED RESULT FOUND
            </div>
            <div style={{ fontSize: "0.72rem", color: "#6B6560", letterSpacing: "0.06em", marginBottom: 28 }}>
              loading from archive
            </div>
            <div style={{ width: 200, height: 2, background: "rgba(184,120,10,0.15)", borderRadius: 1, margin: "0 auto", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#7fe3c8", borderRadius: 1, animation: "cr-bar 0.7s cubic-bezier(0.4,0,0.2,1) both" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Add to list modal ──────────────────────────────────────────── */}
      {addToListModalJsx}

      {/* ── Sign-in nudge — one-time, dismissible, Lumon style ─────────── */}
      {showSignInNudge && !user && (
        <div style={{
          position: "fixed", bottom: 20, right: 16, left: 16,
          maxWidth: 360, marginLeft: "auto",
          background: "#10211e", border: "1px solid #2c4a44",
          borderRadius: 10, padding: "14px 16px",
          zIndex: 8000, boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", gap: 12,
          animation: "results-in 0.35s cubic-bezier(0.4,0,0.2,1) both",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.65rem", fontWeight: 700, color: "#7fe3c8", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
              SIGN IN
            </div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.82rem", color: "#d4e4df", lineHeight: 1.4 }}>
              Save spots, searches & lists across sessions.
            </div>
          </div>
          <button
            onClick={() => { router.push("/auth/signin"); }}
            style={{
              background: "#3d6b62", border: "1px solid #4d8377",
              borderRadius: 6, padding: "6px 14px",
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
              letterSpacing: "0.10em", color: "#eafaf4", cursor: "pointer",
              flexShrink: 0, whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#4d8377"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#3d6b62"; }}
          >SIGN IN</button>
          <button
            onClick={() => {
              setShowSignInNudge(false);
              try { sessionStorage.setItem("dr-signin-dismissed", "1"); } catch {}
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#5f857d", fontSize: 18, lineHeight: 1, padding: 4,
              flexShrink: 0, transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#7fe3c8"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#5f857d"; }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ background: "#F7F4F0", minHeight: "100vh" }} />}>
      <DishIntel />
    </Suspense>
  );
}
