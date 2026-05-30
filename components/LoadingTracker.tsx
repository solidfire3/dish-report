'use client';
import { useState, useEffect, useRef } from "react";

// ─── STEP DATA ────────────────────────────────────────────────────────────────
const STEP_DATA = [
  {
    action: "Decoding your order",
    detail: "Reading between the lines of what you actually want vs what you typed. We've seen worse.",
    icon: "cursor",
  },
  {
    action: "Scouting the neighborhood",
    detail: "Cross-referencing every restaurant within range. This is the part where we earn our keep.",
    icon: "sonar",
  },
  {
    action: "Reading 400+ reviews so you don't have to",
    detail: "Scanning everything people said — the good, the unhinged, and the suspiciously enthusiastic.",
    icon: "lines",
  },
  {
    action: "Tuning out the noise",
    detail: "Ignoring complaints about parking, the server's attitude, and that one guy who gave 1 star because it was raining. Food signal only.",
    icon: "wave",
  },
  {
    action: "Finding what actually matters",
    detail: "Flavor. Technique. Consistency. Freshness. The stuff that makes you go back.",
    icon: "lens",
  },
  {
    action: "Running the numbers",
    detail: "Every dish mention weighted, every consistency pattern noted. This is where the score gets earned.",
    icon: "counter",
  },
  {
    action: "Writing your report",
    detail: "Putting it all together. This is the last thing standing between you and the best meal you've had in a while.",
    icon: "document",
  },
];

// Backwards-compat export
export const STEPS = STEP_DATA.map(s => s.action);

// ─── CSS ANIMATIONS ───────────────────────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes dr-cursor-blink {
    0%, 45% { opacity: 1; }
    50%, 95% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes dr-cursor-scan {
    0% { transform: translateY(0); opacity: 0.4; }
    100% { transform: translateY(28px); opacity: 0; }
  }
  @keyframes dr-sonar-ring {
    0% { transform: scale(0.15); opacity: 0.9; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes dr-line-in {
    0% { opacity: 0; transform: scaleX(0); transform-origin: left; }
    25% { opacity: 1; transform: scaleX(1); }
    70% { opacity: 1; }
    100% { opacity: 0; transform: scaleX(1); }
  }
  @keyframes dr-wave-bar {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.25); }
  }
  @keyframes dr-strike-sweep {
    0% { width: 0; opacity: 0; }
    8% { opacity: 1; }
    45% { width: 100%; opacity: 1; }
    65% { width: 100%; opacity: 1; }
    80% { opacity: 0; }
    100% { width: 100%; opacity: 0; }
  }
  @keyframes dr-lens-ring {
    0% { transform: scale(0.6); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes dr-digit-fast {
    0% { transform: translateY(0); }
    100% { transform: translateY(-320px); }
  }
  @keyframes dr-digit-slow {
    0% { transform: translateY(0); }
    100% { transform: translateY(-320px); }
  }
  @keyframes dr-doc-frame {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes dr-doc-line {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes dr-step-enter {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dr-ticker-enter {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 0.35; transform: translateY(0); }
  }
  @keyframes dr-ambient {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes dr-progress-shimmer {
    0% { background-position: -300px 0; }
    100% { background-position: 300px 0; }
  }
  @keyframes dr-check-circle {
    from { stroke-dashoffset: 151; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes dr-check-mark {
    from { stroke-dashoffset: 38; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes dr-results-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dr-btn-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255,184,0,0.4); }
    50% { box-shadow: 0 0 0 8px rgba(255,184,0,0); }
  }
`;

// ─── STEP ICONS ───────────────────────────────────────────────────────────────

function IconCursor() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Scanning line */}
      <div style={{
        position: "absolute", width: 40, height: 1,
        background: "linear-gradient(90deg, transparent, #FFB800, transparent)",
        animation: "dr-cursor-scan 1.4s ease-in-out infinite",
        top: 18,
      }} />
      {/* Blinking cursor bar */}
      <div style={{
        width: 2.5, height: 36, background: "#FFB800",
        borderRadius: 2,
        animation: "dr-cursor-blink 1.1s ease-in-out infinite",
        boxShadow: "0 0 8px rgba(255,184,0,0.6)",
      }} />
    </div>
  );
}

function IconSonar() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {[0, 0.55, 1.1].map((delay, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 56, height: 56,
          borderRadius: "50%",
          border: "1.5px solid #FFB800",
          animation: `dr-sonar-ring 2.2s ease-out ${delay}s infinite`,
        }} />
      ))}
      <div style={{
        width: 9, height: 9, borderRadius: "50%",
        background: "#FFB800",
        boxShadow: "0 0 10px rgba(255,184,0,0.8)",
        flexShrink: 0, zIndex: 1,
      }} />
    </div>
  );
}

function IconLines() {
  const bars = [82, 58, 92, 46, 72];
  return (
    <div style={{ width: 80, height: 80, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, padding: "0 6px" }}>
      {bars.map((w, i) => (
        <div key={i} style={{
          height: 3.5,
          background: "#FFB800",
          borderRadius: 2,
          opacity: 0,
          width: `${w}%`,
          transformOrigin: "left",
          animation: `dr-line-in 2s ease-out ${i * 0.22}s infinite`,
          boxShadow: "0 0 4px rgba(255,184,0,0.4)",
        }} />
      ))}
    </div>
  );
}

function IconWave() {
  const bars = [10, 22, 14, 30, 18, 26, 12, 20];
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 4, height: h,
            background: "#FFB800",
            borderRadius: 2,
            transformOrigin: "center",
            animation: `dr-wave-bar ${0.45 + (i % 4) * 0.12}s ease-in-out ${i * 0.06}s infinite`,
            boxShadow: "0 0 3px rgba(255,184,0,0.3)",
          }} />
        ))}
      </div>
      {/* Strikethrough sweep */}
      <div style={{
        position: "absolute",
        left: 0, top: "50%",
        height: 2.5, width: 0,
        background: "#EF4444",
        borderRadius: 1,
        transform: "translateY(-50%)",
        animation: "dr-strike-sweep 3.2s ease-in-out 0.8s infinite",
        boxShadow: "0 0 6px rgba(239,68,68,0.5)",
      }} />
    </div>
  );
}

function IconLens() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Pulse rings */}
      {[0, 0.9].map((delay, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 34, height: 34,
          borderRadius: "50%",
          border: "1.5px solid #FFB800",
          top: 13, left: 13,
          animation: `dr-lens-ring 2s ease-out ${delay}s infinite`,
        }} />
      ))}
      {/* Lens circle */}
      <div style={{
        width: 30, height: 30,
        borderRadius: "50%",
        border: "2.5px solid #FFB800",
        position: "absolute",
        top: 13, left: 13,
        boxShadow: "0 0 8px rgba(255,184,0,0.3)",
      }} />
      {/* Handle */}
      <div style={{
        position: "absolute",
        width: 13, height: 2.5,
        background: "#FFB800",
        borderRadius: 2,
        transform: "rotate(45deg)",
        top: 47, left: 45,
        boxShadow: "0 0 4px rgba(255,184,0,0.4)",
      }} />
    </div>
  );
}

function IconCounter() {
  const intDigits  = [7, 8, 9, 6, 8, 7, 9, 8, 6, 7];
  const decDigits  = [3, 7, 1, 9, 4, 8, 2, 6, 5, 0];
  const digH = 32;
  const totalH = digH * 10;

  const Wheel = ({ digits, duration }: { digits: number[]; duration: string }) => (
    <div style={{ overflow: "hidden", height: digH, width: 22 }}>
      <div style={{
        animation: `dr-digit-fast ${duration} steps(9, end) infinite`,
      }}>
        {digits.map((d, i) => (
          <div key={i} style={{
            height: digH, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{d}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes dr-digit-fast {
          0% { transform: translateY(0); }
          100% { transform: translateY(-${(digH * 9)}px); }
        }
      `}</style>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "2rem", fontWeight: 700, color: "#FFB800",
        display: "flex", alignItems: "center", gap: 1,
        textShadow: "0 0 12px rgba(255,184,0,0.5)",
      }}>
        <Wheel digits={intDigits} duration="0.72s" />
        <span style={{ opacity: 0.5, fontSize: "1.4rem", lineHeight: 1 }}>.</span>
        <Wheel digits={decDigits} duration="0.28s" />
      </div>
    </div>
  );
}

function IconDocument() {
  const lines = [76, 52, 88, 42, 68];
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 48, height: 58 }}>
        {/* Frame */}
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid #FFB800",
          borderRadius: 4,
          animation: "dr-doc-frame 0.3s ease-out both",
          boxShadow: "0 0 8px rgba(255,184,0,0.2)",
        }} />
        {/* Folded corner */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 12, height: 12,
          background: "#0F0F0F",
          borderLeft: "2px solid #FFB800",
          borderBottom: "2px solid #FFB800",
          borderRadius: "0 0 0 3px",
          animation: "dr-doc-frame 0.3s ease-out 0.1s both",
        }} />
        {/* Text lines */}
        <div style={{ padding: "16px 8px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          {lines.map((w, i) => (
            <div key={i} style={{
              height: 3, background: "#FFB800", borderRadius: 1,
              opacity: 0, width: `${w}%`,
              animation: `dr-doc-line 0.25s ease-out ${0.35 + i * 0.14}s both`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const ICONS: Record<string, () => JSX.Element> = {
  cursor: IconCursor,
  sonar: IconSonar,
  lines: IconLines,
  wave: IconWave,
  lens: IconLens,
  counter: IconCounter,
  document: IconDocument,
};

// ─── RESULTS READY SCREEN ─────────────────────────────────────────────────────
function ResultsReady({ query, onSeeResults }: { query: string; onSeeResults?: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "0 24px",
      flex: 1,
    }}>
      {/* Animated checkmark */}
      <div style={{ marginBottom: 36, animation: "dr-results-up 0.5s ease-out both" }}>
        <svg width="80" height="80" viewBox="0 0 52 52" fill="none">
          <circle
            cx="26" cy="26" r="24"
            stroke="#FFB800" strokeWidth="2"
            strokeDasharray="151" strokeDashoffset="151"
            style={{ animation: "dr-check-circle 0.6s ease-out 0.1s both" }}
          />
          <polyline
            points="14,27 22,35 38,17"
            stroke="#FFB800" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="38" strokeDashoffset="38"
            style={{ animation: "dr-check-mark 0.35s ease-out 0.55s both" }}
          />
        </svg>
      </div>

      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: "2.25rem", fontWeight: 700,
        color: "#F0EDE8", lineHeight: 1.15,
        marginBottom: 16,
        animation: "dr-results-up 0.5s ease-out 0.3s both",
      }}>
        Your Dish Report<br />is ready.
      </div>

      {query && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.9rem", color: "#6B6866",
          marginBottom: 40,
          animation: "dr-results-up 0.5s ease-out 0.45s both",
        }}>
          "{query}"
        </div>
      )}

      <button
        onClick={onSeeResults}
        style={{
          background: "#FFB800",
          border: "none", borderRadius: 12,
          color: "#0F0F0F",
          fontFamily: "'Inter', sans-serif",
          fontSize: "1rem", fontWeight: 600,
          padding: "16px 48px",
          cursor: "pointer", width: "100%", maxWidth: 320,
          animation: "dr-results-up 0.5s ease-out 0.6s both, dr-btn-pulse 2s ease-in-out 1.5s infinite",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#FFC933"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#FFB800"; }}
      >See Results</button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export type LoadingTrackerProps = {
  // New interface
  step?: number;
  query?: string;
  onStop?: () => void;
  resultsReady?: boolean;
  onSeeResults?: () => void;
  // Legacy compat — page.tsx still passes lstep
  lstep?: number;
};

export function LoadingTracker({
  step, lstep, query, onStop, resultsReady = false, onSeeResults,
}: LoadingTrackerProps) {
  const activeStep = Math.min(6, Math.max(0, step ?? lstep ?? 0));
  const totalSteps = STEP_DATA.length;
  // Proportional progress: stages 1-2 = 8% each, 3-4 = 15%, 5-6 = 25%, final = 100%
  const STEP_PROGRESS = [8, 16, 31, 46, 71, 96, 100];
  const progress = STEP_PROGRESS[activeStep];

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stalled, setStalled] = useState(false);
  const wasHidden = useRef(false);

  // Track completed steps as step advances
  useEffect(() => {
    setCompletedSteps(Array.from({ length: activeStep }, (_, i) => i));
    setStalled(false); // reset stall flag whenever step changes
  }, [activeStep]);

  // Show "Still analyzing..." if stuck on step 5 for more than 10s
  useEffect(() => {
    if (activeStep !== 5) return;
    const t = setTimeout(() => setStalled(true), 10000);
    return () => clearTimeout(t);
  }, [activeStep]);

  // Background persistence — track if tab was ever hidden during search
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") wasHidden.current = true; };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Save search state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dr-search-progress", JSON.stringify({
        query: query || "", startedAt: Date.now(),
      }));
    } catch {}
    return () => {
      try { localStorage.removeItem("dr-search-progress"); } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = STEP_DATA[activeStep];
  const IconComponent = ICONS[current.icon];
  const ticker = completedSteps.slice(-2);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: `
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.03) 2px,
          rgba(0,0,0,0.03) 4px
        ),
        #0F0F0F
      `,
      display: "flex", flexDirection: "column",
      alignItems: "center",
      zIndex: 9500,
      overflowY: "auto",
    }}>
      <style>{ANIMATION_CSS}</style>

      {/* Content column */}
      <div style={{
        width: "100%", maxWidth: 520,
        padding: "48px 24px 100px",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        flex: 1,
      }}>
        {resultsReady ? (
          <ResultsReady query={query || ""} onSeeResults={onSeeResults} />
        ) : (
          <>
            {/* ── Brand mark ───────────────────────────────────────────── */}
            <div style={{ textAlign: "center", marginBottom: 28, userSelect: "none" }}>
              {/* DISH */}
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "2.625rem", fontWeight: 900, lineHeight: 1,
                color: "#FFB800", letterSpacing: "0.06em",
                textShadow: "0 0 16px rgba(255,184,0,0.5)",
              }}>DISH</div>

              {/* Amber divider */}
              <div style={{
                height: 1, background: "#FFB800",
                margin: "4px 0",
                boxShadow: "0 0 6px #FFB800",
              }} />

              {/* REPORT */}
              <div style={{
                fontFamily: "'CityLight', Georgia, serif",
                fontSize: "0.875rem", fontWeight: 400,
                color: "#9A9390", letterSpacing: "0.3em",
                textTransform: "uppercase", lineHeight: 1.4,
              }}>REPORT</div>

              {/* ANALYTICAL SYSTEMS // FOOD INTELLIGENCE */}
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: "0.56rem", fontWeight: 400,
                color: "rgba(255,184,0,0.6)",
                textTransform: "uppercase", letterSpacing: "0.35em",
                marginTop: 3,
              }}>ANALYTICAL SYSTEMS // FOOD INTELLIGENCE</div>
            </div>

            {/* ── Query display ────────────────────────────────────────── */}
            {query && (
              <div style={{ marginBottom: 36, textAlign: "center" }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "1.05rem", color: "#F0EDE8",
                  letterSpacing: "0.01em", marginBottom: 8,
                  lineHeight: 1.5,
                }}>
                  "{query}"
                </div>
                <div style={{
                  height: 1.5, background: "#FFB800",
                  borderRadius: 1, opacity: 0.5,
                }} />
              </div>
            )}

            {/* ── Progress bar ─────────────────────────────────────────── */}
            <div style={{ width: "100%", marginBottom: 48 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.72rem", color: "#FFB800",
                  letterSpacing: "0.05em",
                }}>{progress}%</span>
              </div>
              <div style={{ height: 3, background: "#2C2C2C", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`, borderRadius: 2,
                  background: "linear-gradient(90deg, #C8860A 0%, #FFB800 50%, #FFD033 100%)",
                  backgroundSize: "300px 100%",
                  animation: "dr-progress-shimmer 2s linear infinite",
                  transition: "width 1.6s ease-in-out",
                }} />
              </div>
            </div>

            {/* ── Step display ─────────────────────────────────────────── */}
            <div key={activeStep} style={{
              width: "100%",
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center",
              animation: "dr-step-enter 0.35s ease-out both",
            }}>
              {/* Step counter: "01 / 07" */}
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: "0.625rem", fontWeight: 400,
                color: "#FFB800", letterSpacing: "0.2em",
                textTransform: "uppercase", marginBottom: 24,
              }}>
                {String(activeStep + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
              </div>

              {/* Icon with ambient glow */}
              <div style={{ position: "relative", width: 120, height: 120, marginBottom: 24 }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,184,0,0.1) 0%, transparent 72%)",
                  animation: "dr-ambient 4s ease-in-out infinite",
                }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconComponent />
                </div>
              </div>

              {/* Step dialogue box */}
              <div style={{
                width: "100%", maxWidth: 420,
                borderLeft: "2px solid rgba(255,184,0,0.4)",
                background: "rgba(255,184,0,0.04)",
                padding: "14px 16px 14px 20px",
                textAlign: "left",
              }}>
                {/* Step label — Orbitron */}
                <div style={{
                  fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                  fontSize: "0.875rem", fontWeight: 400,
                  color: "#F0EDE8", lineHeight: 1.3,
                  marginBottom: 10, letterSpacing: "0.02em",
                }}>
                  {current.action}
                </div>

                {/* Detail — DM Sans italic */}
                <div style={{
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                  fontSize: "0.8125rem", color: "#9A9390",
                  lineHeight: 1.65, fontStyle: "italic",
                }}>
                  {current.detail}
                </div>

                {/* Stall indicator */}
                {stalled && (
                  <div style={{
                    marginTop: 14,
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.625rem", color: "#FFB800",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    animation: "dr-stand-by 2.5s ease-in-out infinite",
                  }}>
                    PROCESSING // PLEASE STAND BY
                  </div>
                )}
              </div>
            </div>

            {/* ── Completed steps ticker ───────────────────────────────── */}
            {ticker.length > 0 && (
              <div style={{
                width: "100%", marginTop: 48,
                borderTop: "1px solid #1C1C1C",
                paddingTop: 16,
                display: "flex", flexDirection: "column", gap: 5,
              }}>
                {ticker.map(i => (
                  <div key={i} style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.625rem", color: "#4A4846",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    animation: "dr-ticker-enter 0.3s ease-out both",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      width: 14, height: 1.5,
                      background: "#4A4846", borderRadius: 1,
                      flexShrink: 0, display: "inline-block",
                    }} />
                    {STEP_DATA[i].action}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Stop button — always at bottom ─────────────────────────────── */}
      {!resultsReady && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          padding: "16px 24px 28px",
          background: "linear-gradient(to top, #0F0F0F 60%, transparent)",
        }}>
          <button
            onClick={onStop}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.8rem", color: "#6B6560",
              padding: "8px 16px",
              display: "flex", alignItems: "center", gap: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#9A9390"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#6B6560"; }}
          >
            ← Edit search
          </button>
        </div>
      )}
    </div>
  );
}
