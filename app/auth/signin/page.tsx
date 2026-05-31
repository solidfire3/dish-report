'use client';
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

// Magic link / Google OAuth can be added here later as additional options.
// This page uses Supabase email+password auth (passwords hashed by Supabase,
// never stored raw). Email verification is intentionally disabled for now
// so testing is not blocked by send limits — add it back with
// supabase.auth.signUp({ options: { emailRedirectTo: ... } }) when ready.

type Mode = "signin" | "signup";

// Map Supabase error strings to friendly messages
function friendlyError(msg: string): string {
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
    return "Wrong email or password.";
  if (msg.includes("Email rate limit") || msg.includes("rate limit"))
    return "Too many attempts — please wait a moment.";
  if (msg.includes("Password should be at least") || msg.includes("weak password"))
    return "Password must be at least 8 characters.";
  if (msg.includes("User already registered") || msg.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (msg.includes("Unable to validate email") || msg.includes("valid email"))
    return "Please enter a valid email address.";
  if (msg.includes("Email not confirmed"))
    return "Check your inbox — you may need to confirm your email first.";
  return msg;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", background: "#FFFFFF",
  border: "1.5px solid #D4CBC0",
  borderRadius: 8, padding: "11px 14px",
  color: "#1C1917",
  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  fontSize: "0.9375rem", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block", marginBottom: 6,
  fontFamily: "'Sevastopol', Georgia, serif",
  fontSize: "0.625rem", fontWeight: 400,
  color: "#B8780A", textTransform: "uppercase",
  letterSpacing: "0.15em",
};

export default function SignInPage() {
  const [mode,     setMode]     = useState<Mode>("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [consent,  setConsent]  = useState(false);  // data-consent checkbox
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const switchMode = (m: Mode) => {
    setMode(m); setError(""); setPassword(""); setConfirm(""); setConsent(false);
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#B8780A";
    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(184,120,10,0.12)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#D4CBC0";
    e.currentTarget.style.boxShadow   = "none";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!email.trim())       { setError("Email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match."); return;
    }

    setLoading(true);

    if (mode === "signup") {
      // Step 1: Create confirmed user via server-side admin route
      console.log('[AUTH DEBUG] admin signup POST called with email:', JSON.stringify(email.trim()));
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const signupJson = await signupRes.json();
      console.log('[AUTH DEBUG] admin signup response:', JSON.stringify(signupJson));
      if (!signupRes.ok) {
        setLoading(false);
        setError(friendlyError(signupJson.error ?? "Signup failed."));
        return;
      }

      // Step 2: Immediately sign in to create the browser session
      console.log('[AUTH DEBUG] signInWithPassword (post-signup) called with email:', JSON.stringify(email.trim()));
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      console.log('[AUTH DEBUG] signInWithPassword (post-signup) response:', JSON.stringify({
        user_id:            data?.user?.id,
        user_email:         data?.user?.email,
        email_confirmed_at: data?.user?.email_confirmed_at,
        session_exists:     !!data?.session,
        error:              signInErr?.message ?? null,
      }));
      if (signInErr) { setError(friendlyError(signInErr.message)); return; }

      if (data.user) {
        // Store consent timestamp (upsert — row may not exist yet)
        await supabase.from("profiles").upsert({
          id: data.user.id,
          data_consent: true,
          consent_timestamp: new Date().toISOString(),
        }, { onConflict: "id" });
        // New user → profile questionnaire
        router.push("/auth/complete-profile");
      }
    } else {
      console.log('[AUTH DEBUG] signInWithPassword called with email:', JSON.stringify(email.trim()));
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      console.log('[AUTH DEBUG] signInWithPassword response:', JSON.stringify({
        user_id:            data?.user?.id,
        user_email:         data?.user?.email,
        email_confirmed_at: data?.user?.email_confirmed_at,
        session_exists:     !!data?.session,
        error:              err?.message ?? null,
        error_status:       (err as { status?: number } | null)?.status ?? null,
      }));
      if (err) { setError(friendlyError(err.message)); return; }
      if (data.user) {
        // Check if profile has been completed
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle();
        router.push(profile?.full_name ? "/" : "/auth/complete-profile");
      }
    }
  };

  const isSignUp   = mode === "signup";
  const canSubmit  = !loading && !!email.trim() && password.length >= 8
                     && (!isSignUp || (confirm.length >= 8 && consent));

  return (
    <div style={{
      background: "#F2EEE8",
      backgroundImage: "radial-gradient(circle, rgba(28,25,23,0.06) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* ── Brand mark (matches TerminalSearch) ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1.75rem", fontWeight: 900, color: "#1C1917",
              letterSpacing: "0.04em", lineHeight: 1,
            }}>DISH REPORT</div>
            <div style={{
              width: 8, height: 18, background: "#B8780A", borderRadius: 1,
              animation: "signin-cursor 1.1s step-end infinite",
            }} />
          </div>
          <div style={{
            fontFamily: "'Sevastopol', Georgia, serif",
            fontSize: "0.625rem", color: "#B8780A",
            textTransform: "uppercase", letterSpacing: "0.3em",
          }}>FOOD INTELLIGENCE</div>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: "#FFFFFF", border: "1px solid #E8E3DC", borderRadius: 12,
          padding: "28px 24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)",
        }}>
          {/* Mode toggle */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 24,
            border: "1px solid #E8E3DC", borderRadius: 8, overflow: "hidden",
          }}>
            {(["signin", "signup"] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, background: mode === m ? "#1C1917" : "#FFFFFF",
                  border: "none", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.6875rem", fontWeight: 700,
                  color: mode === m ? "#FFB800" : "#6B6560",
                  padding: "10px 8px", letterSpacing: "0.06em",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {m === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={LABEL_STYLE}>Email address</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
                style={INPUT_STYLE}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Password */}
            <div>
              <label style={LABEL_STYLE}>Password</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isSignUp ? "Min 8 characters" : "Your password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                style={INPUT_STYLE}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Confirm password (signup only) */}
            {isSignUp && (
              <div>
                <label style={LABEL_STYLE}>Confirm password</label>
                <input
                  type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Same password again"
                  autoComplete="new-password"
                  style={INPUT_STYLE}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            )}

            {/* Data-consent checkbox (signup only, required) */}
            {isSignUp && (
              <div
                style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
                onClick={() => setConsent(v => !v)}
              >
                {/* Custom amber checkbox */}
                <div style={{
                  width: 20, height: 20, flexShrink: 0, marginTop: 2,
                  background: consent ? "#B8780A" : "#FFFFFF",
                  border: `1.5px solid ${consent ? "#B8780A" : "#D4CBC0"}`,
                  borderRadius: 4,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s, border-color 0.15s",
                }}>
                  {consent && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none"
                      stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1,5 4,8 10,1" />
                    </svg>
                  )}
                </div>
                {/* Consent label */}
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.5625rem", color: "#6B6560",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  lineHeight: 1.7, userSelect: "none",
                }}>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ color: "#B8780A", textUnderlineOffset: "2px" }}
                  >Terms</a>
                  . My searches and lists contribute to Dish Report&apos;s anonymized food database
                  and may appear in anonymized, house-branded content.
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: "0.6875rem", color: "#991B1B",
                background: "#FEF2F2", border: "1px solid #FECACA",
                borderRadius: 8, padding: "10px 14px",
                letterSpacing: "0.04em",
              }}>{error}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background: canSubmit ? "#B8780A" : "#E8E3DC",
                border: canSubmit ? "2px solid #9A6209" : "2px solid transparent",
                borderRadius: 10, color: canSubmit ? "#FFFFFF" : "#A89F99",
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: "0.875rem", fontWeight: 700,
                padding: "14px", cursor: canSubmit ? "pointer" : "not-allowed",
                letterSpacing: "0.06em",
                boxShadow: canSubmit ? "0 4px 14px rgba(184,120,10,0.25)" : "none",
                transition: "background 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.background = "#9A6209"; } }}
              onMouseLeave={e => { if (canSubmit) { e.currentTarget.style.background = "#B8780A"; } }}
            >
              {loading
                ? (isSignUp ? "CREATING ACCOUNT..." : "SIGNING IN...")
                : (isSignUp ? "CREATE ACCOUNT ›" : "SIGN IN ›")}
            </button>

            {/* Back link */}
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#A89F99",
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: "0.5625rem", textTransform: "uppercase",
                letterSpacing: "0.2em", padding: "4px",
                textAlign: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#6B6560"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#A89F99"; }}
            >
              ← Back to search
            </button>
          </form>
        </div>

        {/* Hint */}
        <div style={{
          textAlign: "center", marginTop: 16,
          fontFamily: "'Sevastopol', Georgia, serif",
          fontSize: "0.5rem", color: "#C4BDB2",
          textTransform: "uppercase", letterSpacing: "0.2em",
        }}>
          Your password is handled securely by Supabase Auth
        </div>
      </div>

      <style>{`
        @keyframes signin-cursor {
          0%,49% { opacity: 1; }
          50%,100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
