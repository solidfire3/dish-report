'use client';
import { useState, useEffect, useRef } from "react";

// ─── STAGE DATA (unchanged) ───────────────────────────────────────────────────
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
  "VERIFYING FOOD SIGNAL CONSISTENCY",
  "CROSS-REFERENCING DISH MENTIONS",
  "CALIBRATING AGAINST LOCAL STANDARDS",
  "FINALIZING MUST-ORDER RECOMMENDATIONS",
  "REVIEWING INSIDER SOURCE RELIABILITY",
  "CHECKING SEASONAL MENU AVAILABILITY",
];

// ─── CANVAS CHARACTER POOL ────────────────────────────────────────────────────
const BASE_CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz0123456789';
const SYM_CHARS   = '!@#$%&*+=<>/|\\:.░▒▓█◆●▲';
const ALL_CHARS   = BASE_CHARS + SYM_CHARS;

const FOOD_POOL = [
  'BIRRIA', 'OMAKASE', 'TONKOTSU', 'CARNE ASADA', 'AL PASTOR',
  'MOLE', 'NIGIRI', 'CARBONARA', 'BRISKET', 'CEVICHE',
  'DUMPLING', 'RAMEN', 'TACO', 'PHO', 'WAGYU', 'SHAKSHUKA',
  'BARBACOA', 'CHILAQUILES', 'TIRAMISU', 'KARAAGE', 'GYOZA',
];

const REPORT_POOL = [
  'COMPILING REPORT', 'CROSS-REFERENCING', 'WEIGHTING SIGNAL',
  'RANKING DISHES', 'SIGNAL STRENGTH HIGH', 'FOOD QUALITY INDEX',
  'ANALYZING FLAVOR', 'CONSISTENCY CHECK', 'SOURCE RELIABILITY OK',
];

// Simple ASCII food shapes (rows of chars, max ~14 wide)
const ASCII_SHAPES: string[][] = [
  // Taco
  ["  .------. ", " /  ~*~*~  \\", "|  #######  |", " \\._______./  "],
  // Bowl
  [" .========. ", "|  ≈ ≈ ≈ ≈  |", "|  ≈ ≈ ≈ ≈  |", " '========' ", "    |____|   "],
  // Fish
  [" .~.~.  ><>", "/  o   )(  ", "\\       ><>", " '~'~'     "],
  // Fork
  ["| | |", "| | |", " \\|/ ", "  |  ", "  |  ", " _|_ "],
];

function rchar(): string { return ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)]; }

// ─── CANVAS ANIMATION HOOK ────────────────────────────────────────────────────
type RevealEntry = {
  lines: string[];         // one or more lines (1 = word, N = shape)
  row: number;             // starting row
  col: number;             // starting col (centred for single-line)
  startMs: number;
  totalMs: number;         // total lifetime
  amber: boolean;
};

function useCharGrid(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  query: string,
  stage: number,
  reviewCount: number,
  filteredCount: number,
  flickerScore: number,
  showComplete: boolean,
) {
  const stateRef = useRef<{
    cols: number; rows: number; cw: number; ch: number;
    grid: string[];          // current char per cell
    wave: Float32Array;      // 0-1 wave activation per cell
    reveals: RevealEntry[];
    lastRevealMs: number;
    lastShapeMs: number;
  } | null>(null);

  // Canvas setup + animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const FONT_PX = 11;
    const CW = 6.8;   // char width (IBM Plex Mono ~62% of height)
    const CH = 14;    // char height (line height)
    let cols = 0, rows = 0;

    const setup = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width  = Math.ceil(W * dpr);
      canvas.height = Math.ceil(H * dpr);
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
      ctx.font = `${FONT_PX}px "IBM Plex Mono","Courier New",monospace`;
      ctx.textBaseline = 'top';
      cols = Math.ceil(W / CW) + 2;
      rows = Math.ceil(H / CH) + 2;
      stateRef.current = {
        cols, rows, cw: CW, ch: CH,
        grid: Array.from({ length: cols * rows }, rchar),
        wave: new Float32Array(cols * rows),
        reveals: [],
        lastRevealMs: 0,
        lastShapeMs: 0,
      };
    };

    setup();
    window.addEventListener('resize', setup);

    // ── Build reveal phrase based on current state ──────────────────────────
    const getRevealPhrase = (): string => {
      const candidates: string[] = [];
      if (query) candidates.push(query.toUpperCase().slice(0, 28));
      if (stage === 3 && reviewCount > 0) candidates.push(`${reviewCount} REVIEWS SCANNED`);
      if (stage === 4 && filteredCount > 0) candidates.push(`${filteredCount} SIGNALS FILTERED`);
      if (stage === 6) candidates.push(`SCORE ${flickerScore.toFixed(1)}`);
      candidates.push(...FOOD_POOL.slice(0, 8));
      candidates.push(...REPORT_POOL.slice(0, 5));
      return candidates[Math.floor(Math.random() * candidates.length)] ?? 'ANALYZING';
    };

    // ── Spawn a word/phrase reveal ──────────────────────────────────────────
    const spawnReveal = (s: typeof stateRef.current) => {
      if (!s) return;
      const text = getRevealPhrase();
      const maxCol = Math.max(2, s.cols - text.length - 2);
      const col = Math.floor(Math.random() * maxCol);
      const row = 2 + Math.floor(Math.random() * Math.max(1, s.rows - 4));
      s.reveals.push({
        lines: [text],
        row, col,
        startMs: performance.now(),
        totalMs: 1600 + Math.random() * 1200,
        amber: true,
      });
    };

    // ── Spawn an ASCII shape ────────────────────────────────────────────────
    const spawnShape = (s: typeof stateRef.current) => {
      if (!s) return;
      const shape = ASCII_SHAPES[Math.floor(Math.random() * ASCII_SHAPES.length)];
      const maxRow = Math.max(2, s.rows - shape.length - 4);
      const maxCol = Math.max(2, s.cols - 16);
      s.reveals.push({
        lines: shape,
        row: 3 + Math.floor(Math.random() * maxRow),
        col: Math.floor(Math.random() * maxCol),
        startMs: performance.now(),
        totalMs: 2800,
        amber: false,
      });
    };

    // ── Main animation loop ─────────────────────────────────────────────────
    let raf: number;
    let lastFrame = 0;
    const FRAME_MS = 38; // ~26fps

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (ts - lastFrame < FRAME_MS) return;
      const dt = Math.min(ts - lastFrame, 100);
      lastFrame = ts;

      const s = stateRef.current;
      if (!s) return;
      const t = ts / 800; // time in "wave units"

      // ── Update wave activations ─────────────────────────────────────────
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
          // Organic interference of 3 overlapping waves
          const w1 = Math.sin(c * 0.28 + t * 1.8) * 0.5 + 0.5;
          const w2 = Math.sin(r * 0.22 - t * 1.1) * 0.5 + 0.5;
          const w3 = Math.sin((c * 0.12 + r * 0.18) + t * 0.9) * 0.5 + 0.5;
          s.wave[r * s.cols + c] = w1 * 0.40 + w2 * 0.35 + w3 * 0.25;
        }
      }

      // ── Shuffle chars based on wave activation ──────────────────────────
      for (let i = 0; i < s.cols * s.rows; i++) {
        const activation = s.wave[i];
        const prob = (0.06 + activation * 0.45) * (dt / 38);
        if (Math.random() < prob) s.grid[i] = rchar();
      }

      // ── Spawn reveals / shapes ──────────────────────────────────────────
      const now = performance.now();
      // Spawn a word reveal every 1.3-1.8s (2-3 active at once)
      if (now - s.lastRevealMs > 1300 + Math.random() * 500) {
        spawnReveal(s);
        s.lastRevealMs = now;
      }
      // Spawn a shape every 9-13s
      if (now - s.lastShapeMs > 9000 + Math.random() * 4000) {
        spawnShape(s);
        s.lastShapeMs = now;
      }
      // Expire old reveals
      s.reveals = s.reveals.filter(rv => (now - rv.startMs) < rv.totalMs);

      // ── Render ──────────────────────────────────────────────────────────
      const W = s.cols * CW;
      const H = s.rows * CH;

      ctx.fillStyle = '#F2EEE8';
      ctx.fillRect(0, 0, W, H);

      // Build a "reveal override" lookup: cellIndex → { char, alpha, amber }
      const overrideChar: Record<number, string> = {};
      const overrideAlpha: Record<number, number> = {};
      const overrideAmber: Record<number, boolean> = {};

      for (const rv of s.reveals) {
        const elapsed = now - rv.startMs;
        const progress = elapsed / rv.totalMs;
        // Fade in: 0-0.22, hold: 0.22-0.78, fade out: 0.78-1.0
        let alpha = 1;
        if (progress < 0.22) alpha = progress / 0.22;
        else if (progress > 0.78) alpha = (1 - progress) / 0.22;

        for (let li = 0; li < rv.lines.length; li++) {
          const line = rv.lines[li];
          const r = rv.row + li;
          if (r >= s.rows) continue;
          for (let ci = 0; ci < line.length; ci++) {
            const c = rv.col + ci;
            if (c >= s.cols) continue;
            const idx = r * s.cols + c;
            const ch = line[ci];
            if (ch !== ' ') {
              overrideChar[idx] = ch;
              overrideAlpha[idx] = alpha;
              overrideAmber[idx] = rv.amber;
            }
          }
        }
      }

      // Draw background chars row by row (dark, low opacity)
      for (let r = 0; r < s.rows; r++) {
        const y = r * CH;
        for (let c = 0; c < s.cols; c++) {
          const idx = r * s.cols + c;
          const x = c * CW;

          if (overrideChar[idx] !== undefined) {
            // Reveal cell
            const alpha = overrideAlpha[idx];
            if (overrideAmber[idx]) {
              ctx.fillStyle = `rgba(184,120,10,${0.85 * alpha})`;
            } else {
              // Non-amber reveal (shapes) use dark chars
              ctx.fillStyle = `rgba(28,25,23,${0.6 * alpha})`;
            }
            ctx.fillText(overrideChar[idx], x, y);
          } else {
            // Regular background char
            const activation = s.wave[idx];
            // Amber highlight at high activation
            if (activation > 0.82) {
              ctx.fillStyle = `rgba(184,120,10,${0.15 + (activation - 0.82) * 2.5})`;
            } else {
              ctx.fillStyle = `rgba(28,25,23,${0.07 + activation * 0.12})`;
            }
            ctx.fillText(s.grid[idx], x, y);
          }
        }
      }
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setup);
    };
  }, [query, stage, reviewCount, filteredCount, flickerScore]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── PROPS ────────────────────────────────────────────────────────────────────
export type LoadingTrackerProps = {
  query?: string;
  apiDone?: boolean;
  onDone?: () => void;
  onStop?: () => void;
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

  const [tabReturned, setTabReturned] = useState(false);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setTabReturned(true);
      if (document.visibilityState === "hidden")  setTabReturned(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ── Core stage state (UNCHANGED) ──────────────────────────────────────────
  const [stage,    setStage]    = useState(1);
  const [progress, setProgress] = useState(0);
  const progressBarRef          = useRef<HTMLDivElement>(null);

  const animateBar = (pct: number, durationMs = 1200) => {
    if (!progressBarRef.current) return;
    progressBarRef.current.style.transition = `width ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    progressBarRef.current.style.width = `${pct}%`;
  };

  const [reviewCount,    setReviewCount]    = useState(0);
  const reviewTarget    = useRef(Math.floor(Math.random() * (847 - 380 + 1)) + 380);
  const [filteredCount,  setFilteredCount]  = useState(0);
  const filteredTarget  = useRef(0);
  const [visibleMetrics, setVisibleMetrics] = useState(0);
  const metrics = useRef({
    flavor:      Math.floor(Math.random() * (180 - 40 + 1)) + 40,
    technique:   Math.floor(Math.random() * (90  - 20 + 1)) + 20,
    consistency: Math.floor(Math.random() * (60  - 15 + 1)) + 15,
    freshness:   Math.floor(Math.random() * (45  - 10 + 1)) + 10,
  });
  const [flickerScore,  setFlickerScore]  = useState(7.0);
  const flickerLocked  = useRef(false);
  const finalScore     = useRef(+(Math.random() * (9.2 - 6.8) + 6.8).toFixed(1));
  const [progress7,    setProgress7]    = useState(91);
  const [subStatusIdx, setSubStatusIdx] = useState(0);
  const [showStandBy,  setShowStandBy]  = useState(false);
  const [canComplete,  setCanComplete]  = useState(false);
  const completingRef                   = useRef(false);   // CRITICAL — do not change
  const [showComplete, setShowComplete] = useState(false);

  // ── Stage advancement (UNCHANGED) ─────────────────────────────────────────
  useEffect(() => {
    if (stage >= 7) return;
    const ms = STAGES[stage - 1].minMs;
    const t = setTimeout(() => {
      const np = STAGE_DONE_PROGRESS[stage - 1];
      setProgress(np); animateBar(np); setStage(s => s + 1);
    }, ms);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 7) return;
    setProgress(91); setProgress7(91); animateBar(91);
    setCanComplete(false); setShowStandBy(false);
    const minTimer   = setTimeout(() => setCanComplete(true), STAGES[6].minMs);
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

  // ── Completion trigger (UNCHANGED — completingRef freeze-prevention) ───────
  useEffect(() => {
    if (apiDone && canComplete && stage === 7 && !completingRef.current) {
      completingRef.current = true;
      setProgress(100); animateBar(100, 600); setShowComplete(true);
      const t = setTimeout(() => { setShowComplete(false); onDoneRef.current?.(); }, 1000);
      return () => clearTimeout(t);
    }
  }, [apiDone, canComplete, stage]);

  // ── Stage counters (UNCHANGED) ─────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 3) return;
    const target = reviewTarget.current;
    const inc = target / (STAGES[2].minMs / 300);
    let cur = 0;
    const iv = setInterval(() => { cur = Math.min(cur + inc, target); setReviewCount(Math.floor(cur)); if (cur >= target) clearInterval(iv); }, 300);
    return () => clearInterval(iv);
  }, [stage]);

  useEffect(() => {
    if (stage !== 4) return;
    const target = Math.floor(reviewTarget.current * (0.6 + Math.random() * 0.2));
    filteredTarget.current = target;
    const inc = target / (STAGES[3].minMs / 300);
    let cur = 0;
    const iv = setInterval(() => { cur = Math.min(cur + inc, target); setFilteredCount(Math.floor(cur)); if (cur >= target) clearInterval(iv); }, 300);
    return () => clearInterval(iv);
  }, [stage]);

  useEffect(() => {
    if (stage !== 5) return;
    setVisibleMetrics(0);
    const ts = [1200, 2400, 3600, 4800].map((ms, i) => setTimeout(() => setVisibleMetrics(v => Math.max(v, i + 1)), ms));
    return () => ts.forEach(clearTimeout);
  }, [stage]);

  useEffect(() => {
    if (stage !== 6) return;
    flickerLocked.current = false;
    const iv = setInterval(() => { if (!flickerLocked.current) setFlickerScore(+(Math.random() * (9.5 - 5.5) + 5.5).toFixed(1)); }, 100);
    const lk = setTimeout(() => {
      flickerLocked.current = true; clearInterval(iv);
      const settle = [80, 160, 260].map((ms, i) => setTimeout(() => { const m = finalScore.current; setFlickerScore([m + 0.3, m - 0.1, m][i] ?? m); }, ms));
      return () => settle.forEach(clearTimeout);
    }, 2500);
    return () => { clearInterval(iv); clearTimeout(lk); };
  }, [stage]);

  // ── Canvas reference ───────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCharGrid(canvasRef, query, stage, reviewCount, filteredCount, flickerScore, showComplete);

  // ── Stage data line ────────────────────────────────────────────────────────
  const stageData = STAGES[stage - 1];
  const dataLine: string = (() => {
    if (showComplete)  return "REPORT COMPLETE";
    if (stage === 3)   return `SCANNING // ${reviewCount.toLocaleString()} REVIEWS`;
    if (stage === 4)   return `FILTERED // ${filteredCount.toLocaleString()} SIGNALS`;
    if (stage === 5) {
      const m = metrics.current;
      const parts = [
        visibleMetrics >= 1 && `FLAVOR:${m.flavor}`,
        visibleMetrics >= 2 && `TECH:${m.technique}`,
        visibleMetrics >= 3 && `CONSIST:${m.consistency}`,
        visibleMetrics >= 4 && `FRESH:${m.freshness}`,
      ].filter(Boolean);
      return parts.join('  ') || stageData.label.toUpperCase();
    }
    if (stage === 6)   return `ANALYTICAL SCORE  ${flickerScore.toFixed(1)}`;
    if (stage === 7)   return showStandBy ? "PROCESSING // PLEASE STAND BY" : SUB_STATUSES[subStatusIdx];
    return stageData.label.toUpperCase();
  })();

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "#F2EEE8", overflow: "hidden" }}>
      {/* Full-screen canvas — the character field */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Tab-returned banner */}
      {tabReturned && !apiDone && !completingRef.current && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
          background: "rgba(184,120,10,0.1)", borderBottom: "1px solid rgba(184,120,10,0.2)",
          padding: "8px 20px", textAlign: "center",
        }}>
          <span style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#B8780A", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Still working on your report — hang tight
          </span>
        </div>
      )}

      {/* ── HTML overlay — above canvas ──────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", pointerEvents: "none" }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0", flexShrink: 0 }}>
          {/* Brand + cursor */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1rem", fontWeight: 900, color: "#1C1917",
              letterSpacing: "0.04em", lineHeight: 1,
            }}>DISH REPORT</div>
            <div style={{
              width: 7, height: 14, background: "#B8780A", borderRadius: 1,
              animation: "lt-cursor 1.1s step-end infinite",
            }} />
          </div>
          {/* Stage counter */}
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.625rem", color: "#A89F99", letterSpacing: "0.1em" }}>
            {String(stage).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
          </div>
        </div>

        {/* Center — query label */}
        {query && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 24px",
          }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.75rem", color: "#B8780A",
              letterSpacing: "0.05em", textAlign: "center",
              background: "rgba(242,238,232,0.85)",
              backdropFilter: "blur(4px)",
              padding: "6px 16px", borderRadius: 6,
              border: "1px solid rgba(184,120,10,0.2)",
            }}>
              › {query}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ padding: "0 24px 0", flexShrink: 0 }}>
          {/* Data line */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.6875rem", fontWeight: 700,
            color: "#B8780A", letterSpacing: "0.04em",
            minHeight: "1.4em", marginBottom: 10,
            background: "rgba(242,238,232,0.8)",
            display: "inline-block", padding: "2px 8px", borderRadius: 4,
          }}>
            {dataLine}
          </div>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.25rem", fontWeight: 700, color: "#B8780A", letterSpacing: "0.02em", flexShrink: 0, minWidth: 50 }}>
              {progress}%
            </div>
            <div style={{ flex: 1, height: 3, background: "rgba(28,25,23,0.15)", borderRadius: 2, overflow: "hidden" }}>
              <div ref={progressBarRef} style={{ height: "100%", width: "0%", borderRadius: 2, background: "linear-gradient(90deg, #9A6209, #B8780A, #D4920C)" }} />
            </div>
          </div>

          {/* Stage label */}
          <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.625rem", color: "#6B6560", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
            {stageData.label}
          </div>
        </div>

        {/* Stop button — needs pointer events */}
        <div style={{ padding: "0 24px 28px", flexShrink: 0, pointerEvents: "auto" }}>
          <button onClick={onStop} style={{
            background: "rgba(242,238,232,0.9)", border: "1px solid rgba(28,25,23,0.15)",
            borderRadius: 8, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#A89F99",
            padding: "7px 16px", letterSpacing: "0.04em", transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8780A"; e.currentTarget.style.color = "#B8780A"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(28,25,23,0.15)"; e.currentTarget.style.color = "#A89F99"; }}
          >← Edit search</button>
        </div>
      </div>

      <style>{`@keyframes lt-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </div>
  );
}

export const STEPS = STAGES.map(s => s.label);
