'use client';
import { useState, useEffect, useRef } from "react";

// ─── STAGE DATA ───────────────────────────────────────────────────────────────
const STAGES = [
  { id: 1, label: "Reading your search",    detail: "Reading between the lines of what you actually want vs what you typed.",                                    minMs: 2000  },
  { id: 2, label: "Finding candidates",      detail: "Cross-referencing every restaurant within range. This is the part where we earn our keep.",                minMs: 2500  },
  { id: 3, label: "Pulling reviews",         detail: "Collecting what people actually said — the good, the unhinged, and the suspiciously enthusiastic.",        minMs: 6000  },
  { id: 4, label: "Filtering the noise",     detail: "Parking complaints. Wait time rants. Vague praise. Gone.",                                                minMs: 4000  },
  { id: 5, label: "Extracting food signal",  detail: "Finding what matters — flavor, technique, consistency, freshness.",                                        minMs: 6000  },
  { id: 6, label: "Scoring and ranking",     detail: "Every dish mention weighted, every consistency pattern noted. This is where the score gets earned.",       minMs: 3500  },
  { id: 7, label: "Writing your report",     detail: "Putting it all together.",                                                                                 minMs: 4000  },
];

const STAGE_DONE_PROGRESS = [8, 16, 31, 46, 63, 79, 100];

const SUB_STATUSES = [
  "Verifying food signal consistency...",
  "Cross-referencing dish mentions...",
  "Calibrating against local standards...",
  "Finalizing must-order recommendations...",
  "Reviewing insider source reliability...",
  "Checking seasonal menu availability...",
];

// ─── ANIMATIONS ───────────────────────────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes dr-progress-shimmer {
    0%   { background-position: -300px 0; }
    100% { background-position:  300px 0; }
  }
  @keyframes dr-ambient-grid {
    from { transform: translate(0,0); }
    to   { transform: translate(24px,24px); }
  }
  @keyframes dr-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dr-metric-in {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes dr-sub-fade {
    0%   { opacity: 0; }
    15%  { opacity: 0.7; }
    85%  { opacity: 0.7; }
    100% { opacity: 0; }
  }
  @keyframes dr-stand-by {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 0.2; }
  }
  @keyframes dr-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }
`;

// ─── PROPS ────────────────────────────────────────────────────────────────────
export type LoadingTrackerProps = {
  query?: string;
  apiDone?: boolean;
  onDone?: () => void;
  onStop?: () => void;
  // Legacy compat
  step?: number;
  lstep?: number;
  resultsReady?: boolean;
  onSeeResults?: () => void;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export function LoadingTracker({
  query = "",
  apiDone = false,
  onDone,
  onStop,
}: LoadingTrackerProps) {
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // ── Core stage state ───────────────────────────────────────────────────────
  const [stage,    setStage]    = useState(1);
  const [progress, setProgress] = useState(0);

  // ── Stage 3: review counter ────────────────────────────────────────────────
  const [reviewCount,  setReviewCount]  = useState(0);
  const reviewTarget = useRef(Math.floor(Math.random() * (847 - 380 + 1)) + 380);

  // ── Stage 4: filtered counter ──────────────────────────────────────────────
  const [filteredCount, setFilteredCount] = useState(0);
  const filteredTarget = useRef(0);

  // ── Stage 5: food signal metrics ───────────────────────────────────────────
  const [visibleMetrics, setVisibleMetrics] = useState(0);
  const metrics = useRef({
    flavor:      Math.floor(Math.random() * (180 - 40  + 1)) + 40,
    technique:   Math.floor(Math.random() * (90  - 20  + 1)) + 20,
    consistency: Math.floor(Math.random() * (60  - 15  + 1)) + 15,
    freshness:   Math.floor(Math.random() * (45  - 10  + 1)) + 10,
  });

  // ── Stage 6: score flicker ────────────────────────────────────────────────
  const [flickerScore,  setFlickerScore]  = useState(7.0);
  const flickerLocked = useRef(false);
  const finalScore    = useRef(+(Math.random() * (9.2 - 6.8) + 6.8).toFixed(1));

  // ── Stage 7 ───────────────────────────────────────────────────────────────
  const [progress7,    setProgress7]    = useState(91);
  const [subStatusIdx, setSubStatusIdx] = useState(0);
  const [showStandBy,  setShowStandBy]  = useState(false);
  const [canComplete,  setCanComplete]  = useState(false);

  // ── Stage advancement ─────────────────────────────────────────────────────
  useEffect(() => {
    if (stage >= 7) return;
    const ms = STAGES[stage - 1].minMs;
    const t = setTimeout(() => {
      const nextProgress = STAGE_DONE_PROGRESS[stage - 1];
      setProgress(nextProgress);
      setStage(s => s + 1);
    }, ms);
    return () => clearTimeout(t);
  }, [stage]);

  // Stage 7 setup
  useEffect(() => {
    if (stage !== 7) return;
    setProgress(91);
    setProgress7(91);
    setCanComplete(false);
    setShowStandBy(false);

    const minTimer = setTimeout(() => setCanComplete(true), STAGES[6].minMs);

    const crawlTimer = setInterval(() => {
      setProgress7(p => {
        if (p >= 99) { setShowStandBy(true); return 99; }
        return p + 1;
      });
    }, 3000);

    const statusTimer = setInterval(() => {
      setSubStatusIdx(i => (i + 1) % SUB_STATUSES.length);
    }, 2500);

    return () => {
      clearTimeout(minTimer);
      clearInterval(crawlTimer);
      clearInterval(statusTimer);
    };
  }, [stage]);

  // Sync stage 7 progress7 → overall progress
  useEffect(() => {
    if (stage === 7) setProgress(progress7);
  }, [stage, progress7]);

  // Completion trigger
  useEffect(() => {
    if (apiDone && canComplete && stage === 7) {
      setProgress(100);
      const t = setTimeout(() => { onDoneRef.current?.(); }, 600);
      return () => clearTimeout(t);
    }
  }, [apiDone, canComplete, stage]);

  // ── Stage 3: review counter animation ────────────────────────────────────
  useEffect(() => {
    if (stage !== 3) return;
    const target = reviewTarget.current;
    const totalMs = STAGES[2].minMs;
    const stepMs  = 300;
    const steps   = totalMs / stepMs;
    const inc     = target / steps;
    let  current  = 0;
    const iv = setInterval(() => {
      current = Math.min(current + inc, target);
      setReviewCount(Math.floor(current));
      if (current >= target) clearInterval(iv);
    }, stepMs);
    return () => clearInterval(iv);
  }, [stage]);

  // ── Stage 4: filtered counter animation ──────────────────────────────────
  useEffect(() => {
    if (stage !== 4) return;
    const target = Math.floor(reviewTarget.current * (0.6 + Math.random() * 0.2));
    filteredTarget.current = target;
    const totalMs = STAGES[3].minMs;
    const stepMs  = 300;
    const steps   = totalMs / stepMs;
    const inc     = target / steps;
    let  current  = 0;
    const iv = setInterval(() => {
      current = Math.min(current + inc, target);
      setFilteredCount(Math.floor(current));
      if (current >= target) clearInterval(iv);
    }, stepMs);
    return () => clearInterval(iv);
  }, [stage]);

  // ── Stage 5: metrics fade in one by one ──────────────────────────────────
  useEffect(() => {
    if (stage !== 5) return;
    setVisibleMetrics(0);
    const timers = [1200, 2400, 3600, 4800].map((ms, i) =>
      setTimeout(() => setVisibleMetrics(v => Math.max(v, i + 1)), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  // ── Stage 6: score flicker ───────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 6) return;
    flickerLocked.current = false;
    // Fast flicker for 2.5s
    const flickerIv = setInterval(() => {
      if (!flickerLocked.current) {
        setFlickerScore(+(Math.random() * (9.5 - 5.5) + 5.5).toFixed(1));
      }
    }, 100);
    // Lock on final score
    const lockTimer = setTimeout(() => {
      flickerLocked.current = true;
      clearInterval(flickerIv);
      // Slow settle
      const settle = [80, 160, 260].map((ms, i) =>
        setTimeout(() => {
          const mid = finalScore.current;
          setFlickerScore([mid + 0.3, mid - 0.1, mid][i] ?? mid);
        }, ms)
      );
      return () => settle.forEach(clearTimeout);
    }, 2500);
    return () => { clearInterval(flickerIv); clearTimeout(lockTimer); };
  }, [stage]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const stageData = STAGES[stage - 1];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: `
        repeating-linear-gradient(
          0deg, transparent, transparent 2px,
          rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
        ), #0F0F0F`,
      display: "flex", flexDirection: "column", alignItems: "center",
      overflowY: "auto",
    }}>
      <style>{ANIMATION_CSS}</style>

      {/* Ambient dot grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,184,0,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        animation: "dr-ambient-grid 20s linear infinite",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 560,
        padding: "48px 40px 100px",
        display: "flex", flexDirection: "column", alignItems: "center", flex: 1,
      }}>

        {/* ── Brand mark ───────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 28, userSelect: "none" }}>
          <div style={{
            fontFamily: "var(--font-orbitron), 'Courier New', monospace",
            fontSize: "2.75rem", fontWeight: 900, lineHeight: 1,
            color: "#FFB800", letterSpacing: "0.05em",
            textShadow: "0 0 16px rgba(255,184,0,0.5)",
          }}>DISH REPORT</div>
          <div style={{ height: 1, background: "#FFB800", margin: "6px 0", boxShadow: "0 0 6px rgba(255,184,0,0.6)" }} />
          <div style={{
            fontFamily: "'Sevastopol', Georgia, serif",
            fontSize: "0.625rem", color: "rgba(255,184,0,0.65)",
            textTransform: "uppercase", letterSpacing: "0.35em",
          }}>FOOD INTELLIGENCE</div>
        </div>

        {/* ── Query display ─────────────────────────────────────────── */}
        {query && (
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "1.05rem", color: "#F0EDE8", letterSpacing: "0.01em", lineHeight: 1.5,
            }}>"{query}"</div>
            <div style={{ height: 1.5, background: "#FFB800", borderRadius: 1, opacity: 0.4, marginTop: 8 }} />
          </div>
        )}

        {/* ── Progress bar ──────────────────────────────────────────── */}
        <div style={{ width: "100%", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <span style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1.75rem", fontWeight: 700, color: "#FFB800",
              letterSpacing: "0.02em", lineHeight: 1,
            }}>{progress}%</span>
          </div>
          <div style={{ height: 3, background: "#2C2C2C", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`, borderRadius: 2,
              background: "linear-gradient(90deg, #C8860A 0%, #FFB800 50%, #FFD033 100%)",
              backgroundSize: "300px 100%",
              animation: "dr-progress-shimmer 2s linear infinite",
              transition: "width 1.2s ease-in-out",
            }} />
          </div>
        </div>

        {/* ── Stage content ─────────────────────────────────────────── */}
        <div key={stage} style={{
          width: "100%",
          animation: "dr-fade-in 0.35s ease-out both",
        }}>
          {/* Stage counter */}
          <div style={{
            fontFamily: "'Sevastopol', Georgia, serif",
            fontSize: "0.625rem", color: "#FFB800",
            letterSpacing: "0.2em", textTransform: "uppercase",
            marginBottom: 20, textAlign: "center",
          }}>
            {String(stage).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
          </div>

          {/* Stage label */}
          <div style={{
            fontFamily: "var(--font-orbitron), 'Courier New', monospace",
            fontSize: "1.125rem", fontWeight: 400,
            color: "#F0EDE8", lineHeight: 1.3,
            letterSpacing: "0.02em", textAlign: "center", marginBottom: 16,
          }}>{stageData.label}</div>

          {/* ── Stage-specific content ─────────────────────────────── */}

          {/* Stage 3: Review counter */}
          {stage === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "1.75rem", fontWeight: 700,
                color: "#FFB800", letterSpacing: "0.04em",
                marginBottom: 12, lineHeight: 1,
              }}>
                SCANNING // {reviewCount.toLocaleString()} REVIEWS
              </div>
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.9375rem", color: "#9A9390",
                lineHeight: 1.65, fontStyle: "italic",
              }}>{stageData.detail}</div>
            </div>
          )}

          {/* Stage 4: Filtered counter */}
          {stage === 4 && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "1.5rem", fontWeight: 700,
                color: "rgba(255,184,0,0.65)", letterSpacing: "0.04em",
                marginBottom: 12, lineHeight: 1,
              }}>
                FILTERED // {filteredCount.toLocaleString()} IRRELEVANT SIGNALS
              </div>
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.9375rem", color: "#9A9390",
                lineHeight: 1.65, fontStyle: "italic",
              }}>{stageData.detail}</div>
            </div>
          )}

          {/* Stage 5: Food signal metrics */}
          {stage === 5 && (
            <div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 10,
                marginBottom: 20,
              }}>
                {[
                  { key: "FLAVOR MENTIONS",    val: metrics.current.flavor      },
                  { key: "TECHNIQUE NOTES",    val: metrics.current.technique   },
                  { key: "CONSISTENCY FLAGS",  val: metrics.current.consistency },
                  { key: "FRESHNESS SIGNALS",  val: metrics.current.freshness   },
                ].map((m, i) => (
                  <div key={m.key} style={{
                    opacity: visibleMetrics > i ? 1 : 0,
                    animation: visibleMetrics > i ? "dr-metric-in 0.4s ease-out both" : "none",
                    fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                    fontSize: "1rem", fontWeight: 400,
                    color: "#FFB800", letterSpacing: "0.03em",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #1C1C1C", paddingBottom: 8,
                  }}>
                    <span>{m.key}</span>
                    <span style={{ fontWeight: 700 }}>{m.val}</span>
                  </div>
                ))}
              </div>
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.9375rem", color: "#9A9390",
                lineHeight: 1.65, fontStyle: "italic", textAlign: "center",
              }}>{stageData.detail}</div>
            </div>
          )}

          {/* Stage 6: Score flicker */}
          {stage === 6 && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: "0.6875rem", color: "#FFB800",
                textTransform: "uppercase", letterSpacing: "0.12em",
                marginBottom: 12,
              }}>CALCULATING ANALYTICAL SCORE</div>
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "4rem", fontWeight: 900,
                color: "#FFB800", lineHeight: 1,
                textShadow: "0 0 20px rgba(255,184,0,0.4)",
                transition: flickerLocked.current ? "all 0.2s ease" : "none",
              }}>{flickerScore.toFixed(1)}</div>
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.9375rem", color: "#9A9390",
                lineHeight: 1.65, fontStyle: "italic", marginTop: 16,
              }}>{stageData.detail}</div>
            </div>
          )}

          {/* Stage 7: Writing report */}
          {stage === 7 && (
            <div style={{ textAlign: "center" }}>
              {showStandBy ? (
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.6875rem", color: "#FFB800",
                  textTransform: "uppercase", letterSpacing: "0.2em",
                  animation: "dr-stand-by 2.5s ease-in-out infinite",
                  marginBottom: 16,
                }}>PROCESSING // PLEASE STAND BY</div>
              ) : (
                <div
                  key={subStatusIdx}
                  style={{
                    fontFamily: "'Sevastopol', Georgia, serif",
                    fontSize: "0.6875rem", color: "rgba(255,184,0,0.7)",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    animation: "dr-sub-fade 2.5s ease both",
                    marginBottom: 16,
                  }}>{SUB_STATUSES[subStatusIdx]}</div>
              )}
              <div style={{
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                fontSize: "0.9375rem", color: "#9A9390",
                lineHeight: 1.65, fontStyle: "italic",
              }}>{stageData.detail}</div>
            </div>
          )}

          {/* Stages 1 & 2: plain detail */}
          {stage <= 2 && (
            <div style={{
              fontFamily: "'DM Sans', 'Inter', sans-serif",
              fontSize: "0.9375rem", color: "#9A9390",
              lineHeight: 1.65, fontStyle: "italic", textAlign: "center",
            }}>{stageData.detail}</div>
          )}

          {/* Stage dialogue box for all stages */}
          {stage <= 2 && (
            <div style={{
              width: "100%", marginTop: 20,
              borderLeft: "2px solid rgba(255,184,0,0.4)",
              background: "rgba(255,184,0,0.04)",
              padding: "10px 16px 10px 20px",
            }}>
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "1.125rem", fontWeight: 400,
                color: "#F0EDE8", lineHeight: 1.3, letterSpacing: "0.02em",
              }}>{stageData.label}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stop button ───────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        padding: "16px 24px 28px",
        background: "linear-gradient(to top, #0F0F0F 60%, transparent)",
        zIndex: 2,
      }}>
        <button
          onClick={onStop}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.875rem", color: "#6B6560",
            padding: "8px 16px", display: "flex", alignItems: "center", gap: 6,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#9A9390"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#6B6560"; }}
        >
          ← Edit search
        </button>
      </div>
    </div>
  );
}

// Legacy export
export const STEPS = STAGES.map(s => s.label);
