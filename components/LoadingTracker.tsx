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

// ─── IMAGE-TO-ASCII BRIGHTNESS SYSTEM ────────────────────────────────────────
// Map brightness value 0-9 → character. 0=space (transparent), 9=densest.
const RAMP = ' .:-=+*#%@';
const NOISE_CHARS    = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz0123456789:.-+=/|';
const SCRAMBLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#@%&*+=<>';

// ─── FOOD BRIGHTNESS GRIDS (20 wide × rows tall, digits 0-9) ─────────────────
// 0 = space (skip), 1-9 → RAMP[n] character. Rendered with IBM Plex Mono.
const SHAPE_TACO = [
  "00001234567765432100",
  "00123467899986431000",
  "01234578999997543200",
  "01234578999997543200",
  "01234578976897543200",
  "00123467899986431000",
  "00001234567765432100",
];
const SHAPE_RAMEN = [
  "00001100011000110000",  // steam puffs
  "00000000000000000000",
  "00012345667654321000",
  "00123467889987432000",
  "01234578999987543100",
  "01234578969987543100",  // noodle surface
  "01234578999987543100",
  "00123467889987432000",
  "00012345667654321000",
];
const SHAPE_BURGER = [
  "00013578998985310000",
  "00134679999997643100",
  "01345678999976543200",
  "01333343444343332100",  // lettuce
  "00234556789765543000",  // patty
  "01345678999976543200",
  "00134679999997643100",
  "00013578998985310000",
];
const SHAPE_PIZZA = [
  "01234567899876543210",
  "00123456788876543100",
  "00012345678876540000",
  "00001234567765430000",
  "00000123456654320000",
  "00000012345543210000",
  "00000001234432100000",
  "00000000123321000000",
  "00000000012210000000",
  "00000000001100000000",
];
const ALL_SHAPES = [SHAPE_TACO, SHAPE_RAMEN, SHAPE_BURGER, SHAPE_PIZZA];

// Pre-compute non-zero chars for each shape for fast rendering
type ShapeCell = { r: number; c: number; ch: string };
function buildShapeCells(grid: string[]): ShapeCell[] {
  const cells: ShapeCell[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const v = parseInt(grid[r][c], 10);
      if (v > 0) cells.push({ r, c, ch: RAMP[v] });
    }
  }
  return cells;
}
const SHAPE_CELLS = ALL_SHAPES.map(buildShapeCells);

// ─── CONTENT POOLS ────────────────────────────────────────────────────────────
const DISH_POOL = [
  'CARNE ASADA', 'AL PASTOR', 'BIRRIA', 'MOLE', 'OMAKASE',
  'NIGIRI', 'TONKOTSU', 'CARBONARA', 'BRISKET', 'CEVICHE',
  'PHO', 'PAD THAI', 'GYOZA', 'KIMCHI', 'RAMEN', 'BANH MI',
  'WAGYU', 'KARAAGE', 'SHAKSHUKA', 'CHILAQUILES',
];
const METRIC_NAMES = ['FLAVOR', 'TECHNIQUE', 'FRESHNESS', 'CONSISTENCY', 'TEXTURE', 'VALUE'];
const PHRASES_SCAN    = ['SCANNING REVIEWS', 'FILTERING SIGNALS', 'COLLECTING DATA', 'SOURCES FOUND'];
const PHRASES_ANALYZE = ['CROSS-REFERENCING DISH MENTIONS', 'WEIGHTING SIGNAL STRENGTH', 'RANKING BY FOOD QUALITY'];
const PHRASES_COMPILE = ['COMPILING REPORT', 'FINALIZING', 'RANKING DISHES', 'BUILDING YOUR REPORT'];

function rnoiseChar(): string { return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]; }
function rscramble():  string { return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]; }

// ─── CANVAS ANIMATION HOOK ────────────────────────────────────────────────────
type Floater = {
  text: string;
  gridRow: number;
  gridCol: number;
  amber: boolean;
  born: number;
  matMs: number;   // materialize
  holdMs: number;
  disMs: number;   // dissolve
  // Pre-computed decode sequence: index in text → lock time within matMs
  lockMs: number[];
};

function useCharGrid(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  query: string,
  progress: number,
  reviewCount: number,
  filteredCount: number,
  flickerScore: number,
  showComplete: boolean,
) {
  // Refs for values that change without needing canvas restart
  const progressRef      = useRef(progress);
  const reviewCountRef   = useRef(reviewCount);
  const filteredCountRef = useRef(filteredCount);
  const flickerScoreRef  = useRef(flickerScore);
  const showCompleteRef  = useRef(showComplete);
  useEffect(() => {
    progressRef.current      = progress;
    reviewCountRef.current   = reviewCount;
    filteredCountRef.current = filteredCount;
    flickerScoreRef.current  = flickerScore;
    showCompleteRef.current  = showComplete;
  }); // runs every render, no restart
  const stateRef = useRef<{
    cols: number; rows: number; cw: number; ch: number;
    grid: string[];               // noise field
    wave: Float32Array;
    floaters: Floater[];
    lastFloaterMs: number;
    hero: { cells: ShapeCell[]; shapeIdx: number; gridRow: number; gridCol: number; born: number; matMs: number; holdMs: number; disMs: number; permanent: boolean } | null;
    lastHeroMs: number;
    heroCount: number;            // shapes spawned so far
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const NOISE_PX  = 10;  // dim noise layer
    const FLOAT_PX  = 13;  // floating text layer (bold)
    const SHAPE_PX  = 11;  // hero ASCII shape layer
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
        floaters: [],
        lastFloaterMs: 0,
        hero: null,
        lastHeroMs: 0,
        heroCount: 0,
      };
    };

    setup();
    window.addEventListener('resize', setup);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const makeFloater = (text: string, row: number, col: number, amber: boolean,
      matMs: number, holdMs: number, disMs: number): Floater => {
      const lockMs = Array.from({ length: text.length }, (_, i) =>
        text[i] === ' ' ? 0 : (i / Math.max(1, text.length - 1)) * matMs * 0.8
      );
      return { text, gridRow: row, gridCol: col, amber, born: performance.now(),
        matMs, holdMs, disMs, lockMs };
    };

    const rowBusy = (s: NonNullable<typeof stateRef.current>, row: number): boolean =>
      s.floaters.some(f => {
        const age = performance.now() - f.born;
        return age < f.matMs + f.holdMs + f.disMs && Math.abs(f.gridRow - row) < 2;
      });

    // ── Narrative arc content selection ──────────────────────────────────────
    let spawnSeq = 0;
    const getFloaterContent = (): { text: string; amber: boolean } => {
      spawnSeq++;
      const prog = progressRef.current;
      const rc   = reviewCountRef.current;
      const fc   = filteredCountRef.current;
      const sc   = flickerScoreRef.current;

      // Query always shows early and periodically
      if (query && (spawnSeq === 1 || spawnSeq % 7 === 0))
        return { text: query.toUpperCase().slice(0, 24), amber: true };

      if (prog < 40) {
        // SCANNING: dish names + query + scan phrases
        if (rc > 0 && spawnSeq % 4 === 0)
          return { text: `SCANNING ${rc} REVIEWS`, amber: true };
        const r = Math.random();
        if (r < 0.45) return { text: DISH_POOL[Math.floor(Math.random() * DISH_POOL.length)], amber: false };
        return { text: PHRASES_SCAN[Math.floor(Math.random() * PHRASES_SCAN.length)], amber: r < 0.65 };
      }
      if (prog < 75) {
        // ANALYZING: metrics + cross-referencing
        if (fc > 0 && spawnSeq % 3 === 0)
          return { text: `FILTERED ${fc} SIGNALS`, amber: true };
        if (sc > 0 && spawnSeq % 5 === 0)
          return { text: `ANALYZING SCORE ${sc.toFixed(1)}`, amber: true };
        const r = Math.random();
        if (r < 0.45) {
          const name = METRIC_NAMES[Math.floor(Math.random() * METRIC_NAMES.length)];
          const val  = 75 + Math.floor(Math.random() * 25);
          return { text: `${name} ${val}`, amber: true };
        }
        if (r < 0.65) return { text: DISH_POOL[Math.floor(Math.random() * DISH_POOL.length)], amber: false };
        return { text: PHRASES_ANALYZE[Math.floor(Math.random() * PHRASES_ANALYZE.length)], amber: false };
      }
      // DECIDING (75-99%): compilation phrases only
      return { text: PHRASES_COMPILE[Math.floor(Math.random() * PHRASES_COMPILE.length)], amber: Math.random() < 0.4 };
    };

    // ── Spawn floater ─────────────────────────────────────────────────────────
    const spawnFloater = (s: NonNullable<typeof stateRef.current>) => {
      const { text, amber } = getFloaterContent();
      const prog = progressRef.current;
      // Timing by phase
      const matMs  = 380;
      const holdMs = prog < 40 ? 900 : prog < 75 ? 1400 : 2000;
      const disMs  = 380;
      const maxCol = Math.max(2, s.cols - text.length - 4);
      let row = 0, col = 0, attempts = 0;
      do {
        row = 2 + Math.floor(Math.random() * Math.max(1, s.rows - 5));
        col = Math.floor(Math.random() * maxCol);
        attempts++;
      } while (rowBusy(s, row) && attempts < 8);
      s.floaters.push(makeFloater(text, row, col, amber, matMs, holdMs, disMs));
    };

    // ── Spawn / update hero shape ─────────────────────────────────────────────
    const spawnHero = (s: NonNullable<typeof stateRef.current>) => {
      const prog = progressRef.current;
      const isWinner = showCompleteRef.current;
      const shapeIdx = s.heroCount % ALL_SHAPES.length;
      s.heroCount++;
      const cells   = SHAPE_CELLS[shapeIdx];
      const shRows  = ALL_SHAPES[shapeIdx].length;
      const shCols  = 20;
      // Center the shape
      const gridRow = Math.max(3, Math.floor((s.rows - shRows) / 2));
      const gridCol = Math.max(2, Math.floor((s.cols - shCols) / 2));
      const matMs   = isWinner ? 700 : prog < 40 ? 400 : prog < 75 ? 500 : 600;
      const holdMs  = isWinner ? 99999 : prog < 40 ? 1500 : prog < 75 ? 2500 : 4000;
      const disMs   = isWinner ? 0 : 500;
      s.hero = { cells, shapeIdx, gridRow, gridCol, born: performance.now(),
        matMs, holdMs, disMs, permanent: isWinner };
      s.lastHeroMs = performance.now();
    };

    // ── Main frame loop ───────────────────────────────────────────────────────
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
      const t   = ts / 800;
      const now = performance.now();
      const prog  = progressRef.current;
      const done  = showCompleteRef.current;

      // ── Wave (noise texture) ────────────────────────────────────────────────
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
          const w1 = Math.sin(c * 0.28 + t * 1.8) * 0.5 + 0.5;
          const w2 = Math.sin(r * 0.22 - t * 1.1) * 0.5 + 0.5;
          const w3 = Math.sin((c * 0.12 + r * 0.18) + t * 0.9) * 0.5 + 0.5;
          s.wave[r * s.cols + c] = w1 * 0.4 + w2 * 0.35 + w3 * 0.25;
        }
      }
      // Shuffle noise
      for (let i = 0; i < s.cols * s.rows; i++) {
        if (Math.random() < (0.04 + s.wave[i] * 0.22) * (dt / 38)) s.grid[i] = rnoiseChar();
      }

      // ── Narrative arc: manage floaters ─────────────────────────────────────
      // Target count depends on progress
      const maxFloaters = done ? 0 : prog < 40 ? 5 : prog < 75 ? 3 : 2;
      // Expire old floaters
      s.floaters = s.floaters.filter(f => (now - f.born) < f.matMs + f.holdMs + f.disMs);
      // Spawn interval: fast in scanning, slower in deciding
      const spawnInterval = prog < 40 ? 700 : prog < 75 ? 1000 : 1500;
      if (s.floaters.length < maxFloaters && now - s.lastFloaterMs > spawnInterval) {
        spawnFloater(s);
        s.lastFloaterMs = now;
      }

      // ── Narrative arc: manage hero shape ───────────────────────────────────
      const heroInterval = done ? 0 : prog < 40 ? 4000 : prog < 75 ? 6000 : 10000;
      const heroAlive = s.hero && (now - s.hero.born) < s.hero.matMs + s.hero.holdMs + s.hero.disMs;
      if (done && !heroAlive) {
        spawnHero(s); // winner — permanent shape
      } else if (!heroAlive && !done && heroInterval > 0 && now - s.lastHeroMs > heroInterval) {
        spawnHero(s);
      }

      // ── Render ─────────────────────────────────────────────────────────────
      const W = s.cols * CW;
      const H = s.rows * CH;
      ctx.fillStyle = '#F2EEE8';
      ctx.fillRect(0, 0, W, H);

      // Layer 1: NOISE (dim, full screen)
      // Progressively dim noise as we approach 100%
      const noiseScale = done ? 0 : Math.max(0, 1 - (prog - 75) / 25) * 1.0;
      if (noiseScale > 0) {
        ctx.font = `${NOISE_PX}px "IBM Plex Mono","Courier New",monospace`;
        for (let r = 0; r < s.rows; r++) {
          const y = r * CH + 2;
          for (let c = 0; c < s.cols; c++) {
            const idx = r * s.cols + c;
            const opacity = (0.07 + s.wave[idx] * 0.08) * noiseScale;
            ctx.fillStyle = `rgba(180,170,160,${opacity})`;
            ctx.fillText(s.grid[idx], c * CW, y);
          }
        }
      }

      // Layer 2: FLOATERS (text content, decode lifecycle)
      ctx.font = `bold ${FLOAT_PX}px "IBM Plex Mono","Courier New",monospace`;
      for (const f of s.floaters) {
        const elapsed = now - f.born;
        const total   = f.matMs + f.holdMs + f.disMs;
        if (elapsed >= total) continue;
        // Dissolve alpha
        let alpha = 1.0;
        if (elapsed > f.matMs + f.holdMs) {
          alpha = Math.max(0, 1 - (elapsed - f.matMs - f.holdMs) / f.disMs);
        }
        for (let ci = 0; ci < f.text.length; ci++) {
          const ch = f.text[ci];
          if (ch === ' ') continue;
          const x = (f.gridCol + ci) * CW;
          const y = f.gridRow * CH + 0.5;
          const locked = elapsed >= f.matMs || elapsed >= f.lockMs[ci];
          if (!locked) {
            ctx.fillStyle = `rgba(120,100,80,${0.45 * alpha})`;
            ctx.fillText(rscramble(), x, y);
          } else if (f.amber) {
            ctx.fillStyle = `rgba(184,120,10,${0.95 * alpha})`;
            ctx.fillText(ch, x, y);
          } else {
            ctx.fillStyle = `rgba(28,25,23,${0.90 * alpha})`;
            ctx.fillText(ch, x, y);
          }
        }
      }

      // Layer 3: HERO ASCII SHAPE (image-to-ASCII via brightness grid)
      if (s.hero) {
        const h       = s.hero;
        const elapsed = now - h.born;
        const total   = h.matMs + h.holdMs + h.disMs;
        if (elapsed < total || h.permanent) {
          let alpha = 1.0;
          if (!h.permanent && elapsed > h.matMs + h.holdMs) {
            alpha = Math.max(0, 1 - (elapsed - h.matMs - h.holdMs) / h.disMs);
          }
          const numCells = h.cells.length;
          ctx.font = `${SHAPE_PX}px "IBM Plex Mono","Courier New",monospace`;
          // If winner, draw amber glow (multiple offset passes)
          if (done) {
            const glowPasses = [{dx:-1,dy:0,a:0.15},{dx:1,dy:0,a:0.15},{dx:0,dy:-1,a:0.15},{dx:0,dy:1,a:0.15}];
            glowPasses.forEach(({ dx, dy, a }) => {
              ctx.fillStyle = `rgba(184,120,10,${a})`;
              h.cells.forEach(({ r, c, ch }) => {
                ctx.fillText(ch, (h.gridCol + c) * CW + dx, (h.gridRow + r) * CH + 0.5 + dy);
              });
            });
          }
          // Draw shape cells with decode cascade (left-to-right, top-to-bottom)
          h.cells.forEach(({ r, c, ch }, i) => {
            const lockMs = numCells > 1 ? (i / (numCells - 1)) * h.matMs * 0.85 : 0;
            const locked = elapsed >= h.matMs || elapsed >= lockMs;
            const x = (h.gridCol + c) * CW;
            const y = (h.gridRow + r) * CH + 0.5;
            if (!locked) {
              ctx.fillStyle = `rgba(120,100,80,${0.4 * alpha})`;
              ctx.fillText(rscramble(), x, y);
            } else if (done) {
              ctx.fillStyle = `rgba(184,120,10,${alpha})`;
              ctx.fillText(ch, x, y);
            } else {
              ctx.fillStyle = `rgba(28,25,23,${0.88 * alpha})`;
              ctx.fillText(ch, x, y);
            }
          });
          // REPORT COMPLETE text below shape at winner state
          if (done) {
            const shRows = ALL_SHAPES[h.shapeIdx].length;
            const textY  = (h.gridRow + shRows + 1) * CH;
            const textX  = h.gridCol * CW;
            ctx.font = `bold ${FLOAT_PX}px "IBM Plex Mono","Courier New",monospace`;
            ctx.fillStyle = 'rgba(184,120,10,0.95)';
            ctx.fillText('REPORT COMPLETE', textX, textY);
          }
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setup);
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
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
  useCharGrid(canvasRef, query, progress, reviewCount, filteredCount, flickerScore, showComplete);

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
