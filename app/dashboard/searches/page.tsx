'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const T = {
  bg:"#0C0C0C",card:"#141414",card2:"#1C1C1C",border:"#2A2A2A",border2:"#383838",
  text:"#F0EDE8",muted:"#888",dim:"#444",neon:"#FFB800",neonGlow:"#FFB80033",blue:"#4A9EFF",red:"#FF4444",
};

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
  }, []);

  const handleResearch = (s: SavedSearch) => {
    const params = new URLSearchParams({
      dish: s.dish,
      city: s.city,
      locMode: s.loc_mode,
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
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: T.card, padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 50, borderBottom: `1px solid ${T.neon}44`, boxShadow: `0 0 20px ${T.neon}22` }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: 3, color: T.neon }}>My Searches</div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 16px", textAlign: "center", color: T.muted, fontSize: "0.8rem" }}>Loading...</div>
      ) : searches.length === 0 ? (
        <div style={{ padding: "60px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: "0.8rem", color: T.muted, lineHeight: 1.7 }}>No saved searches yet.<br />Your recent dish searches will appear here.</div>
          <button onClick={() => router.push("/")} style={{ marginTop: 18, background: T.neon, border: "none", borderRadius: 6, color: "#000", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.5rem", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", padding: "10px 18px", cursor: "pointer" }}>Start Searching</button>
        </div>
      ) : (
        <div>
          {searches.map(s => (
            <div key={s.id} style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.93rem", fontWeight: 700, color: T.text, marginBottom: 3 }}>{s.dish}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.67rem", color: T.muted }}>{locLabel(s)}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.42rem", letterSpacing: 1, color: T.dim }}>{timeAgo(s.created_at)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                <button onClick={() => handleResearch(s)} style={{ background: `${T.neon}15`, border: `1px solid ${T.neon}44`, color: T.neon, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.4rem", letterSpacing: 2, textTransform: "uppercase", padding: "5px 9px", borderRadius: 4, cursor: "pointer" }}>
                  Re-search
                </button>
                <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: "0.8rem", padding: "4px" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
