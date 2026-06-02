'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";

const MONO = "'IBM Plex Mono','Courier New',monospace";
const SANS = "'Inter',-apple-system,sans-serif";

const INPUT: React.CSSProperties = {
  width: "100%", background: "#10211e",
  border: "1.5px solid #2c4a44", borderRadius: 8,
  padding: "11px 14px", color: "#f0f4f1",
  fontFamily: MONO, fontSize: "0.9rem", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
  resize: "none",
};

const LABEL: React.CSSProperties = {
  display: "block", marginBottom: 6,
  fontFamily: MONO, fontSize: "0.625rem", fontWeight: 700,
  color: "#5f857d", textTransform: "uppercase", letterSpacing: "0.22em",
};

export default function HelpPage() {
  const router = useRouter();
  const [whatDoing,  setWhatDoing]  = useState("");
  const [errorDesc,  setErrorDesc]  = useState("");
  const [email,      setEmail]      = useState("");
  const [status,     setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errMsg,     setErrMsg]     = useState("");

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#7fe3c8";
    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(127,227,200,0.12)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#2c4a44";
    e.currentTarget.style.boxShadow   = "none";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorDesc.trim()) return;
    setStatus("loading"); setErrMsg("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what_doing: whatDoing, error_desc: errorDesc, email }),
      });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error || "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
    } catch {
      setErrMsg("Network error — please try again.");
      setStatus("error");
    }
  };

  return (
    <div style={{ background: "#e8ece8", minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <div style={{
        background: "#e8ece8", borderBottom: "1px solid #c4cdc8",
        padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 56,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8,
            background: "transparent", border: "1px solid #b9c4bf",
            color: "#7a8e8a", cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#7fe3c8"; e.currentTarget.style.borderColor = "#7fe3c8"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#7a8e8a"; e.currentTarget.style.borderColor = "#b9c4bf"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ fontFamily: MONO, fontSize: "0.85rem", fontWeight: 700, color: "#2f4f49", letterSpacing: "0.14em" }}>HELP</div>
      </div>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "32px 16px 64px" }}>
        {/* Intro */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700, color: "#23413b", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
            REPORT AN ISSUE
          </div>
          <p style={{ fontFamily: SANS, fontSize: "0.9375rem", color: "#3a554f", lineHeight: 1.65, margin: 0 }}>
            Found a bug, a wrong result, or something that feels off? Tell us what happened. We read every report.
          </p>
        </div>

        {/* Success state */}
        {status === "success" ? (
          <div style={{
            background: "#10211e", border: "1px solid #2c4a44",
            borderRadius: 12, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: MONO, fontSize: "0.8rem", fontWeight: 700, color: "#3fd98a", letterSpacing: "0.12em", marginBottom: 8 }}>
              REPORT LOGGED
            </div>
            <div style={{ fontFamily: SANS, fontSize: "0.9rem", color: "#d4e4df", lineHeight: 1.6 }}>
              Thanks — your report was logged. We&apos;ll look into it.
            </div>
            <button
              onClick={() => { setStatus("idle"); setWhatDoing(""); setErrorDesc(""); setEmail(""); }}
              style={{
                marginTop: 20, background: "none", border: "1px solid #2c4a44",
                borderRadius: 8, padding: "8px 18px",
                fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em",
                color: "#7fe3c8", cursor: "pointer",
              }}
            >SUBMIT ANOTHER</button>
          </div>
        ) : (
          /* Form */
          <div style={{ background: "#10211e", border: "1px solid #2c4a44", borderRadius: 12, padding: "24px 20px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              <div>
                <label style={LABEL}>What were you trying to do?</label>
                <input
                  type="text"
                  value={whatDoing}
                  onChange={e => setWhatDoing(e.target.value)}
                  placeholder="e.g. search for tacos near me"
                  style={{ ...INPUT, height: 44 } as React.CSSProperties}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>

              <div>
                <label style={{ ...LABEL, color: "#7fe3c8" }}>
                  What went wrong? <span style={{ color: "#d64545" }}>*</span>
                </label>
                <textarea
                  value={errorDesc}
                  onChange={e => setErrorDesc(e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe what happened — the more specific, the better."
                  style={{ ...INPUT, display: "block" } as React.CSSProperties}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>

              <div>
                <label style={LABEL}>Email <span style={{ color: "#5f857d", fontWeight: 400 }}>(optional — for follow-up)</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ ...INPUT, height: 44 } as React.CSSProperties}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>

              {/* Error message — preserves user text */}
              {status === "error" && (
                <div style={{
                  padding: "10px 14px", background: "rgba(214,69,69,0.12)",
                  border: "1px solid rgba(214,69,69,0.30)", borderRadius: 8,
                  fontFamily: SANS, fontSize: "0.875rem", color: "#d64545",
                }}>{errMsg}</div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !errorDesc.trim()}
                style={{
                  width: "100%", padding: "13px",
                  background: status === "loading" ? "#2a4a43" : "#3d6b62",
                  border: "1px solid #4d8377", borderRadius: 8,
                  color: "#eafaf4", fontFamily: MONO,
                  fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: status === "loading" || !errorDesc.trim() ? "not-allowed" : "pointer",
                  opacity: !errorDesc.trim() ? 0.5 : 1,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (errorDesc.trim() && status !== "loading") e.currentTarget.style.background = "#4d8377"; }}
                onMouseLeave={e => { if (status !== "loading") e.currentTarget.style.background = "#3d6b62"; }}
              >
                {status === "loading" ? "SENDING..." : "SUBMIT REPORT"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
