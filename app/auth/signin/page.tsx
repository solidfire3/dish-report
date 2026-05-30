'use client';
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <div style={{
      background: "#F7F4F0", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2rem", fontWeight: 700, color: "#C8860A",
            marginBottom: 8,
          }}>Dish Report</div>
          <div style={{ fontSize: "0.875rem", color: "#6B6560", lineHeight: 1.5 }}>
            Sign in to save searches, favorites, and lists
          </div>
        </div>

        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E3DC",
          borderRadius: 12,
          padding: "28px 24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#FDF3E3", border: "1.5px solid #F0D5A0",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C8860A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1C1917", marginBottom: 10 }}>
                Check your email
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6B6560", lineHeight: 1.65 }}>
                We sent a magic link to{" "}
                <span style={{ color: "#C8860A", fontWeight: 600 }}>{email}</span>.
                <br />Click it to sign in — no password needed.
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  marginTop: 20, background: "none",
                  border: "1px solid #D4CBC0",
                  borderRadius: 8, color: "#6B6560",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  padding: "9px 20px", cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8860A"; e.currentTarget.style.color = "#C8860A"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#D4CBC0"; e.currentTarget.style.color = "#6B6560"; }}
              >Try a different email</button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{
                  display: "block", marginBottom: 6,
                  fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                  fontWeight: 600, color: "#6B6560",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  style={{
                    width: "100%", background: "#FFFFFF",
                    border: "1.5px solid #E8E3DC",
                    borderRadius: 8, padding: "11px 14px",
                    color: "#1C1917", fontFamily: "'Inter', sans-serif",
                    fontSize: "1rem", outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#C8860A"; e.currentTarget.style.boxShadow = "0 0 0 3px #FDF3E3"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#E8E3DC"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {error && (
                <div style={{
                  fontSize: "0.8rem", color: "#991B1B",
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: 8, padding: "10px 14px", lineHeight: 1.5,
                }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  background: "#C8860A", border: "none", borderRadius: 10,
                  color: "#FFFFFF", fontFamily: "'Inter', sans-serif",
                  fontSize: "1rem", fontWeight: 600,
                  padding: "14px", cursor: "pointer",
                  opacity: loading || !email.trim() ? 0.5 : 1,
                  transition: "background 0.15s, opacity 0.15s",
                }}
                onMouseEnter={e => { if (!loading && email.trim()) e.currentTarget.style.background = "#A86E08"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#C8860A"; }}
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#A89F99", fontFamily: "'Inter', sans-serif",
                  fontSize: "0.875rem", padding: "4px",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#6B6560"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#A89F99"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to search
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
