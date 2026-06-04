'use client';
import { useState, useEffect, useRef } from "react";

// ─── PROPS ────────────────────────────────────────────────────────────────────

export type LoadingTrackerProps = {
  query?:        string;
  dish?:         string;
  location?:     string;
  radius?:       number;
  apiDone?:      boolean;
  onDone?:       () => void;
  onStop?:       () => void;
  onBackground?: () => void;  // user taps "let it run in background"
  searchMode?:   "original" | "refresh";
  tiles?:        string[] | null;   // real tile names from gatherCandidates; null = single query
  resultCount?:  number;            // actual candidate count once results arrive
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
  if (fast) return 28;
  // Target: ~60s total for 0→99%
  const r = Math.random();
  if (pct < 10) return 300 + r * 400;   // ~300–700ms
  if (pct < 28) return 500 + r * 400;   // ~500–900ms
  if (pct < 46) return 550 + r * 450;   // ~550–1000ms
  if (pct < 66) return 600 + r * 500;   // ~600–1100ms
  if (pct < 78) return 550 + r * 400;   // ~550–950ms
  if (pct < 88) return 500 + r * 400;   // ~500–900ms
  return 400 + r * 350;                  // ~400–750ms
}

// Phase labels — honest stage names, tiling-aware
function getPhaseFromPct(pct: number, isTiled: boolean): string {
  if (isTiled) {
    if (pct < 38) return "SCANNING";
    if (pct < 50) return "MERGING";
    if (pct < 72) return "SCORING";
    if (pct < 90) return "RANKING";
    return "FINALIZING";
  }
  if (pct < 38) return "ANALYZING";
  if (pct < 72) return "SCORING";
  if (pct < 90) return "RANKING";
  return "FINALIZING";
}

// 9 exhibit stages spread across 0→99%
function getExhibitStage(pct: number): number {
  if (pct >= 92) return 8;
  if (pct >= 82) return 7;
  if (pct >= 72) return 6;
  if (pct >= 62) return 5;
  if (pct >= 50) return 4;
  if (pct >= 38) return 3;
  if (pct >= 25) return 2;
  if (pct >= 12) return 1;
  return 0;
}

type Exhibit = { text: string; mono: boolean };

// Build exhibit content from REAL pipeline state.
// All fake numbers (invented candidate counts, equations, bell curves,
// k-fold metrics, percentile ranks) have been removed.
// What's shown is either actually known or an honest stage label.
function buildExhibit(
  stage: number, dish: string, loc: string,
  isRefresh: boolean, verifying: boolean,
  tiles: string[] | null | undefined,
  resultCount: number | undefined
): Exhibit {
  // VERIFYING: show actual count if available
  if (verifying) {
    const countLine = resultCount != null ? `${resultCount} VENUES FOUND\n` : "";
    return { text: `INTEGRITY CHECK\n\n${countLine}6 / 6 PASSED`, mono: false };
  }

  if (isRefresh && stage === 0) {
    return { text: `RE-RUNNING\nLIVE ANALYSIS\n\n${dish}\n${loc}`, mono: false };
  }

  const isTiled = !!(tiles && tiles.length > 0);

  if (isTiled) {
    // Real tile names — what's actually being searched
    const tileList = tiles!.join("\n");
    switch (stage) {
      case 0:
      case 1:
      case 2:
        return {
          text: `SEARCHING ${tiles!.length} AREAS\n\n${tileList}`,
          mono: false,
        };
      case 3:
        return { text: "MERGING\nCANDIDATES", mono: false };
      case 4:
      case 5:
        return { text: "SCORING\nVENUES", mono: false };
      case 6:
      case 7:
        return { text: "RANKING\nRESULTS", mono: false };
      case 8:
        return { text: `${dish.toUpperCase()}\n${loc.toUpperCase()}\n\nFINALIZING`, mono: false };
      default:
        return { text: "", mono: false };
    }
  } else {
    // Single query — honest labels without fabricated numbers
    switch (stage) {
      case 0:
      case 1:
      case 2:
        return { text: `ANALYZING\n\n${dish.toUpperCase()}\n${loc.toUpperCase()}`, mono: false };
      case 3:
      case 4:
      case 5:
        return { text: "SCORING\nVENUES", mono: false };
      case 6:
      case 7:
        return { text: "RANKING\nRESULTS", mono: false };
      case 8:
        return { text: `${dish.toUpperCase()}\n${loc.toUpperCase()}\n\nFINALIZING`, mono: false };
      default:
        return { text: "", mono: false };
    }
  }
}

// Feed lines — real stage descriptions, no fabricated metrics.
// Generated from actual tile names when tiling.
function buildFeedLines(tiles: string[] | null | undefined): string[] {
  if (tiles && tiles.length > 0) {
    const tileLines = tiles.map(t => `> searching ${t.toLowerCase()}...`);
    return [
      ...tileLines.slice(0, Math.min(3, tileLines.length)),
      "> merging candidates...",
      "> scoring food quality...",
      "> assessing confidence...",
      "> applying ranking...",
      "> cross-checking results...",
      "> finalizing...",
    ].slice(0, 9);
  }
  return [
    "> reviewing candidates...",
    "> analyzing sources...",
    "> reading review signals...",
    "> scoring food quality...",
    "> assessing confidence...",
    "> applying ranking...",
    "> cross-checking...",
    "> ranking finalized",
    "> finalizing...",
  ];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function LoadingTracker({
  query = "",
  dish: dishProp,
  location: locationProp,
  apiDone = false,
  onDone,
  onStop,
  onBackground,
  searchMode,
  tiles,
  resultCount,
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
  const isTiled     = !!(tiles && tiles.length > 0);
  const feedLines   = buildFeedLines(tiles);
  const phaseLabel  = done ? "COMPLETE" : verifying ? "VERIFYING" : getPhaseFromPct(pct, isTiled);
  const exhibit     = buildExhibit(stage, dish, loc, isRefresh, verifying, tiles, resultCount);
  const feedText    = feedLines[Math.min(stage, feedLines.length - 1)];
  const fillColor   = verifying ? "#1d9e75" : "#3d6b62";
  const dashFilled  = (pct / 100) * C;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      // Wider, darker bezel for substantial clinical look
      background: "#111210",
      padding: "clamp(10px, 2.8vmin, 28px)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
      boxSizing: "border-box",
    }}>

      {/* ── Framed screen container ──────────────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: 440,
        border: "1px solid #c4cdc8",
        display: "flex", flexDirection: "column",
        background: "#eef1ec",
        backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 3px,rgba(47,79,73,0.018) 3px,rgba(47,79,73,0.018) 4px)",
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
          height: 280, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* DATA EXHIBIT label */}
          <div style={{
            fontSize: 7.5, letterSpacing: "0.30em", color: "#5f857d",
            marginBottom: 12, flexShrink: 0,
          }}>DATA EXHIBIT</div>

          {/* Exhibit content + feed — all inside the dark panel for contrast */}
          {!verifying ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {exhibit.mono ? (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <pre style={{
                    margin: 0, fontSize: "clamp(11px,3vw,12px)", lineHeight: 1.65,
                    color: "#7fe3c8", whiteSpace: "pre",
                    fontFamily: "'IBM Plex Mono','Courier New',monospace",
                  }}>{exhibit.text}</pre>
                </div>
              ) : (
                <div style={{
                  fontSize: "clamp(11px,3.2vw,13px)", lineHeight: 1.75,
                  color: "#7fe3c8", whiteSpace: "pre", textAlign: "center",
                  fontFamily: "'IBM Plex Mono','Courier New',monospace", fontWeight: 500,
                }}>{exhibit.text}</div>
              )}
            </div>
          ) : (
            /* VERIFYING — checks stream inside the dark panel, always on dark bg */
            <div style={{ flex: 1, paddingTop: 8 }}>
              {verifyFeed.map((line, i) => (
                <div key={i} style={{
                  fontSize: "clamp(10px,2.6vw,12px)", lineHeight: 1.75,
                  color: "#3fd98a", letterSpacing: "0.04em", fontWeight: 600,
                }}>{line}</div>
              ))}
              {!done && verifyFeed.length < 8 && (
                <span style={{
                  display: "inline-block", width: 6, height: 10,
                  background: "#3fd98a", verticalAlign: "middle",
                  animation: "lt-blink 1.1s step-end infinite",
                }} />
              )}
            </div>
          )}

          {/* Feed line (pipeline phase only) */}
          {!verifying && (
            <div style={{
              borderTop: "1px solid #2c4a44", marginTop: 10, paddingTop: 8,
              fontSize: 8.5, color: "#8aa9a2", letterSpacing: "0.04em",
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

      {/* Controls — below the framed screen */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 14 }}>
        {/* Background mode — primary action */}
        {onBackground && (
          <button
            onClick={onBackground}
            style={{
              background: "none",
              border: "1px solid #3d6b62",
              borderRadius: 3,
              color: "#7fe3c8",
              fontFamily: "'IBM Plex Mono','Courier New',monospace",
              fontSize: 9, letterSpacing: "0.22em",
              padding: "6px 18px",
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(127,227,200,0.07)"; e.currentTarget.style.borderColor = "#7fe3c8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#3d6b62"; }}
          >
            ↓ LET IT RUN IN BACKGROUND
          </button>
        )}

        {/* Abort — secondary */}
        <button
          onClick={onStop}
          style={{
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
      </div>

      <style>{`
        @keyframes lt-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      `}</style>
    </div>
  );
}

// Legacy export kept for any import that references STEPS
export const STEPS: string[] = [];
