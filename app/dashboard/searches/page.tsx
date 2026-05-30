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
};

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/signin"); return; }
      supabase
        .from("user_searches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => { setSearches(data ?? []); setLoading(false); });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResearch = (s: SavedSearch) => {
    const params = new URLSearchParams({
      dish: s.dish, city: s.city, locMode: s.loc_mode,
      ...(s.area ? { area: s.area } : {}),
      ...(s.radius ? { radius: String(s.radius) } : {}),
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
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleResearch(s)}
                  style={{
                    background: "#FDF3E3", border: "1px solid #F0D5A0",
                    color: "#C8860A", fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem", fontWeight: 600,
                    padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F0D5A0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#FDF3E3"; }}
                >Search again</button>
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
