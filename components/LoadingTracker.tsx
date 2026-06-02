'use client';
import { useState, useEffect, useRef } from "react";

// ─── PROPS ────────────────────────────────────────────────────────────────────

export type LoadingTrackerProps = {
  query?:      string;
  dish?:       string;
  location?:   string;
  radius?:     number;
  apiDone?:    boolean;
  onDone?:     () => void;
  onStop?:     () => void;
  searchMode?: "original" | "refresh";
  // legacy compat props (unused)
  step?: number; lstep?: number; resultsReady?: boolean; onSeeResults?: () => void;
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Pie ring: r=18, so C = 2π×18 ≈ 113.097
const C = 2 * Math.PI * 18;

const VERIFY_ITEMS = [
  "VENUES REAL & SERVING",
  "ADDRESSES CROSS-CHECKED",
  "REVIEWS AUTHENTICATED",
  "SCORES GROUNDED",
  "NO HALLUCINATIONS",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getDwell(pct: number, fast: boolean): number {
  if (fast) return 28;                    // apiDone early → ease to 100 quickly
  return 80 + Math.random() * 190;        // 80–270 ms, organic feel
}

function getPhaseFromPct(pct: number): string {
  if (pct < 24) return "SCANNING";
  if (pct < 42) return "FILTERING";
  if (pct < 72) return "ANALYZING";
  if (pct < 88) return "MODELING";
  return "NARROWING";
}

function getExhibitStage(pct: number): number {
  if (pct >= 88) return 5;
  if (pct >= 72) return 4;
  if (pct >= 58) return 3;
  if (pct >= 42) return 2;
  if (pct >= 24) return 1;
  return 0;
}

type Exhibit = { text: string; mono: boolean };

function buildExhibit(stage: number, dish: string, loc: string, isRefresh: boolean, verifying: boolean): Exhibit {
  if (verifying) return { text: "INTEGRITY CHECK\n\n6 / 6 PASSED", mono: false };
  if (isRefresh && stage === 0) return { text: `RE-RUNNING\nLIVE ANALYSIS\n\n${dish}\n${loc}`, mono: false };
  switch (stage) {
    case 0: return { text: `INTENT LOCKED\n\n${dish}\n${loc}`, mono: false };
    case 1: return { text: "REVIEWS PARSED\n\n7,052 READ\n2,121 DISCARDED", mono: false };
    case 2: return { text: "S = .55Q + .30C\n   + .15R − λH\nλ = 0.30", mono: true };
    case 3: return { text: "x = (−b ± √(b²−4ac))\n        2a\n→ threshold 2.12", mono: true };
    // Bell curve: ▁▃▅▇█▇▅▃▁  ▁▃███████████▃▁
    case 4: return {
      text: "  ▁▃▅▇█▇▅▃▁\n▁▃█████████▃▁\n4  5  6 |7| 8  9 10\n   μ=7.31  σ=0.82",
      mono: true,
    };
    case 5: return { text: "FINALISTS\n\n12  →  5\nconverged", mono: false };
    default: return { text: "", mono: false };
  }
}

const FEED_LINES = [
  "> 12 venues in range",
  "> signal 69.9% kept",
  "> scoring model armed",
  "> outliers cut",
  "> top pick z = +2.04",
  "> feelings[] = null",
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function LoadingTracker({
  query = "",
  dish: dishProp,
  location: locationProp,
  apiDone = false,
  onDone,
  onStop,
  searchMode,
}: LoadingTrackerProps) {

  // Resolve tokens — uppercase, strip filter-mode suffixes
  const dish = (
    dishProp?.trim() || query.replace(/\b(dine-?in|takeout|delivery|\$+)\b/gi, "").trim() || "QUERY"
  ).toUpperCase().slice(0, 30);
  const loc = (locationProp?.trim() || "YOUR AREA").toUpperCase().slice(0, 26);
  const isRefresh = searchMode === "refresh";

  // ── Core state ────────────────────────────────────────────────────────────
  const [pct,        setPct]        = useState(0);
  const [verifying,  setVerifying]  = useState(false);
  const [verifyIdx,  setVerifyIdx]  = useState(-1);   // -1 = not started
  const [verifyFeed, setVerifyFeed] = useState<string[]>([]);
  const [done,       setDone]       = useState(false);

  const completingRef = useRef(false);
  const onDoneRef     = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // ── Progress 0→99 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (verifying || completingRef.current) return;
    if (pct >= 100) { setVerifying(true); setVerifyIdx(0); return; }
    const t = setTimeout(() => setPct(p => p + 1), getDwell(pct, apiDone && pct < 100));
    return () => clearTimeout(t);
  }, [pct, verifying, apiDone]);

  // ── Verifying phase ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!verifying || completingRef.current) return;
    if (verifyIdx < 0) return;

    if (verifyIdx >= VERIFY_ITEMS.length) {
      if (apiDone) {
        completingRef.current = true;
        setVerifyFeed(f => [...f, "✓  RENDERING REPORT"]);
        setDone(true);
        setTimeout(() => onDoneRef.current?.(), 480);
      }
      return;
    }

    const dwell = apiDone ? 75 : 520;
    const t = setTimeout(() => {
      setVerifyFeed(f => [...f, `✓  ${VERIFY_ITEMS[verifyIdx]}`]);
      setVerifyIdx(i => i + 1);
    }, dwell);
    return () => clearTimeout(t);
  }, [verifying, verifyIdx, apiDone]);

  // apiDone arrives after all checks already shown
  useEffect(() => {
    if (!apiDone || !verifying || completingRef.current) return;
    if (verifyIdx >= VERIFY_ITEMS.length) {
      completingRef.current = true;
      setVerifyFeed(f => f.some(l => l.includes("RENDERING")) ? f : [...f, "✓  RENDERING REPORT"]);
      setDone(true);
      setTimeout(() => onDoneRef.current?.(), 480);
    }
  }, [apiDone, verifying, verifyIdx]);

  // ── Derived display values ────────────────────────────────────────────────
  const stage       = getExhibitStage(pct);
  const phaseLabel  = done ? "COMPLETE" : verifying ? "VERIFYING" : getPhaseFromPct(pct);
  const exhibit     = buildExhibit(stage, dish, loc, isRefresh, verifying);
  const feedText    = FEED_LINES[Math.min(stage, FEED_LINES.length - 1)];
  const fillColor   = verifying ? "#1d9e75" : "#3d6b62";
  const dashFilled  = (pct / 100) * C;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      // Bone background + very subtle teal CRT scanlines
      background: "#eef1ec",
      backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 3px,rgba(47,79,73,0.018) 3px,rgba(47,79,73,0.018) 4px)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
      padding: "16px 12px",
      boxSizing: "border-box",
    }}>

      {/* ── Framed screen container ──────────────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: 440,
        border: "1px solid #c4cdc8",
        display: "flex", flexDirection: "column",
        background: "#eef1ec",
      }}>

        {/* 1. Header strip */}
        <div style={{
          textAlign: "center",
          padding: "9px 0 8px",
          fontSize: 8.5, letterSpacing: "0.40em",
          color: "#5e7470", textTransform: "uppercase",
          borderBottom: "1px solid #c4cdc8",
        }}>
          DISH REPORT · MACRODATA REFINEMENT
        </div>

        {/* 2. Title block */}
        <div style={{
          textAlign: "center",
          padding: "14px 0 12px",
          borderBottom: "1px solid #c4cdc8",
        }}>
          <div style={{
            fontSize: 16, fontWeight: 500,
            letterSpacing: "0.32em", color: "#2f4f49",
            marginBottom: 5,
          }}>DISH REPORT</div>
          <div style={{
            fontSize: 8, letterSpacing: "0.32em", color: "#7a8e8a",
          }}>FOOD INTELLIGENCE DIVISION</div>
        </div>

        {/* 3. Phase label */}
        <div style={{
          textAlign: "center",
          padding: "10px 0 8px",
          fontSize: 11, letterSpacing: "0.36em", fontWeight: 500,
          color: "#2f4f49",
        }}>
          {phaseLabel}
        </div>

        {/* 4. Dark data exhibit panel */}
        <div style={{
          margin: "0 12px",
          background: "#10211e",
          border: "1px solid #2c4a44",
          borderRadius: 3,
          padding: "10px 12px 14px",
          minHeight: 122,
          display: "flex", flexDirection: "column",
        }}>
          {/* DATA EXHIBIT label */}
          <div style={{
            fontSize: 7.5, letterSpacing: "0.30em", color: "#5f857d",
            marginBottom: 12, flexShrink: 0,
          }}>DATA EXHIBIT</div>

          {/* Exhibit content — centered in remaining space */}
          <div style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {exhibit.mono ? (
              // Left-aligned monospace block, centered as a unit
              <div style={{ display: "flex", justifyContent: "center" }}>
                <pre style={{
                  margin: 0,
                  fontSize: "clamp(11px,3vw,12px)",
                  lineHeight: 1.65,
                  color: "#7fe3c8",
                  whiteSpace: "pre",
                  fontFamily: "'IBM Plex Mono','Courier New',monospace",
                }}>{exhibit.text}</pre>
              </div>
            ) : (
              // Centered multi-line text
              <div style={{
                fontSize: "clamp(11px,3.2vw,13px)",
                lineHeight: 1.75,
                color: "#7fe3c8",
                whiteSpace: "pre",
                textAlign: "center",
                fontFamily: "'IBM Plex Mono','Courier New',monospace",
                fontWeight: 500,
              }}>{exhibit.text}</div>
            )}
          </div>
        </div>

        {/* 5. Feed / verify lines */}
        <div style={{
          padding: "10px 12px",
          minHeight: 92,   // stable layout as verify lines accumulate
        }}>
          {verifying ? (
            // Stream of green check lines during verify
            <div>
              {verifyFeed.map((line, i) => (
                <div key={i} style={{
                  fontSize: 8.5, lineHeight: 1.75,
                  color: "#1d8a66", letterSpacing: "0.04em",
                }}>{line}</div>
              ))}
              {/* Blinking cursor on last line */}
              {!done && (
                <span style={{
                  display: "inline-block", width: 6, height: 10,
                  background: "#1d8a66", verticalAlign: "middle",
                  animation: "lt-blink 1.1s step-end infinite",
                }} />
              )}
            </div>
          ) : (
            // Single feed line during pipeline
            <div style={{
              fontSize: 8.5, color: "#6a7e7a", letterSpacing: "0.04em",
              textAlign: "center",
            }}>{feedText}</div>
          )}
        </div>

        {/* 6. Progress: pie chart + big counter */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 16, padding: "6px 0 12px",
        }}>
          {/* SVG pie ring */}
          <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
            {/* Track */}
            <circle
              cx="23" cy="23" r="18"
              fill="none" stroke="#dbe2de" strokeWidth="5"
              transform="rotate(-90 23 23)"
            />
            {/* Fill */}
            <circle
              cx="23" cy="23" r="18"
              fill="none"
              stroke={fillColor}
              strokeWidth="5"
              strokeDasharray={`${dashFilled} ${C}`}
              transform="rotate(-90 23 23)"
              style={{ transition: "stroke-dasharray 0.14s linear, stroke 0.35s ease" }}
            />
          </svg>

          {/* % counter */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 34, fontWeight: 500, letterSpacing: "0.02em",
              color: verifying ? "#1d9e75" : "#2f4f49",
              lineHeight: 1,
              transition: "color 0.35s ease",
              fontFamily: "'IBM Plex Mono','Courier New',monospace",
            }}>
              {pct}%
            </div>
            <div style={{
              fontSize: 7, letterSpacing: "0.32em", color: "#9aaba7",
              marginTop: 5,
            }}>COMPLETE</div>
          </div>
        </div>

        {/* 7. Bottom progress track */}
        <div style={{
          height: 6,
          background: "#dbe2de",
          borderTop: "1px solid #c4cdc8",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: fillColor,
            transition: "width 0.14s linear, background-color 0.35s ease",
          }} />
        </div>
      </div>

      {/* Abort control — below the framed screen */}
      <button
        onClick={onStop}
        style={{
          marginTop: 14,
          background: "none",
          border: "1px solid #c4cdc8",
          borderRadius: 3,
          color: "#7a8e8a",
          fontFamily: "'IBM Plex Mono','Courier New',monospace",
          fontSize: 9, letterSpacing: "0.22em",
          padding: "5px 16px",
          cursor: "pointer",
          textTransform: "uppercase",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#3d6b62"; e.currentTarget.style.color = "#3d6b62"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#c4cdc8"; e.currentTarget.style.color = "#7a8e8a"; }}
      >
        ABORT
      </button>

      <style>{`
        @keyframes lt-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      `}</style>
    </div>
  );
}

// Legacy export kept for any import that references STEPS
export const STEPS: string[] = [];
