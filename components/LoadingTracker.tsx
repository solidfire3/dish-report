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

// ─── CHARACTER POOLS (FIX 3) ─────────────────────────────────────────────────
const NOISE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz0123456789:.-+=/|';
const SCRAMBLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#@%&*+=<>';

const DISH_POOL = [
  'CARNE ASADA', 'AL PASTOR', 'BIRRIA', 'MOLE', 'OMAKASE',
  'NIGIRI', 'TONKOTSU', 'CARBONARA', 'CACIO E PEPE', 'BRISKET',
  'CEVICHE', 'PHO', 'PAD THAI', 'KIMCHI', 'GYOZA',
  'WAGYU', 'KARAAGE', 'SHAKSHUKA', 'CHILAQUILES', 'TIRAMISU',
];

// Stage-specific process phrases (FIX 3)
const PROCESS_EARLY   = ['READING QUERY', 'PARSING INPUT', 'LOCATING CANDIDATES', 'MAPPING AREA'];
const PROCESS_SCAN    = ['PULLING REVIEWS', 'COLLECTING DATA', 'SOURCES FOUND'];
const PROCESS_FILTER  = ['FILTERING NOISE', 'REMOVING IRRELEVANT', 'SIGNAL ONLY'];
const PROCESS_METRIC  = ['EXTRACTING FLAVOR', 'MEASURING QUALITY', 'FOOD SIGNAL'];
const PROCESS_SCORE   = ['CALCULATING SCORE', 'RANKING BY FOOD', 'SCORING'];
const PROCESS_COMPILE = ['COMPILING REPORT', 'CROSS-REFERENCING', 'WEIGHTING SIGNAL', 'RANKING DISHES', 'FINALIZING'];
const METRIC_LABELS   = ['FLAVOR 94', 'TECHNIQUE 88', 'FRESHNESS 91', 'CONSISTENCY 87', 'TEXTURE 90', 'VALUE 85'];

// FIX 4 — hardcoded ASCII art (~14 wide × 5-8 tall), clearly recognizable
const ASCII_SHAPES: string[][] = [
  // Taco
  [
    "   .-------.   ",
    "  /  ~ * ~  \\  ",
    " / ######### \\ ",
    "|.###########.|",
    " \\'---------'/ ",
  ],
  // Ramen bowl
  [
    " _____________ ",
    "|  ~ ~ ~ ~ ~  |",
    "|  ~~~~~~~~~~  |",
    "|_____________|",
    "    |     |    ",
    "   _|_____|_   ",
    "  |_________|  ",
  ],
  // Fish
  [
    "  .~~~~~~~~~.  ",
    " /   (o)     > ",
    "| ~~~~~~~~~~~ |",
    " \\           > ",
    "  '~~~~~~~~~'  ",
  ],
  // Fork and knife
  [
    " | |    |  ",
    " | |    |  ",
    " | |   /   ",
    "  \\|  /    ",
    "   | /     ",
    "   ||      ",
    "   |_      ",
  ],
];

function rnoiseChar(): string { return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]; }
function rscramble(): string { return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]; }

// ─── CANVAS ANIMATION HOOK ────────────────────────────────────────────────────
type RevealEntry = {
  lines: string[];
  row: number;
  col: number;
  startMs: number;
  materializeMs: number;   // duration of left-to-right decode effect
  holdMs: number;          // duration fully formed
  dissolveMs: number;      // duration of fade-out
  amber: boolean;          // amber or dark
  isHero: boolean;         // hero = center position, slightly more prominent
  // Pre-computed: flat list of (lineIdx, charIdx, targetChar) for non-space chars
  chars: { li: number; ci: number; ch: string; lockMs: number }[];
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
    grid: string[];
    wave: Float32Array;
    reveals: RevealEntry[];
    lastRevealMs: number;
    lastShapeMs: number;
    heroSpawnedAt: number;
    shapeIndex: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const NOISE_PX  = 10;   // FIX 1: noise chars — small
    const REVEAL_PX = 13;   // FIX 1: reveal chars — larger, bolder
    const CW = 6.8;
    const CH = 14;
    let cols = 0, rows = 0;

    const setup = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width  = Math.ceil(W * dpr);
      canvas.height = Math.ceil(H * dpr);
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
      ctx.textBaseline = 'top';
      cols = Math.ceil(W / CW) + 2;
      rows = Math.ceil(H / CH) + 2;
      stateRef.current = {
        cols, rows, cw: CW, ch: CH,
        grid: Array.from({ length: cols * rows }, rnoiseChar),
        wave: new Float32Array(cols * rows),
        reveals: [],
        lastRevealMs: 0,
        lastShapeMs: 0,
        heroSpawnedAt: 0,
        shapeIndex: 0,
      };
    };

    setup();
    window.addEventListener('resize', setup);

    // ── Build a RevealEntry from lines of text ─────────────────────────────
    const makeReveal = (
      lines: string[], row: number, col: number,
      materializeMs: number, holdMs: number, dissolveMs: number,
      amber: boolean, isHero: boolean,
    ): RevealEntry => {
      // Collect all non-space chars with staggered lock times
      const allChars: RevealEntry['chars'] = [];
      let total = 0;
      for (let li = 0; li < lines.length; li++) {
        for (let ci = 0; ci < lines[li].length; ci++) {
          if (lines[li][ci] !== ' ') total++;
        }
      }
      let idx = 0;
      for (let li = 0; li < lines.length; li++) {
        for (let ci = 0; ci < lines[li].length; ci++) {
          const ch = lines[li][ci];
          if (ch !== ' ') {
            // Stagger: left-to-right, top-to-bottom, lock over 80% of materializeMs
            const lockMs = total > 1 ? (idx / (total - 1)) * materializeMs * 0.8 : 0;
            allChars.push({ li, ci, ch, lockMs });
            idx++;
          }
        }
      }
      return { lines, row, col, startMs: performance.now(), materializeMs, holdMs, dissolveMs, amber, isHero, chars: allChars };
    };

    // ── Check if a row range overlaps existing reveals ─────────────────────
    const overlapsExisting = (s: typeof stateRef.current, row: number, rowSpan: number): boolean => {
      if (!s) return false;
      const now = performance.now();
      return s.reveals.some(rv => {
        const age = now - rv.startMs;
        const alive = age < rv.materializeMs + rv.holdMs + rv.dissolveMs;
        if (!alive) return false;
        const rvEnd = rv.row + rv.lines.length - 1;
        return row <= rvEnd + 1 && row + rowSpan >= rv.row - 1;
      });
    };

    // ── Stage-appropriate content pool (FIX 3) ────────────────────────────
    let revealCounter = 0;
    const getContent = (): { text: string; amber: boolean; isHero: boolean } => {
      revealCounter++;
      const n = revealCounter;

      // Query shows as hero early and periodically
      if (query && (n === 1 || n % 8 === 0)) {
        return { text: query.toUpperCase().slice(0, 22), amber: true, isHero: true };
      }

      // Stage-specific live phrases
      if (stage === 3 && reviewCount > 0 && n % 3 === 0)
        return { text: `SCANNING ${reviewCount} REVIEWS`, amber: true, isHero: false };
      if (stage === 4 && filteredCount > 0 && n % 3 === 0)
        return { text: `FILTERED ${filteredCount} SIGNALS`, amber: true, isHero: false };
      if (stage === 6 && n % 4 === 0)
        return { text: `SCORE ${flickerScore.toFixed(1)}`, amber: true, isHero: true };
      if (showComplete)
        return { text: 'REPORT COMPLETE', amber: true, isHero: true };

      // Pool selection by stage
      const dishChance = Math.random();
      if (dishChance < 0.35) {
        const dish = DISH_POOL[Math.floor(Math.random() * DISH_POOL.length)];
        return { text: dish, amber: false, isHero: false };
      }

      const metricChance = Math.random();
      if (stage >= 5 && metricChance < 0.4)
        return { text: METRIC_LABELS[Math.floor(Math.random() * METRIC_LABELS.length)], amber: true, isHero: false };

      // Process phrase by stage
      let pool: string[];
      if (stage <= 2)       pool = PROCESS_EARLY;
      else if (stage === 3) pool = PROCESS_SCAN;
      else if (stage === 4) pool = PROCESS_FILTER;
      else if (stage === 5) pool = PROCESS_METRIC;
      else if (stage === 6) pool = PROCESS_SCORE;
      else                  pool = PROCESS_COMPILE;

      const text = pool[Math.floor(Math.random() * pool.length)];
      return { text, amber: false, isHero: false };
    };

    // ── Spawn a word/phrase reveal ─────────────────────────────────────────
    const spawnReveal = (s: typeof stateRef.current) => {
      if (!s) return;
      const { text, amber, isHero } = getContent();

      const maxCol = Math.max(2, s.cols - text.length - 4);
      let row: number, col: number;
      let attempts = 0;
      do {
        // Spread across full screen including top and bottom areas
        row = 1 + Math.floor(Math.random() * Math.max(1, s.rows - 3));
        col = Math.floor(Math.random() * maxCol);
        attempts++;
      } while (overlapsExisting(s, row, 1) && attempts < 6);

      s.reveals.push(makeReveal([text], row, col, 400, 1200, 400, amber, isHero));
    };

    // ── Spawn an ASCII shape (FIX 4) ──────────────────────────────────────
    const spawnShape = (s: typeof stateRef.current) => {
      if (!s) return;
      const shape = ASCII_SHAPES[s.shapeIndex % ASCII_SHAPES.length];
      s.shapeIndex++;
      const maxWidth = Math.max(...shape.map(l => l.length));
      // Center horizontally, random vertical position avoiding UI chrome
      const col = Math.max(2, Math.floor((s.cols - maxWidth) / 2) + Math.floor((Math.random() - 0.5) * (s.cols / 3)));
      let row: number;
      let attempts = 0;
      do {
        row = 3 + Math.floor(Math.random() * Math.max(1, s.rows - shape.length - 6));
        attempts++;
      } while (overlapsExisting(s, row, shape.length) && attempts < 8);

      s.reveals.push(makeReveal(shape, row, Math.max(0, col), 500, 1500, 500, false, true));
    };

    // ── Main animation loop ────────────────────────────────────────────────
    let raf: number;
    let lastFrame = 0;
    const FRAME_MS = 40; // 25fps

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (ts - lastFrame < FRAME_MS) return;
      const dt = Math.min(ts - lastFrame, 100);
      lastFrame = ts;

      const s = stateRef.current;
      if (!s) return;
      const t = ts / 800;

      // ── Wave update ──────────────────────────────────────────────────────
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
          const w1 = Math.sin(c * 0.28 + t * 1.8) * 0.5 + 0.5;
          const w2 = Math.sin(r * 0.22 - t * 1.1) * 0.5 + 0.5;
          const w3 = Math.sin((c * 0.12 + r * 0.18) + t * 0.9) * 0.5 + 0.5;
          s.wave[r * s.cols + c] = w1 * 0.40 + w2 * 0.35 + w3 * 0.25;
        }
      }

      // FIX 1: Background shuffle — noise only, lower probability
      for (let i = 0; i < s.cols * s.rows; i++) {
        const prob = (0.04 + s.wave[i] * 0.25) * (dt / 40);
        if (Math.random() < prob) s.grid[i] = rnoiseChar();
      }

      // ── Spawn reveals ────────────────────────────────────────────────────
      const now = performance.now();
      if (now - s.lastRevealMs > 900 + Math.random() * 600) {
        spawnReveal(s);
        s.lastRevealMs = now;
      }
      // Shape every 7-11s
      if (now - s.lastShapeMs > 7000 + Math.random() * 4000) {
        spawnShape(s);
        s.lastShapeMs = now;
      }
      // Expire finished reveals
      s.reveals = s.reveals.filter(rv => {
        const total = rv.materializeMs + rv.holdMs + rv.dissolveMs;
        return (now - rv.startMs) < total;
      });

      // ── Build cell override map from reveals ──────────────────────────────
      // cell index → { targetChar, drawScramble, alpha, amber }
      const overrideMap = new Map<number, { targetChar: string; scramble: boolean; alpha: number; amber: boolean }>();

      for (const rv of s.reveals) {
        const elapsed = now - rv.startMs;
        const total = rv.materializeMs + rv.holdMs + rv.dissolveMs;
        if (elapsed >= total) continue;

        // Phase
        let dissolveAlpha = 1.0;
        if (elapsed > rv.materializeMs + rv.holdMs) {
          // Dissolve phase: simple fade out
          const dElapsed = elapsed - rv.materializeMs - rv.holdMs;
          dissolveAlpha = Math.max(0, 1 - dElapsed / rv.dissolveMs);
        }

        for (const { li, ci, ch, lockMs } of rv.chars) {
          const r = rv.row + li;
          const c = rv.col + ci;
          if (r < 0 || r >= s.rows || c < 0 || c >= s.cols) continue;
          const idx = r * s.cols + c;

          let scramble = false;
          if (elapsed < rv.materializeMs) {
            // Materialize: locked = elapsed >= lockMs
            scramble = elapsed < lockMs;
          }
          overrideMap.set(idx, { targetChar: ch, scramble, alpha: dissolveAlpha, amber: rv.amber });
        }
      }

      // ── Render ────────────────────────────────────────────────────────────
      const W = s.cols * CW;
      const H = s.rows * CH;

      ctx.fillStyle = '#F2EEE8';
      ctx.fillRect(0, 0, W, H);

      // Pass 1 — FIX 1: Background noise at very low opacity
      ctx.font = `${NOISE_PX}px "IBM Plex Mono","Courier New",monospace`;
      for (let r = 0; r < s.rows; r++) {
        const y = r * CH + 2; // slight vertical offset for smaller font
        for (let c = 0; c < s.cols; c++) {
          const idx = r * s.cols + c;
          if (overrideMap.has(idx)) continue; // will be drawn in pass 2
          // FIX 1: Noise chars — barely visible, no amber activation
          const opacity = 0.08 + s.wave[idx] * 0.09; // 8-17% max
          ctx.fillStyle = `rgba(180,170,160,${opacity})`;
          ctx.fillText(s.grid[idx], c * CW, y);
        }
      }

      // Pass 2 — FIX 1 + 2: Reveal chars at full opacity, larger font, with decode effect
      ctx.font = `bold ${REVEAL_PX}px "IBM Plex Mono","Courier New",monospace`;
      overrideMap.forEach((override, idx) => {
        const r = Math.floor(idx / s.cols);
        const c = idx % s.cols;
        const x = c * CW;
        const y = r * CH + 0.5;

        if (override.scramble) {
          // FIX 2: Decode effect — scramble char at medium opacity
          ctx.fillStyle = `rgba(120,100,80,${0.5 * override.alpha})`;
          ctx.fillText(rscramble(), x, y);
        } else if (override.amber) {
          // FIX 1: Amber content — full opacity amber
          ctx.fillStyle = `rgba(184,120,10,${0.95 * override.alpha})`;
          ctx.fillText(override.targetChar, x, y);
        } else {
          // FIX 1: Dark content — near-black full opacity
          ctx.fillStyle = `rgba(28,25,23,${0.92 * override.alpha})`;
          ctx.fillText(override.targetChar, x, y);
        }
      });
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setup);
    };
  }, [query, stage, reviewCount, filteredCount, flickerScore, showComplete]); // eslint-disable-line react-hooks/exhaustive-deps
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
