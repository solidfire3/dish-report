'use client';
import { useState, useEffect, useRef, useMemo } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type LoadingTrackerProps = {
  query?:      string;
  dish?:       string;
  location?:   string;
  radius?:     number;
  apiDone?:    boolean;
  onDone?:     () => void;
  onStop?:     () => void;
  searchMode?: "original" | "refresh";
  // legacy props kept for compat (unused)
  step?: number; lstep?: number; resultsReady?: boolean; onSeeResults?: () => void;
};

type LogLine   = { text: string; amber?: boolean; green?: boolean };
type ScriptEntry = LogLine & { pct: number };

// ─── TIMING ───────────────────────────────────────────────────────────────────

function getDwell(pct: number): number {
  const r = Math.random();
  if (pct < 8)  return  80 + r * 160;  // BOOT        ~80–240 ms
  if (pct < 32) return 200 + r * 340;  // SCAN       ~200–540 ms
  if (pct < 70) return 260 + r * 520;  // ANALYSIS   ~260–780 ms
  if (pct < 86) return 190 + r * 340;  // DISTRIB    ~190–530 ms
  return                150 + r * 250; // NARROWING  ~150–400 ms
}

// ─── PROGRESS BAR (ASCII) ─────────────────────────────────────────────────────

function makeBar(pct: number, w = 18): string {
  const f = Math.round((pct / 100) * w);
  return `[${"█".repeat(f)}${"░".repeat(w - f)}] ${String(pct).padStart(3)}%`;
}

// ─── SCRIPT GENERATOR ─────────────────────────────────────────────────────────

function buildScript(p: {
  rawQuery: string; dish: string; location: string; radius: number; mode?: string;
}): ScriptEntry[] {
  const { rawQuery, dish, location, radius, mode } = p;
  const s: ScriptEntry[] = [];
  const L = (pct: number, text: string, o: Partial<LogLine> = {}) =>
    s.push({ pct, text, ...o });

  // ── BOOT 0–8% ──────────────────────────────────────────────────────────────
  const tag = mode === "refresh"
    ? "REFRESH MODE — re-running live analysis"
    : "caffeinated and judgmental";
  L(0, `> DISH REPORT terminal v2.0 — ${tag}`, { amber: true });
  L(1, `> session.init() → ok [pid 4417 · mem 212MB · 6 cores]`);
  L(2, `> kernel: food-intelligence engine online`);
  L(3, `> parse("${rawQuery}") → tokens in 0.04s`);
  L(4, `> intent.lock(${dish}) → P=0.94`, { amber: true });
  L(5, `> geo.resolve("${location}") → lat,lon resolved`);
  L(6, `> filters=[radius:${radius}mi] ttl=120d`);
  L(7, `> handshake: places.api ✓ reviews.idx ✓ scorer ✓`, { amber: true });

  // ── SCAN 8–32% ─────────────────────────────────────────────────────────────
  L(8,  `> SELECT * FROM venues WHERE dist<=${radius}`);
  L(9,  `  ├─ candidates ........ 12`);
  L(10, `  ├─ workers ........... 6 spawned`);
  L(11, `  ├─ queue depth ....... 12`);
  L(12, `  └─ cache ............. MISS → live pull`);
  L(14, `> GET /reviews [██████████] 7052/7052 · 1.84s`, { amber: true });
  L(16, `> noise filter (regex pass):`);
  L(17, `   parking refs ........ 1,204  ✕`);
  L(18, `   "birthday!!" ........ 387    ✕`);
  L(19, `   waiter-was-cute ..... 212    ✕`);
  L(20, `   influencer hype ..... 318    ✕`);
  L(21, `   four-paragraph-saga . 96     ✕`);
  L(22, `> signal retained: 4,931 / 7,052`);
  L(24, `   ████████████████░░░░░ 69.9%`, { amber: true });

  // ── ANALYSIS 32–70% ────────────────────────────────────────────────────────
  L(32, `> vectorizing corpus → tf-idf [12×512]`);
  L(35, `> M·Mᵀ → similarity graph · 0.31s`);
  L(38, `> latent dish-affinity (SVD, k=12):`);
  L(39, `   Σ = diag(8.4, 6.1, 4.7, 3.9, ...)`);
  L(42, `> composite score model:`, { amber: true });
  L(43, `   S = 0.55·Q + 0.30·C + 0.15·R − λ·H`);
  L(44, `   Q=quality C=consistency R=signal`);
  L(45, `   H=hype-inflation  λ=0.30`);
  L(49, `> solving outlier threshold:`);
  L(50, `   x = (−b ± √(b²−4ac)) / 2a`);
  L(51, `   a=1.00 b=−7.40 c=11.2`);
  L(52, `   Δ = 54.76 − 44.80 = 9.96`);
  L(53, `   x = (7.40 ± 3.156) / 2`);
  L(54, `   x₁=5.28  x₂=2.12`, { amber: true });
  L(55, `   → reviews below x₂ flagged as noise ✕`);

  // ── DISTRIBUTION 70–86% ────────────────────────────────────────────────────
  L(70, `> fitting score distribution → μ=7.31 σ=0.82`, { amber: true });
  L(71, `   food_score ~ N(μ, σ²)`);
  L(72, `   f(x)=1/(σ√2π)·e^−((x−μ)²/2σ²)`);
  L(73, ``);
  L(74, `   p │       ▁▃▅▇█▇▅▃▁`);
  L(75, `     │     ▁▃█████████▃▁`);
  L(76, `     │   ▁▃█████████████▃▁`);
  L(77, `     │ ▁▃█████████████████▃`);
  L(78, `     └────────┬─────────────`);
  L(79, `     4  5  6  7│ 8  9  10`);
  L(80, `               μ=7.31`);
  L(81, ``);
  L(83, `> 1σ band [6.49–8.13] holds 68% of venues`);
  L(85, `> z-score top pick: +2.04 → 96th pct`, { amber: true });

  // ── NARROWING 86–99% ───────────────────────────────────────────────────────
  L(86, `> sort(candidates, score DESC)`);
  L(88, `> category_gate(${dish}):`);
  L(89, `   fine-dining w/ 1 ${dish} → REJECT (rel 0.18)`);
  L(91, `> cross_ref(${location}) → overlaps found`);
  L(93, `> 12 → 5 finalists · converged in 11 iters`);
  L(94, `   loss: 0.412→0.087→0.019 ↓`, { amber: true });
  L(95, `> a 7.31 is a 7.31. round() not imported.`);
  L(97, `> rank.finalize() · feelings[]=null`);

  return s;
}

function buildVerifyLines(dish: string, location: string): LogLine[] {
  return [
    { text: `✓ venues.exist() && serving ......... pass`, green: true },
    { text: `✓ address.crosscheck() · no ghosts .. pass`, green: true },
    { text: `✓ hours.validated() .................. pass`, green: true },
    { text: `✓ review.authenticity ≥ τ(0.80) ..... pass`, green: true },
    { text: `✓ scores.grounded(signal,¬vibes) .... pass`, green: true },
    { text: `✓ assert(no_hallucinations) → true .. pass`, green: true },
    { text: `> integrity: 6/6 · confidence HIGH`, amber: true },
    { text: `> render(${dish} · ${location}) — try to act surprised.`, amber: true },
  ];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 24;

export function LoadingTracker({
  query = "",
  dish: dishProp,
  location: locationProp,
  radius = 5,
  apiDone = false,
  onDone,
  onStop,
  searchMode,
}: LoadingTrackerProps) {

  // Resolve tokens — strip any filter-mode suffixes from the raw query
  const dish     = (dishProp?.trim() || query.replace(/\b(dine-?in|takeout|delivery|\$+)\b/gi, "").trim() || "this query").slice(0, 40);
  const location = (locationProp?.trim() || "your area").slice(0, 30);

  // Generate script once on mount — params won't change during the loading screen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const script      = useMemo(() => buildScript({ rawQuery: query, dish, location, radius, mode: searchMode }), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const verifyLines = useMemo(() => buildVerifyLines(dish, location), []);

  const [logLines,   setLogLines]   = useState<LogLine[]>(() =>
    script.filter(e => e.pct === 0).map(({ text, amber, green }) => ({ text, amber, green }))
  );
  const [progress,   setProgress]   = useState(0);
  const [verifyIdx,  setVerifyIdx]  = useState(-1);  // -1 = not started

  const completingRef = useRef(false);
  const onDoneRef     = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // ── Main progress 0→99 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (completingRef.current) return;
    if (verifyIdx >= 0) return;           // hand off to verifying phase
    if (progress >= 99) { setVerifyIdx(0); return; }

    const t = setTimeout(() => {
      const next = progress + 1;
      setProgress(next);
      const triggered = script.filter(e => e.pct === next);
      if (triggered.length) {
        setLogLines(prev => [
          ...prev,
          ...triggered.map(({ text, amber, green }) => ({ text, amber, green })),
        ]);
      }
    }, getDwell(progress));

    return () => clearTimeout(t);
  }, [progress, verifyIdx, script]);

  // ── Verifying phase (green checks after 100%) ───────────────────────────────
  useEffect(() => {
    if (verifyIdx < 0 || completingRef.current) return;

    if (verifyIdx >= verifyLines.length) {
      if (apiDone) {
        completingRef.current = true;
        setTimeout(() => onDoneRef.current?.(), 250);
      }
      // else: cursor blinks in "awaiting" state
      return;
    }

    const dwell = apiDone ? 70 : 680;
    const t = setTimeout(() => {
      const line = verifyLines[verifyIdx];
      setLogLines(prev => [...prev, { text: line.text, amber: line.amber, green: line.green }]);
      setVerifyIdx(i => i + 1);
    }, dwell);

    return () => clearTimeout(t);
  }, [verifyIdx, apiDone, verifyLines]);

  // ── apiDone arrives after all verify lines shown ─────────────────────────────
  useEffect(() => {
    if (!apiDone || completingRef.current) return;
    if (verifyIdx >= verifyLines.length) {
      completingRef.current = true;
      setTimeout(() => onDoneRef.current?.(), 250);
    }
  }, [apiDone, verifyIdx, verifyLines.length]);

  const visible   = logLines.slice(-MAX_VISIBLE);
  const inVerify  = verifyIdx >= 0;
  const isWaiting = verifyIdx >= verifyLines.length && !apiDone && !completingRef.current;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: "#2C2A27",               // bezel: muted dark desaturated
      padding: "clamp(3px, 1.2vmin, 13px)", // bezel thickness
      display: "flex",
    }}>

      {/* ── Screen ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: "#F2EEE8",
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        // Subtle screen inset / vignette (Severance-clinical)
        boxShadow: "inset 0 0 90px rgba(0,0,0,0.07), inset 0 0 3px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
      }}>

        {/* Scanline texture — barely visible */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
          background: "repeating-linear-gradient(transparent 0px,transparent 3px,rgba(0,0,0,0.011) 3px,rgba(0,0,0,0.011) 4px)",
        }} />

        {/* ── Terminal content ─────────────────────────────────────────── */}
        <div style={{
          position: "relative", zIndex: 1,
          height: "100%", boxSizing: "border-box",
          display: "flex", flexDirection: "column",
          padding: "14px 18px 12px",
          fontFamily: "'IBM Plex Mono','Courier New',monospace",
        }}>

          {/* Header bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingBottom: 9, marginBottom: 10,
            borderBottom: "1px solid rgba(28,25,23,0.15)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: "clamp(0.875rem,4.5vw,1rem)",
                fontWeight: 900, letterSpacing: "0.04em", color: "#1C1917",
              }}>DISH REPORT</span>
              {/* Blinking cursor */}
              <span style={{
                display: "inline-block", width: 7, height: 15,
                background: "#B8780A", borderRadius: 1,
                animation: "lt-blink 1.1s step-end infinite",
              }} />
            </div>
            <span style={{
              fontSize: "clamp(8px,2.2vw,10px)", color: "#A89F99", letterSpacing: "0.1em",
            }}>ANALYSIS ENGINE</span>
          </div>

          {/* ── Log area ─────────────────────────────────────────────────── */}
          <div style={{
            flex: 1, overflow: "hidden",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            {visible.map((line, i) => {
              const isLast   = i === visible.length - 1;
              const showCursor = isLast && !isWaiting && !completingRef.current;
              return (
                <div key={i} style={{
                  fontSize: "clamp(10px,2.6vw,12px)",
                  lineHeight: 1.52,
                  color: line.green ? "#1A7A3C" : line.amber ? "#B8780A" : "#1C1917",
                  fontWeight: line.green || line.amber ? 600 : 400,
                  whiteSpace: "pre",
                  overflowX: "hidden",
                  textOverflow: "clip",
                }}>
                  {line.text}
                  {showCursor && (
                    <span style={{
                      display: "inline-block", width: "0.55em", height: "0.85em",
                      background: "#B8780A", marginLeft: 2, verticalAlign: "text-bottom",
                      animation: "lt-blink 1.1s step-end infinite",
                    }} />
                  )}
                </div>
              );
            })}

            {/* "Awaiting" blink when verifying is done but results haven't landed */}
            {isWaiting && (
              <div style={{
                fontSize: "clamp(10px,2.6vw,12px)", lineHeight: 1.52,
                color: "#A89F99", whiteSpace: "pre",
              }}>
                {"  awaiting pipeline confirmation"}
                <span style={{
                  display: "inline-block", width: "0.55em", height: "0.85em",
                  background: "#A89F99", marginLeft: 2, verticalAlign: "text-bottom",
                  animation: "lt-blink 1.1s step-end infinite",
                }} />
              </div>
            )}
          </div>

          {/* ── Progress bar + controls ──────────────────────────────────── */}
          <div style={{
            flexShrink: 0, marginTop: 10,
            paddingTop: 10, borderTop: "1px solid rgba(28,25,23,0.13)",
          }}>
            <div style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "clamp(10px,2.6vw,12px)",
              color: inVerify ? "#1A7A3C" : "#B8780A",
              marginBottom: 8, letterSpacing: "0.01em",
            }}>
              {inVerify
                ? `VERIFYING  ${makeBar(100, 16)}`
                : makeBar(progress, 16)}
            </div>

            <button
              onClick={onStop}
              style={{
                background: "none",
                border: "1px solid rgba(28,25,23,0.2)",
                borderRadius: 4, color: "#6B6560",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "clamp(9px,2.2vw,11px)",
                padding: "4px 10px", cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#B8780A";
                e.currentTarget.style.color = "#B8780A";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(28,25,23,0.2)";
                e.currentTarget.style.color = "#6B6560";
              }}
            >← abort</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lt-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes lt-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// Kept for any legacy import that references STEPS
export const STEPS: string[] = [];
