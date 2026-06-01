'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type SavedSearch = {
  id: string;
  dish: string;
  city: string;
  area: string | null;
  loc_mode: string;
  radius: number | null;
  created_at: string;
  search_cache_id: string | null;
};

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/auth/signin"); return; }
      supabase
        .from("user_searches")
        .select("id, dish, city, area, loc_mode, radius, created_at, search_cache_id")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data, error }) => {
          console.log("[dashboard:searches] rows=", data?.length, "error=", error?.message ?? null);
          console.log("[dashboard:searches] cache_ids=", data?.map(s => ({ dish: s.dish, cache_id: s.search_cache_id })));
          setSearches(data ?? []);
          setLoading(false);
        });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open stored results instantly — zero API calls, zero Anthropic calls
  const handleOpenResults = async (s: SavedSearch) => {
    console.log("[dashboard:open] search_cache_id=", s.search_cache_id, "dish=", s.dish);
    if (!s.search_cache_id) {
      console.log("[dashboard:open] no cache_id — falling back to handleResearch");
      handleResearch(s);
      return;
    }
    setOpening(s.id);
    try {
      const { data, error } = await supabase
        .from("searches")
        .select("results")
        .eq("id", s.search_cache_id)
        .single();
      console.log("[dashboard:open] searches fetch: data=", !!data, "error=", error?.message ?? null);
      const blob = data?.results as { dish?: string; city?: string; results?: unknown[] } | null;
      const restaurants = Array.isArray(blob?.results) ? blob.results : [];
      console.log("[dashboard:open] restaurant count=", restaurants.length);
      if (restaurants.length === 0) { handleResearch(s); return; }
      sessionStorage.setItem("dr-open-search-results", JSON.stringify({
        dish: blob?.dish || s.dish,
        city: blob?.city || s.city,
        restaurants,
      }));
      router.push("/");
    } catch (e) {
      console.log("[dashboard:open] exception:", e);
      handleResearch(s);
    } finally {
      setOpening(null);
    }
  };

  const handleResearch = (s: SavedSearch) => {
    const params = new URLSearchParams({
      dish: s.dish, city: s.city, locMode: s.loc_mode,
      ...(s.area   ? { area:   s.area }            : {}),
      ...(s.radius ? { radius: String(s.radius) }  : {}),
      autoSearch: "1",
    });
    router.push(`/?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_searches").delete().eq("id", id);
    setSearches(prev => prev.filter(s => s.id !== id));
  };

  const locLabel = (s: SavedSearch) =>
    s.loc_mode === "area" && s.area
      ? `${s.area}${s.radius ? ` · ${s.radius}mi` : ""}`
      : s.city;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{ background: "#F7F4F0", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{
        background: "#F7F4F0", borderBottom: "1px solid #E8E3DC",
        padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 56,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: "transparent", border: "1px solid #D4CBC0",
            color: "#6B6560", cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#C8860A"; e.currentTarget.style.borderColor = "#C8860A"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#6B6560"; e.currentTarget.style.borderColor = "#D4CBC0"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.2rem", fontWeight: 700, color: "#1C1917",
        }}>My Searches</div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 16px", textAlign: "center", color: "#A89F99", fontSize: "0.875rem" }}>
          Loading...
        </div>
      ) : searches.length === 0 ? (
        <div style={{ padding: "60px 16px", textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
            No searches yet
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6B6560", lineHeight: 1.65, marginBottom: 24 }}>
            Your recent dish searches will appear here.
          </div>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "#C8860A", border: "none", borderRadius: 10,
              color: "#FFFFFF", fontFamily: "'Inter', sans-serif",
              fontSize: "0.875rem", fontWeight: 600,
              padding: "12px 24px", cursor: "pointer",
            }}
          >Start Searching</button>
        </div>
      ) : (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {searches.map(s => (
            <div
              key={s.id}
              style={{
                background: "#FFFFFF", borderBottom: "1px solid #E8E3DC",
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem", fontWeight: 700, color: "#1C1917", marginBottom: 4,
                }}>{s.dish}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", color: "#6B6560" }}>{locLabel(s)}</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.72rem", color: "#A89F99",
                  }}>{timeAgo(s.created_at)}</span>
                  {s.search_cache_id && (
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.68rem", color: "#C8860A",
                      background: "#FDF3E3", border: "1px solid #F0D5A0",
                      borderRadius: 4, padding: "1px 5px",
                    }}>cached</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleOpenResults(s)}
                  disabled={opening === s.id}
                  style={{
                    background: s.search_cache_id ? "#C8860A" : "#FDF3E3",
                    border: s.search_cache_id ? "none" : "1px solid #F0D5A0",
                    color: s.search_cache_id ? "#FFFFFF" : "#C8860A",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem", fontWeight: 600,
                    padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                    opacity: opening === s.id ? 0.6 : 1,
                    transition: "background 0.15s, opacity 0.15s",
                  }}
                  onMouseEnter={e => { if (!s.search_cache_id) e.currentTarget.style.background = "#F0D5A0"; }}
                  onMouseLeave={e => { if (!s.search_cache_id) e.currentTarget.style.background = "#FDF3E3"; }}
                >
                  {opening === s.id ? "Opening…" : s.search_cache_id ? "Open results" : "Search again"}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#A89F99", fontSize: "1rem", padding: "4px 8px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#991B1B"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#A89F99"; }}
                  aria-label="Delete search"
                >×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
