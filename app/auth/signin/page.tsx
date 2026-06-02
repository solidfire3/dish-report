'use client';
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

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

const INPUT: React.CSSProperties = {
  width: "100%", background: "#10211e",
  border: "1.5px solid #2c4a44",
  borderRadius: 8, padding: "11px 14px",
  color: "#f0f4f1",
  fontFamily: "'IBM Plex Mono','Courier New',monospace",
  fontSize: "0.9375rem", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const LABEL: React.CSSProperties = {
  display: "block", marginBottom: 6,
  fontFamily: "'IBM Plex Mono',monospace",
  fontSize: "0.625rem", fontWeight: 600,
  color: "#5f857d", textTransform: "uppercase", letterSpacing: "0.22em",
};

export default function SignInPage() {
  const [mode,     setMode]     = useState<Mode>("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [consent,  setConsent]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const switchMode = (m: Mode) => { setMode(m); setError(""); setPassword(""); setConfirm(""); setConsent(false); };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#7fe3c8";
    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(127,227,200,0.12)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#2c4a44";
    e.currentTarget.style.boxShadow   = "none";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) { setError("Passwords don't match."); setLoading(false); return; }
        if (!consent) { setError("Please accept the data terms to continue."); setLoading(false); return; }
        const res = await fetch("/api/auth/signup", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!res.ok) { setError(friendlyError(json.error || "Sign up failed")); setLoading(false); return; }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) { setError(friendlyError(signInErr.message)); setLoading(false); return; }
        const sb2 = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data: { user } } = await sb2.auth.getUser();
        if (user) {
          await supabase.from("profiles").upsert(
            { id: user.id, data_consent: true, consent_timestamp: new Date().toISOString() },
            { onConflict: "id" }
          );
        }
        router.push("/auth/complete-profile");
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) { setError(friendlyError(signInErr.message)); setLoading(false); return; }
        router.push("/");
      }
    } catch { setError("Something went wrong. Please try again."); setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#e8ece8",
      backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 3px,rgba(47,79,73,0.018) 3px,rgba(47,79,73,0.018) 4px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px", fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2f4f49", letterSpacing: "0.28em" }}>DISH REPORT</div>
        <div style={{ height: 1, background: "#3d6b62", opacity: 0.4, margin: "5px auto 6px", width: 120 }} />
        <div style={{ fontSize: 8, color: "#7a8e8a", letterSpacing: "0.28em", textTransform: "uppercase" }}>FOOD INTELLIGENCE TERMINAL</div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "#10211e",
        border: "1px solid #2c4a44",
        borderRadius: 12, padding: "28px 24px",
      }}>
        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "#1b332e", borderRadius: 8, padding: 3 }}>
          {(["signin","signup"] as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: "8px", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.75rem", fontWeight: 600,
                letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.15s",
                background: mode === m ? "#3d6b62" : "transparent",
                color: mode === m ? "#eafaf4" : "#8aa9a2",
              }}
            >{m === "signin" ? "SIGN IN" : "CREATE"}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" style={INPUT} onFocus={onFocus} onBlur={onBlur}
              placeholder="you@example.com" />
          </div>
          <div>
            <label style={LABEL}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete={mode === "signin" ? "current-password" : "new-password"}
              style={INPUT} onFocus={onFocus} onBlur={onBlur} placeholder="••••••••" />
          </div>
          {mode === "signup" && (
            <div>
              <label style={LABEL}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required style={INPUT} onFocus={onFocus} onBlur={onBlur} placeholder="••••••••" />
            </div>
          )}
          {mode === "signup" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0, accentColor: "#7fe3c8" }} />
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: "#8aa9a2", lineHeight: 1.5 }}>
                I agree to anonymous analysis of my search behavior to improve recommendations. See our{" "}
                <a href="/terms" style={{ color: "#7fe3c8", textDecoration: "underline" }}>data terms</a>.
              </span>
            </label>
          )}
          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(214,69,69,0.12)", border: "1px solid rgba(214,69,69,0.3)", borderRadius: 8, color: "#d64545", fontFamily: "'Inter',sans-serif", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: "13px", borderRadius: 8, border: "1px solid #4d8377",
              background: loading ? "#2a4a43" : "#3d6b62",
              color: "#eafaf4", fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.16em",
              textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >{loading ? "PROCESSING..." : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}</button>
        </form>
      </div>
    </div>
  );
}
