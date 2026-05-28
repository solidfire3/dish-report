'use client';
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const T = {
  bg:"#0C0C0C",card:"#141414",card2:"#1C1C1C",border:"#2A2A2A",border2:"#383838",
  text:"#F0EDE8",muted:"#888",dim:"#444",neon:"#FFB800",green:"#2ECC71",red:"#FF4444",
};

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: 3, color: T.neon, textShadow: `0 0 16px ${T.neon}66`, marginBottom: 6 }}>DISH REPORT</div>
          <div style={{ fontSize: "0.72rem", color: T.muted }}>Sign in to save searches, favorites, and lists</div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 10, padding: "24px 20px" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>📬</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: T.text, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: "0.72rem", color: T.muted, lineHeight: 1.6 }}>
                We sent a magic link to <span style={{ color: T.neon }}>{email}</span>.<br />
                Click it to sign in — no password needed.
              </div>
              <button onClick={() => { setSent(false); setEmail(""); }} style={{ marginTop: 18, background: "none", border: `1px solid ${T.border2}`, color: T.dim, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.44rem", letterSpacing: 2, textTransform: "uppercase", padding: "7px 14px", borderRadius: 5, cursor: "pointer" }}>
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.44rem", letterSpacing: 2, color: T.dim, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  style={{ width: "100%", background: T.card2, border: `1.5px solid ${T.border2}`, borderRadius: 6, padding: "10px 12px", color: T.text, fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {error && <div style={{ fontSize: "0.7rem", color: T.red, background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 5, padding: "6px 10px" }}>{error}</div>}
              <button type="submit" disabled={loading || !email.trim()} style={{ background: T.neon, border: "none", borderRadius: 6, color: "#000", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.56rem", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", padding: "12px", cursor: "pointer", opacity: loading || !email.trim() ? 0.5 : 1, transition: "opacity .15s" }}>
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
              <button type="button" onClick={() => router.push("/")} style={{ background: "none", border: "none", color: T.dim, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.42rem", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", padding: "4px" }}>
                ← Back to search
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
