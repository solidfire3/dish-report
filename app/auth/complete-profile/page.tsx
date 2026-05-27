'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const T = {
  bg:"#0C0C0C",card:"#141414",card2:"#1C1C1C",border:"#2A2A2A",border2:"#383838",
  text:"#F0EDE8",muted:"#888",dim:"#444",neon:"#FFB800",red:"#FF4444",
};

export default function CompleteProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/auth/signin");
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/signin"); return; }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName.trim() || null });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/");
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 10, padding: "24px 20px" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", letterSpacing: 2, color: T.neon, marginBottom: 4 }}>One More Thing</div>
          <div style={{ fontSize: "0.72rem", color: T.muted, marginBottom: 20 }}>Set a display name (optional)</div>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Parker"
              autoFocus
              style={{ background: T.card2, border: `1.5px solid ${T.border2}`, borderRadius: 6, padding: "10px 12px", color: T.text, fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", outline: "none" }}
            />
            {error && <div style={{ fontSize: "0.7rem", color: T.red }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={loading} style={{ flex: 1, background: T.neon, border: "none", borderRadius: 6, color: "#000", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.52rem", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", padding: "11px", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
                {loading ? "Saving..." : "Save & Continue"}
              </button>
              <button type="button" onClick={() => router.push("/")} style={{ background: "none", border: `1px solid ${T.border2}`, color: T.dim, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.44rem", letterSpacing: 2, textTransform: "uppercase", padding: "11px 14px", borderRadius: 6, cursor: "pointer" }}>
                Skip
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
