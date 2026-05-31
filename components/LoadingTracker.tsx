'use client';
import { useState, useEffect, useRef } from "react";

// ─── STAGE DATA ───────────────────────────────────────────────────────────────
const STAGES = [
  { id: 1, label: "Reading your search",    minMs: 2000  },
  { id: 2, label: "Finding candidates",      minMs: 2500  },
  { id: 3, label: "Pulling reviews",         minMs: 6000  },
  { id: 4, label: "Filtering the noise",     minMs: 4000  },
  { id: 5, label: "Extracting food signal",  minMs: 6000  },
  { id: 6, label: "Scoring and ranking",     minMs: 3500  },
  { id: 7, label: "Writing your report",     minMs: 4000  },
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

// ─── CHARACTER GRID ───────────────────────────────────────────────────────────
const GRID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz0123456789!@#$%&*+-=<>/|';
const GRID_ROWS  = 14;

const STAGE_REVEALS: Record<number, string[]> = {
  1: ['PARSING QUERY', 'READING INPUT', 'TOKENIZING'],
  2: ['SCANNING AREA', 'MAPPING RADIUS', 'LOCATING'],
  3: ['PULLING REVIEWS', 'COLLECTING DATA', 'SOURCES FOUND'],
  4: ['FILTERING NOISE', 'REMOVING IRRELEVANT', 'SIGNAL ONLY'],
  5: ['FLAVOR SIGNAL', 'FOOD QUALITY', 'EXTRACTING'],
  6: ['CALCULATING SCORE', 'RANKING BY FOOD', 'SCORING'],
  7: ['COMPILING REPORT', 'FINALIZING', 'DISH REPORT'],
};

const FOOD_WORDS = [
  'BIRRIA', 'OMAKASE', 'TONKOTSU', 'CEVICHE', 'BRISKET',
  'WAGYU', 'CROISSANT', 'TACOS', 'RAMEN', 'NIGIRI',
  'BARBACOA', 'TIRAMISU', 'MOLE', 'PHO', 'CARNITAS',
];

function rchar(): string { return GRID_CHARS[Math.floor(Math.random() * GRID_CHARS.length)]; }
function randomRow(n: number): string { return Array.from({ length: n }, rchar).join(''); }
function padCenter(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text + ' '.repeat(width - pad - text.length);
}

type GridLine = { text: string; amber: boolean; locked: boolean };

function CharGrid({ stage, query }: { stage: number; query: string }) {
  const [cols, setCols] = useState(50);
  const [lines, setLines] = useState<GridLine[]>(() =>
    Array.from({ length: GRID_ROWS }, () => ({ text: randomRow(50), amber: false, locked: false }))
  );
  const lockedRef = useRef<Map<number, { text: string; amber: boolean; until: number }>>(new Map());

  // Responsive column count
  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 48, 720);
      // ~7.8px per char at 0.625rem IBM Plex Mono
      setCols(Math.max(30, Math.floor(w / 7.8)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Shuffle unlocked rows every 75ms
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setLines(prev => prev.map((line, i) => {
        const locked = lockedRef.current.get(i);
        if (locked && now < locked.until) {
          return { text: locked.text, amber: locked.amber, locked: true };
        }
        if (locked && now >= locked.until) lockedRef.current.delete(i);
        return { text: randomRow(cols), amber: false, locked: false };
      }));
    }, 75);
    return () => clearInterval(iv);
  }, [cols]);

  // Reveal interesting text every 1.4s
  useEffect(() => {
    const stageWords = STAGE_REVEALS[stage] ?? [];
    const pool = [
      ...stageWords,
      query.toUpperCase().slice(0, 30),
      ...FOOD_WORDS.slice(0, 6),
    ].filter(Boolean);

    const reveal = () => {
      // Lock 1 random row to a message, amber-highlighted
      const row = Math.floor(Math.random() * GRID_ROWS);
      const text = pool[Math.floor(Math.random() * pool.length)];
      lockedRef.current.set(row, {
        text: padCenter(text, cols),
        amber: true,
        until: Date.now() + 1000,
      });
    };

    reveal();
    const iv = setInterval(reveal, 1400);
    return () => clearInterval(iv);
  }, [stage, query, cols]);

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: "0.625rem", lineHeight: 1.6,
      letterSpacing: "0.03em",
      userSelect: "none", overflow: "hidden",
      width: "100%",
    }}>
      {lines.map((line, i) => (
        <div key={i} style={{
          whiteSpace: "pre",
          color: line.amber ? "#B8780A" : "rgba(28,25,23,0.18)",
          fontWeight: line.amber ? 700 : 400,
          overflow: "hidden",
          transition: line.amber ? "color 0.15s" : "none",
        }}>{line.text.slice(0, cols)}</div>
      ))}
    </div>
  );
}

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

  // Detect when user returns to a backgrounded tab
  const [tabReturned, setTabReturned] = useState(false);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setTabReturned(true);
      if (document.visibilityState === "hidden")  setTabReturned(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ── Core stage state ───────────────────────────────────────────────────────
  const [stage,    setStage]    = useState(1);
  const [progress, setProgress] = useState(0);
  const progressBarRef          = useRef<HTMLDivElement>(null);

  const animateBar = (pct: number, durationMs = 1200) => {
    if (!progressBarRef.current) return;
    progressBarRef.current.style.transition = `width ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    progressBarRef.current.style.width = `${pct}%`;
  };

  // ── Stage 3 ────────────────────────────────────────────────────────────────
  const [reviewCount,  setReviewCount]  = useState(0);
  const reviewTarget = useRef(Math.floor(Math.random() * (847 - 380 + 1)) + 380);

  // ── Stage 4 ────────────────────────────────────────────────────────────────
  const [filteredCount, setFilteredCount] = useState(0);
  const filteredTarget = useRef(0);

  // ── Stage 5 ────────────────────────────────────────────────────────────────
  const [visibleMetrics, setVisibleMetrics] = useState(0);
  const metrics = useRef({
    flavor:      Math.floor(Math.random() * (180 - 40  + 1)) + 40,
    technique:   Math.floor(Math.random() * (90  - 20  + 1)) + 20,
    consistency: Math.floor(Math.random() * (60  - 15  + 1)) + 15,
    freshness:   Math.floor(Math.random() * (45  - 10  + 1)) + 10,
  });

  // ── Stage 6 ────────────────────────────────────────────────────────────────
  const [flickerScore,  setFlickerScore]  = useState(7.0);
  const flickerLocked = useRef(false);
  const finalScore    = useRef(+(Math.random() * (9.2 - 6.8) + 6.8).toFixed(1));

  // ── Stage 7 ────────────────────────────────────────────────────────────────
  const [progress7,    setProgress7]    = useState(91);
  const [subStatusIdx, setSubStatusIdx] = useState(0);
  const [showStandBy,  setShowStandBy]  = useState(false);
  const [canComplete,  setCanComplete]  = useState(false);
  const completingRef                   = useRef(false);
  const [showComplete, setShowComplete] = useState(false);

  // ── Stage advancement (unchanged) ─────────────────────────────────────────
  useEffect(() => {
    if (stage >= 7) return;
    const ms = STAGES[stage - 1].minMs;
    const t = setTimeout(() => {
      const nextProgress = STAGE_DONE_PROGRESS[stage - 1];
      setProgress(nextProgress);
      animateBar(nextProgress);
      setStage(s => s + 1);
    }, ms);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 7) return;
    setProgress(91);
    setProgress7(91);
    animateBar(91);
    setCanComplete(false);
    setShowStandBy(false);
    const minTimer  = setTimeout(() => setCanComplete(true), STAGES[6].minMs);
    const crawlTimer = setInterval(() => {
      setProgress7(p => { if (p >= 99) { setShowStandBy(true); return 99; } return p + 1; });
    }, 3000);
    const statusTimer = setInterval(() => {
      setSubStatusIdx(i => (i + 1) % SUB_STATUSES.length);
    }, 2500);
    return () => { clearTimeout(minTimer); clearInterval(crawlTimer); clearInterval(statusTimer); };
  }, [stage]);

  useEffect(() => {
    if (stage === 7) { setProgress(progress7); animateBar(progress7, 1200); }
  }, [stage, progress7]);

  // ── Completion trigger (unchanged — keeps the completingRef fix) ───────────
  useEffect(() => {
    if (apiDone && canComplete && stage === 7 && !completingRef.current) {
      completingRef.current = true;
      setProgress(100);
      animateBar(100, 600);
      setShowComplete(true);
      const t = setTimeout(() => {
        setShowComplete(false);
        onDoneRef.current?.();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [apiDone, canComplete, stage]);

  // ── Stage 3 counter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 3) return;
    const target = reviewTarget.current;
    const inc = target / (STAGES[2].minMs / 300);
    let current = 0;
    const iv = setInterval(() => {
      current = Math.min(current + inc, target);
      setReviewCount(Math.floor(current));
      if (current >= target) clearInterval(iv);
    }, 300);
    return () => clearInterval(iv);
  }, [stage]);

  // ── Stage 4 counter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 4) return;
    const target = Math.floor(reviewTarget.current * (0.6 + Math.random() * 0.2));
    filteredTarget.current = target;
    const inc = target / (STAGES[3].minMs / 300);
    let current = 0;
    const iv = setInterval(() => {
      current = Math.min(current + inc, target);
      setFilteredCount(Math.floor(current));
      if (current >= target) clearInterval(iv);
    }, 300);
    return () => clearInterval(iv);
  }, [stage]);

  // ── Stage 5 metrics ────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 5) return;
    setVisibleMetrics(0);
    const timers = [1200, 2400, 3600, 4800].map((ms, i) =>
      setTimeout(() => setVisibleMetrics(v => Math.max(v, i + 1)), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  // ── Stage 6 flicker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 6) return;
    flickerLocked.current = false;
    const iv = setInterval(() => {
      if (!flickerLocked.current) setFlickerScore(+(Math.random() * (9.5 - 5.5) + 5.5).toFixed(1));
    }, 100);
    const lock = setTimeout(() => {
      flickerLocked.current = true;
      clearInterval(iv);
      const settle = [80, 160, 260].map((ms, i) =>
        setTimeout(() => {
          const mid = finalScore.current;
          setFlickerScore([mid + 0.3, mid - 0.1, mid][i] ?? mid);
        }, ms)
      );
      return () => settle.forEach(clearTimeout);
    }, 2500);
    return () => { clearInterval(iv); clearTimeout(lock); };
  }, [stage]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const stageData = STAGES[stage - 1];

  // Stage-specific data line shown below the grid
  const dataLine: string | null = (() => {
    if (stage === 3) return `SCANNING // ${reviewCount.toLocaleString()} REVIEWS`;
    if (stage === 4) return `FILTERED // ${filteredCount.toLocaleString()} IRRELEVANT SIGNALS`;
    if (stage === 5) {
      const m = metrics.current;
      const parts = [
        visibleMetrics >= 1 && `FLAVOR:${m.flavor}`,
        visibleMetrics >= 2 && `TECHNIQUE:${m.technique}`,
        visibleMetrics >= 3 && `CONSISTENCY:${m.consistency}`,
        visibleMetrics >= 4 && `FRESHNESS:${m.freshness}`,
      ].filter(Boolean);
      return parts.length ? parts.join('  ') : null;
    }
    if (stage === 6) return `ANALYTICAL SCORE  ${flickerScore.toFixed(1)}`;
    if (stage === 7) {
      if (showComplete)    return "REPORT COMPLETE";
      if (showStandBy)     return "PROCESSING // PLEASE STAND BY";
      return SUB_STATUSES[subStatusIdx];
    }
    return null;
  })();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: "#F2EEE8",
      // Subtle grid texture matching TerminalSearch
      backgroundImage: "radial-gradient(circle, rgba(28,25,23,0.06) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Tab-returned banner */}
      {tabReturned && !apiDone && !completingRef.current && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "rgba(184,120,10,0.1)", borderBottom: "1px solid rgba(184,120,10,0.2)",
          padding: "8px 20px", textAlign: "center", zIndex: 1,
        }}>
          <span style={{
            fontFamily: "'Sevastopol', Georgia, serif",
            fontSize: "0.625rem", color: "#B8780A",
            textTransform: "uppercase", letterSpacing: "0.15em",
          }}>Still working on your report — hang tight</span>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 24px 16px", flexShrink: 0,
      }}>
        {/* Brand + blinking cursor */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontFamily: "var(--font-orbitron), 'Courier New', monospace",
            fontSize: "1rem", fontWeight: 900, color: "#1C1917",
            letterSpacing: "0.04em", lineHeight: 1,
          }}>DISH REPORT</div>
          <div style={{
            width: 7, height: 14, background: "#B8780A",
            borderRadius: 1,
            animation: "ts-cursor 1.1s step-end infinite",
          }} />
        </div>

        {/* Stage counter right-side */}
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.625rem", color: "#A89F99",
          letterSpacing: "0.1em",
        }}>
          {String(stage).padStart(2,"0")} / {String(STAGES.length).padStart(2,"0")}
        </div>
      </div>

      {/* ── Character grid ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflow: "hidden",
        padding: "0 24px",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        {/* Query display above grid */}
        {query && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.6875rem", color: "#B8780A",
            letterSpacing: "0.04em", marginBottom: 12,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            › {query}
          </div>
        )}

        <CharGrid stage={stage} query={query} />

        {/* Stage data line below grid */}
        {dataLine && (
          <div style={{
            marginTop: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.6875rem", fontWeight: 700,
            color: "#B8780A", letterSpacing: "0.04em",
            minHeight: "1.2em",
          }}>
            {dataLine}
          </div>
        )}
      </div>

      {/* ── Progress bar + label ────────────────────────────────────────── */}
      <div style={{ padding: "16px 24px 8px", flexShrink: 0 }}>
        {/* Progress number + bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "1.25rem", fontWeight: 700, color: "#B8780A",
            letterSpacing: "0.02em", lineHeight: 1, flexShrink: 0, minWidth: 52,
          }}>{progress}%</div>
          <div style={{ flex: 1, height: 3, background: "rgba(28,25,23,0.12)", borderRadius: 2, overflow: "hidden" }}>
            <div
              ref={progressBarRef}
              style={{
                height: "100%", width: "0%", borderRadius: 2,
                background: "linear-gradient(90deg, #9A6209 0%, #B8780A 60%, #D4920C 100%)",
              }}
            />
          </div>
        </div>

        {/* Stage label */}
        <div style={{
          fontFamily: "'Sevastopol', Georgia, serif",
          fontSize: "0.625rem", color: "#6B6560",
          textTransform: "uppercase", letterSpacing: "0.12em",
        }}>
          {stageData.label}
        </div>
      </div>

      {/* ── Stop button ─────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 24px 28px", flexShrink: 0 }}>
        <button
          onClick={onStop}
          style={{
            background: "none", border: "1px solid rgba(28,25,23,0.15)",
            borderRadius: 8, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.75rem", color: "#A89F99",
            padding: "7px 16px", letterSpacing: "0.04em",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8780A"; e.currentTarget.style.color = "#B8780A"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(28,25,23,0.15)"; e.currentTarget.style.color = "#A89F99"; }}
        >← Edit search</button>
      </div>

      {/* CSS for blinking cursor (reuse ts-cursor from TerminalSearch's style injection) */}
      <style>{`
        @keyframes ts-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Legacy export
export const STEPS = STAGES.map(s => s.label);
