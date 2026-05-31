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
import { LoadingTracker }                           from "@/components/LoadingTracker";
import { RestCard }                                 from "@/components/RestaurantCard";
import { Browse }                                   from "@/components/CategoryBrowse";
import { DeepDiveResult, MarketGuideResult, CompareResult } from "@/components/DeepDive";

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
  ];
  if (h < 15) return [
    { text: `Best lunch near ${locationLabel}`, initial: "L" },
    { text: "Birria tacos open right now", initial: "B" },
    { text: "Top ramen spots near you", initial: "R" },
  ];
  if (h < 22) return [
    { text: `Top dinner spots near ${locationLabel}`, initial: "D" },
    { text: "Korean BBQ worth the wait tonight", initial: "K" },
    { text: "Best pasta open for dinner", initial: "P" },
  ];
  return [
    { text: `Open late near ${locationLabel}`, initial: "L" },
    { text: "Late night tacos or ramen", initial: "T" },
    { text: "KBBQ spots still open now", initial: "K" },
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
function NearYouCard({ suggestion, dark, onSearch }: {
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
        background: dark ? "#161616" : "#FFFFFF",
        borderLeft: "3px solid #B8780A",
        borderTop: `1px solid ${dark ? "#2C2C2C" : "#E8E3DC"}`,
        borderRight: `1px solid ${dark ? "#2C2C2C" : "#E8E3DC"}`,
        borderBottom: `1px solid ${dark ? "#2C2C2C" : "#E8E3DC"}`,
        borderRadius: 10,
        boxShadow: hov
          ? "0 4px 12px rgba(0,0,0,0.10)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Initial */}
      <div style={{
        fontFamily: "var(--font-orbitron), 'Courier New', monospace",
        fontSize: "1.5rem", fontWeight: 700,
        color: "#B8780A", lineHeight: 1,
        minWidth: 28, flexShrink: 0,
      }}>{suggestion.initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.9375rem", fontWeight: 600,
          color: dark ? "#F0EDE8" : "#1C1917",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{suggestion.text}</div>
        <div style={{
          fontFamily: "'Sevastopol', Georgia, serif",
          fontSize: 9, color: dark ? "#6B6866" : "#A89F99",
          textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 2,
        }}>Tap to search</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? "#6B6866" : "#A89F99"} strokeWidth="2" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── CONTEXT FILTER ───────────────────────────────────────────────────────────
function ContextFilter({ icon, label, options, value, onChange, dark }: {
  icon: string; label: string; options: string[];
  value: string; onChange: (v: string) => void; dark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = !!value;
  const bg     = dark ? "#1F1F1F" : "#FFFFFF";
  const bord   = dark ? (active ? "#FFB800" : "#2C2C2C") : (active ? "#B8780A" : "#D4CBC0");
  const clr    = dark ? (active ? "#FFB800" : "#9A9390") : (active ? "#B8780A" : "#6B6560");

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          height: 36, padding: "0 14px",
          background: bg, border: `1px solid ${bord}`,
          borderRadius: 20, cursor: "pointer",
          fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
          fontWeight: active ? 600 : 400, color: clr,
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
          background: dark ? "#1A1A1A" : "#FFFFFF",
          border: `1px solid ${dark ? "#2C2C2C" : "#E8E3DC"}`,
          borderRadius: 10, padding: 6, minWidth: 140,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {value && (
            <button onClick={() => { onChange(""); setOpen(false); }}
              style={{
                background: "none", border: "none", padding: "7px 10px",
                textAlign: "left", cursor: "pointer", borderRadius: 6,
                fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                color: dark ? "#EF4444" : "#991B1B",
              }}>Clear</button>
          )}
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                background: value === opt ? (dark ? "#2A2010" : "#FDF3E3") : "none",
                border: "none", padding: "8px 10px",
                textAlign: "left", cursor: "pointer", borderRadius: 6,
                fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                color: value === opt ? (dark ? "#FFB800" : "#B8780A") : (dark ? "#F0EDE8" : "#1C1917"),
                fontWeight: value === opt ? 600 : 400,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = dark ? "#232323" : "#F7F4F0"; }}
              onMouseLeave={e => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function DishIntel() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const abortRef      = useRef<AbortController | null>(null);
  const wasHiddenRef  = useRef(false);
  const autoSearchFired = useRef(false);

  // ── Dark mode ────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("dr-dark") === "1";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  const toggleDark = () => {
    setDark(v => {
      const next = !v;
      localStorage.setItem("dr-dark", next ? "1" : "0");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  // ── Location ─────────────────────────────────────────────────────────────
  const [city,    setCity]    = useState("San Diego");
  const [locMode, setLocMode] = useState("city");
  const [area,    setArea]    = useState("");
  const [radius,  setRadius]  = useState(5);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

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
  const [lstep,         setLstep]        = useState(0);
  const [searchedDish,  setSearchedDish] = useState("");
  const [loadingQuery,  setLoadingQuery]  = useState(""); // what LoadingTracker displays
  const [narrowQuestions, setNarrowQuestions] = useState<NarrowQuestion[] | null>(null);
  const [restaurants,   setRestaurants]  = useState<Restaurant[]>([]);
  const [meta,          setMeta]         = useState<SearchMeta | null>(null);
  const [expanded,      setExpanded]     = useState<number | null>(null);
  const [loadingMore,   setLoadingMore]  = useState(false);
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
    client.auth.getUser().then((res: { data: { user: User | null } }) => setUser(res.data.user));
    const { data: { subscription } } = client.auth.onAuthStateChange((_: string, session: Session | null) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Background persistence — track when tab goes hidden
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") wasHiddenRef.current = true; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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
    saveFavs(isFav(r.name) ? favs.filter(f => f.name !== r.name) : [...favs, r as Fav]);
  };

  // ─── LIST MANAGEMENT ──────────────────────────────────────────────────────
  const openAddToList = (target: AddToListTarget) => {
    if (!user) { router.push("/auth/signin"); return; }
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
    const { data: list } = await sb().from("lists").insert({ name: newListName.trim() }).select().single();
    if (list) { setUserLists(prev => [{ id: list.id, name: list.name }, ...prev]); await addToList(list.id); }
    setSavingList(false); setAddToListTarget(null); setNewListName("");
  };

  // ─── SEARCH ────────────────────────────────────────────────────────────────
  const stopSearch = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
  };

  // Proportional stage timing: 8%, 8%, 15%, 15%, 25%, 25% of ~20s call
  // Step 6 ("Building your report") is only set when the API returns.
  function startStageTimer(onStep: (s: number) => void): () => void {
    // Steps 1-5 only (96% max). Step 6 is set exclusively on API return.
    const cumulativeMs = [1400, 2800, 5600, 8600, 13400];
    const ids = cumulativeMs.map((ms, i) =>
      setTimeout(() => onStep(i + 1), ms)
    );
    return () => ids.forEach(clearTimeout);
  }

  const runSearch = async (
    d: string,
    searchCity = city,
    searchLocMode = locMode,
    searchArea = area,
    searchRadius = radius
  ) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    pushNav();
    setPhase("analyzing"); setExpanded(null); setLstep(0);
    setSearchedDish(d); setLoadingQuery(d); setNarrowQuestions(null);
    const stopTimer = startStageTimer(s => setLstep(s));

    try {
      const data = await apiFetch(
        "/api/search",
        { mode: "search", dish: d, city: searchCity, area: searchArea, locMode: searchLocMode, radius: searchRadius, exclude: [] },
        ctrl.signal
      );
      stopTimer();
      setLstep(6); // advance to final stage only on API return
      setMeta({ dish: data.dish, city: data.city });
      const res = (Array.isArray(data.results) ? data.results : []) as Restaurant[];
      setRestaurants(res.map((r, i) => ({ ...r, rank: i + 1 })));
      if (wasHiddenRef.current) { setResultsReady(true); wasHiddenRef.current = false; }
      setPhase("done");
      abortRef.current = null;
    } catch (e) {
      stopTimer();
      abortRef.current = null;
      if (e instanceof Error && e.name === "AbortError") return;
      setErrMsg(e instanceof Error ? e.message : "Analysis failed");
      setPhase("error");
    }
  };

  // Unified search handler — called by SearchBar with (query, filters)
  const handleSearchFromBar = async (q: string, filters: FilterState) => {
    if (!q.trim()) return;
    const searchRadius = filters.radius || radius;

    // Append filter context to query for API
    let enriched = q;
    if (filters.dineMode)  enriched += ` ${filters.dineMode}`;
    if (filters.openNow)   enriched += ` open now`;
    if (filters.timeOfDay) enriched += ` ${filters.timeOfDay}`;
    if (filters.priceRange.length) enriched += ` ${filters.priceRange.join("")}`;

    setNarrowQuestions(null);
    setPhase("classifying");

    try {
      const cls = await apiFetch("/api/search", { mode: "classify", dish: enriched });
      if (cls.broad && cls.questions?.length) {
        setNarrowQuestions(cls.questions);
        setPhase("narrowing");
        setSearchedDish(enriched);
      } else {
        await runSearch(enriched, city, locMode, area, searchRadius);
      }
    } catch {
      await runSearch(enriched, city, locMode, area, searchRadius);
    }
  };

  const loadMore = async () => {
    if (loadingMore) return; setLoadingMore(true);
    try {
      const data = await apiFetch("/api/search", {
        mode: "search", dish: searchedDish, city, area, locMode, radius,
        exclude: restaurants.map(r => r.name),
      });
      const start = restaurants.length + 1;
      const more  = (Array.isArray(data.results) ? data.results : []) as Restaurant[];
      setRestaurants(p => [...p, ...more.map((r, i) => ({ ...r, rank: start + i }))]);
    } catch {} finally { setLoadingMore(false); }
  };

  const handleBrowse = (d: string) => { setNarrowQuestions(null); runSearch(d); };

  // ─── DEEP DIVE ─────────────────────────────────────────────────────────────
  const handleCompare = async (r: number, currentData: DeepDiveData, mode = "similar") => {
    pushNav(); setPhase("analyzing"); setLstep(0); setCompareData(null); setNarrowQuestions(null);
    setLoadingQuery(`Comparing near ${currentData?.name || "this spot"}`);
    const loc = currentData?.address || currentData?.neighborhood
      ? `within ${r} miles of ${currentData?.address || currentData?.neighborhood}`
      : `within ${r} miles`;
    const stopTimer = startStageTimer(s => setLstep(s));
    try {
      const data = await apiFetch("/api/compare", {
        name: currentData?.name, foodScore: currentData?.food_score,
        cuisine: currentData?.cuisine || "various", radius: r, location: loc, mode,
      });
      stopTimer(); setLstep(6);
      setCompareData({ ...data, _originalScore: currentData?.food_score, _mode: mode });
      setPhase("comparedone");
    } catch (e) { stopTimer(); setErrMsg(e instanceof Error ? e.message : "Comparison failed"); setPhase("error"); }
  };

  const handleMarketGuide = async (name: string | undefined, cityStr?: string) => {
    pushNav(); const c = cityStr || ddCity;
    setConfirmMatches(null); setPhase("analyzing"); setLstep(0); setNarrowQuestions(null);
    setLoadingQuery(name || "Market guide");
    const stopTimer = startStageTimer(s => setLstep(s));
    try {
      const data = await apiFetch("/api/market", { name, city: c });
      stopTimer(); setLstep(6);
      setMarketData({ ...data, vendors: Array.isArray(data.vendors) ? data.vendors : [] });
      setPhase("marketdone");
    } catch (e) { stopTimer(); setErrMsg(e instanceof Error ? e.message : "Market guide failed"); setPhase("error"); }
  };

  const handleDeepDive = async (name: string, cityStr?: string) => {
    pushNav(); const c = cityStr || ddCity;
    setConfirmMatches(null); setPhase("analyzing"); setLstep(0); setNarrowQuestions(null);
    setLoadingQuery(name);
    const stopTimer = startStageTimer(s => setLstep(s));
    try {
      const data = await apiFetch("/api/deepdive", { mode: "deepdive", name, city: c });
      stopTimer(); setLstep(6); setDeepData(data); setPhase("deepdone");
    } catch (e) { stopTimer(); setErrMsg(e instanceof Error ? e.message : "Deep dive failed"); setPhase("error"); }
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

  // ─── THEME ────────────────────────────────────────────────────────────────
  const bg       = dark ? "#0A0A0A" : "#EDE8E0";
  const cardBg   = dark ? "#161616" : "#FFFFFF";
  const border   = dark ? "#2C2C2C" : "#E8E3DC";
  const text     = dark ? "#F0EDE8" : "#1C1917";
  const secondary= dark ? "#9A9390" : "#6B6560";
  const tertiary = dark ? "#6B6866" : "#A89F99";
  const accent   = dark ? "#FFB800" : "#B8780A";
  const accentBg = dark ? "#2A2010" : "#FDF3E3";
  const accentBdr= dark ? "#4A3810" : "#F0D5A0";
  const redColor = dark ? "#EF4444" : "#9B1C1C";
  const redBg    = dark ? "#2D1B1B" : "#FEF2F2";

  // ─── ADD TO LIST MODAL ────────────────────────────────────────────────────
  const AddToListModal = () => {
    if (!addToListTarget) return null;
    return (
      <div onClick={() => setAddToListTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: cardBg, borderRadius: "14px 14px 0 0", width: "100%", maxWidth: 480, padding: "20px 16px 40px", border: `1px solid ${border}`, maxHeight: "80vh", overflowY: "auto" }}>
          <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", fontWeight: 400, color: "#B8780A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Add to List</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: text, marginBottom: 16 }}>{addToListTarget.name}</div>

          <div style={{ background: dark ? "#232323" : "#FDFCFB", border: `1px solid ${border}`, borderRadius: 10, padding: "12px", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", fontWeight: 400, color: "#B8780A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Create new list</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="List name..."
                onKeyDown={e => e.key === "Enter" && newListName.trim() && createAndAdd()}
                style={{ flex: 1, background: cardBg, border: `1.5px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: text, fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", outline: "none" }} />
              <button onClick={createAndAdd} disabled={!newListName.trim() || savingList}
                style={{ background: accent, border: "none", borderRadius: 8, color: "#000", fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", fontWeight: 600, padding: "0 16px", cursor: "pointer", opacity: !newListName.trim() || savingList ? 0.5 : 1 }}>
                {savingList ? "..." : "Create"}
              </button>
            </div>
          </div>

          {loadingLists && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: secondary, padding: "8px 0" }}>Loading lists...</div>}
          {!loadingLists && userLists.length > 0 && (
            <>
              <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", fontWeight: 400, color: "#B8780A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Add to existing list</div>
              {userLists.map(l => (
                <button key={l.id} onClick={() => addToList(l.id)} disabled={savingList}
                  style={{ width: "100%", background: dark ? "#232323" : "#FDFCFB", border: `1px solid ${border}`, borderRadius: 8, padding: "11px 12px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: text, fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", textAlign: "left", opacity: savingList ? 0.6 : 1 }}>
                  <span>{l.name}</span><span style={{ color: tertiary }}>+</span>
                </button>
              ))}
            </>
          )}
          {!loadingLists && userLists.length === 0 && !newListName && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: tertiary, padding: "4px 0" }}>No lists yet — create one above.</div>
          )}
          <button onClick={() => setAddToListTarget(null)} style={{ marginTop: 12, width: "100%", background: "none", border: `1px solid ${border}`, borderRadius: 8, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", padding: "11px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  };

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
            <SearchBar onSearch={handleSearchFromBar} onStop={stopSearch} isSearching={isSearching} dark={dark} />
          </div>
        )}

        {/* ── SECTION 2: HERO SEARCH BAND — idle only ─────────────────── */}
        {showIdle && (
          <div style={{
            width: "100%", position: "relative", overflow: "hidden",
            background: dark
              ? "linear-gradient(135deg, #0A0A0A 0%, #1A1000 100%)"
              : "linear-gradient(135deg, #1C1917 0%, #2D1F0E 100%)",
          }}>
            {/* Ambient dot grid */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "radial-gradient(circle, rgba(255,184,0,0.06) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              animation: "dr-ambient-grid 20s linear infinite",
            }} />

            <div style={{ position: "relative", zIndex: 1, padding: "20px 20px 16px", maxWidth: 900, margin: "0 auto" }}>
              {/* TRY // + rotating example */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, minHeight: 18 }}>
                <span style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: 10, color: "rgba(255,184,0,0.7)",
                  textTransform: "uppercase", letterSpacing: "0.2em", flexShrink: 0,
                }}>TRY //</span>
                <span key={heroExIdx} style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: 13, color: "rgba(255,184,0,0.6)",
                  animation: "fadeIn 0.4s ease",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{HERO_EXAMPLES[heroExIdx]}</span>
              </div>

              {/* Search bar — always light/white inside the dark band */}
              <SearchBar
                onSearch={handleSearchFromBar}
                onStop={stopSearch}
                isSearching={isSearching}
                dark={false}
              />

              {/* Quick filter pills */}
              <div style={{
                display: "flex", gap: 8, marginTop: 12,
                overflowX: "auto", scrollbarWidth: "none" as const,
                paddingBottom: 4,
              }}>
                {HERO_FILTERS.map(f => (
                  <button
                    key={f.label}
                    onClick={() => runSearch(f.query)}
                    style={{
                      background: "rgba(255,184,0,0.06)",
                      border: "1px solid rgba(255,184,0,0.3)",
                      borderRadius: 20, padding: "0 16px", height: 32,
                      fontFamily: "'Sevastopol', Georgia, serif",
                      fontSize: 11, color: "rgba(255,184,0,0.7)",
                      textTransform: "uppercase", letterSpacing: "0.12em",
                      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                      transition: "background 0.15s, border-color 0.15s",
                      display: "flex", alignItems: "center",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,184,0,0.12)";
                      e.currentTarget.style.borderColor = "rgba(255,184,0,0.6)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,184,0,0.06)";
                      e.currentTarget.style.borderColor = "rgba(255,184,0,0.3)";
                    }}
                  >{f.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Main content ────────────────────────────────────────────── */}
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>

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
              margin: "16px 0", padding: "12px 16px",
              background: redBg,
              borderLeft: `3px solid ${redColor}`,
              borderRadius: "0 8px 8px 0",
              fontFamily: "'Inter',sans-serif", fontSize: "0.875rem",
              color: redColor, lineHeight: 1.5,
            }}>
              {errMsg || "Something went wrong. Try again."}
              <button onClick={reset} style={{ display: "block", marginTop: 8, background: "none", border: "none", cursor: "pointer", color: redColor, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}>
                Try again
              </button>
            </div>
          )}

          {/* ── Idle state ───────────────────────────────────────────────── */}
          {showIdle && (
            <>
              {/* ── SECTION 3: NEAR YOU NOW ─────────────────────────────── */}
              {suggestions.length > 0 && (
                <section style={{ paddingTop: 28, paddingBottom: 24 }}>
                  <div style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.6875rem", color: "#B8780A",
                    textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12,
                  }}>NEAR YOU NOW //</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {suggestions.map((s, i) => (
                      <NearYouCard key={i} suggestion={s} dark={dark} onSearch={() => handleBrowse(s.text)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── SECTION 4: CATEGORY CAROUSEL ────────────────────────── */}
              <section style={{ paddingBottom: 24 }}>
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.6875rem", color: "#B8780A",
                  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12,
                }}>SELECT QUERY TYPE //</div>
                <Browse onSelect={handleBrowse} disabled={isSearching} dark={dark} />
              </section>

              {/* ── SECTION 5: CONTEXTUAL FILTERS ───────────────────────── */}
              <section style={{ paddingBottom: 32 }}>
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.6875rem", color: "#B8780A",
                  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12,
                }}>SEARCH PARAMETERS //</div>
                <div style={{
                  display: "flex", gap: 8, overflowX: "auto",
                  scrollbarWidth: "none" as const, paddingBottom: 4,
                }}>
                  <ContextFilter icon="📍" label="Distance" dark={dark}
                    options={["1 mi", "2 mi", "5 mi", "10 mi"]}
                    value={ctxRadius} onChange={setCtxRadius} />
                  <ContextFilter icon="🕐" label="Time" dark={dark}
                    options={["Now Open", "After 10pm", "Lunch", "Dinner"]}
                    value={ctxTime} onChange={setCtxTime} />
                  <ContextFilter icon="💰" label="Budget" dark={dark}
                    options={["$", "$$", "$$$", "$$$$"]}
                    value={ctxBudget} onChange={setCtxBudget} />
                  <ContextFilter icon="🍱" label="Mode" dark={dark}
                    options={["Dine-in", "Takeout", "Delivery"]}
                    value={ctxMode} onChange={setCtxMode} />
                </div>
              </section>
            </>
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
                      <button onClick={() => handleDeepDive(f.name)} style={{ background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 8, color: accent, fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", fontWeight: 500, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}>Deep Dive</button>
                      <button onClick={() => saveFavs(favs.filter(fv => fv.name !== f.name))} style={{ background: "none", border: "none", cursor: "pointer", color: accent, fontSize: "1rem", padding: 4, flexShrink: 0 }}>♥</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Results ──────────────────────────────────────────────── */}
          {phase === "done" && meta && (
            <div style={{ paddingTop: 32 }}>
              {/* Results header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${border}` }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", color: text, flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: accent }}>{restaurants.length} results</span>
                  {" "}for{" "}
                  <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{meta.dish}</span>
                  {meta.city && <span style={{ color: secondary }}>{" "}near {meta.city}</span>}
                </div>
                {hasBack && <BackBtn onBack={goBack} dark={dark} />}
                <button
                  onClick={reset}
                  style={{ background: "none", border: `1px solid ${border}`, borderRadius: 6, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", padding: "5px 10px", cursor: "pointer" }}
                >New search</button>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {restaurants.filter(r => r != null).map((r, i) => (
                  <RestCard
                    key={i} r={r} i={i} expanded={expanded}
                    onToggle={j => setExpanded(expanded === j ? null : j)}
                    onDeepDive={name => handleDeepDive(name, meta.city)}
                    meta={meta} searchedDish={searchedDish}
                    isFav={isFav(r.name)} onToggleFav={toggleFav}
                    onAddToList={openAddToList}
                  />
                ))}
              </div>

              {/* Load more */}
              <div style={{ padding: "20px 0 8px", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    background: cardBg, border: `1px solid ${border}`,
                    borderRadius: 8, color: secondary,
                    fontFamily: "'Inter',sans-serif", fontSize: "0.8rem",
                    padding: "10px 24px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? <><div className="spin" style={{ borderColor: border, borderTopColor: accent }} />Loading...</> : "Load 5 more results"}
                </button>
              </div>
            </div>
          )}

          {/* ── Deep dive ────────────────────────────────────────────── */}
          {phase === "deepdone" && deepData && (
            <div style={{ marginLeft: -16, marginRight: -16 }}>
              <DeepDiveResult
                data={deepData} city={ddCity}
                isFav={isFav(deepData.name)}
                onFav={() => toggleFav({ name: deepData.name, neighborhood: deepData.neighborhood, venue_type: deepData.venue_type, price_range: deepData.price_range, food_score: deepData.food_score })}
                onCompare={handleCompare}
                onMarket={name => handleMarketGuide(name, ddCity)}
                onAddToList={openAddToList}
                onBack={goBack}
              />
            </div>
          )}

          {/* ── Compare ──────────────────────────────────────────────── */}
          {phase === "comparedone" && compareData && (
            <div style={{ marginLeft: -16, marginRight: -16 }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${border}` }}>
                {hasBack && <BackBtn onBack={goBack} dark={dark} />}
                <button onClick={reset} style={{ marginLeft: "auto", background: "none", border: `1px solid ${border}`, borderRadius: 6, color: secondary, fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", padding: "5px 10px", cursor: "pointer" }}>New search</button>
              </div>
              <CompareResult data={compareData} originalScore={compareData._originalScore} onDeepDive={(name) => handleDeepDive(name, ddCity)} />
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

        </main>

        {/* ── System status bar ────────────────────────────────────────── */}
        {["idle", "done", "error"].includes(phase) && (
          <footer style={{ padding: "24px 16px 28px", textAlign: "center", marginTop: 24 }}>
            {/* Amber rule */}
            <div style={{
              height: 1,
              background: dark ? "#FFB800" : "#C8860A",
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

      {/* ── Full-screen loading overlay ─────────────────────────────── */}
      {(isSearching || resultsReady) && (
        <LoadingTracker
          step={lstep}
          query={loadingQuery}
          onStop={isSearching ? stopSearch : undefined}
          resultsReady={resultsReady}
          onSeeResults={() => setResultsReady(false)}
        />
      )}

      {/* ── Add to list modal ──────────────────────────────────────────── */}
      <AddToListModal />
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
