'use client';
import { useRouter } from "next/navigation";

const MONO = "'IBM Plex Mono','Courier New',monospace";
const SANS = "'Inter',-apple-system,sans-serif";

const SECTIONS = [
  {
    id: "goal",
    num: "01",
    title: "THE GOAL",
    bullets: [
      "Cut through review noise — surface only the food signal.",
      "Most platforms blur food quality with parking, service mood, ambiance, and hype. Dish Report strips all of that.",
      "Result: the dishes worth ordering and the spots worth your time.",
    ],
  },
  {
    id: "signal",
    num: "02",
    title: "HOW WE FOCUS ON SIGNAL",
    bullets: [
      "Analyze large volumes of review text.",
      "Filter out noise: parking, wait times, decor, hype not backed by specifics.",
      "Weight consistency over one-off extremes — one great visit and one disaster don't average.",
      "Trust specifics over superlatives: detailed dish commentary counts; vague superlatives don't.",
    ],
  },
  {
    id: "scores",
    num: "03",
    title: "WHAT THE SCORE MEANS",
    bullets: [
      "Deliberately harsh. Average isn't impressive — a middling place earns a middling score.",
      "High scores are rare and earned. A system where everything is 'great' is useless.",
      "A high Dish Report score actually means something.",
      "The number is food quality only — not vibe, not service, not popularity.",
    ],
  },
  {
    id: "trust",
    num: "04",
    title: "HONESTY",
    bullets: [
      "Grounded in real review signal. We don't invent restaurants, dishes, or praise.",
      "Thin or conflicting evidence = lower confidence, or no result at all.",
      "No paid placements. No sponsored rankings. The score is the score.",
    ],
  },
];

export default function AboutPage() {
  const router = useRouter();

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
        <div style={{ fontFamily: MONO, fontSize: "0.85rem", fontWeight: 700, color: "#2f4f49", letterSpacing: "0.14em" }}>ABOUT</div>
      </div>

      {/* Hero — compact */}
      <div style={{ background: "#10211e", padding: "28px 20px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "#5f857d", letterSpacing: "0.26em", marginBottom: 10 }}>
          FOOD INTELLIGENCE TERMINAL
        </div>
        <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(1.35rem,4.5vw,1.75rem)", fontWeight: 700, color: "#f0f4f1", lineHeight: 1.2, maxWidth: 440, margin: "0 auto" }}>
          Food intelligence that actually means something.
        </div>
      </div>

      {/* Sections — dark cards, tight bullet layout */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 52px", display: "flex", flexDirection: "column", gap: 12 }}>
        {SECTIONS.map(s => (
          <div key={s.id} style={{ background: "#10211e", border: "1px solid #2c4a44", borderRadius: 10, overflow: "hidden" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #2c4a44" }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#5f857d", letterSpacing: "0.18em" }}>{s.num}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.7rem", fontWeight: 700, color: "#9fe3c8", letterSpacing: "0.10em", textTransform: "uppercase" }}>{s.title}</span>
            </div>
            {/* Bullets */}
            <ul style={{ margin: 0, padding: "12px 16px 14px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
              {s.bullets.map((b, j) => (
                <li key={j} style={{ fontFamily: SANS, fontSize: "0.875rem", color: "#d4e4df", lineHeight: 1.55 }}>{b}</li>
              ))}
            </ul>
          </div>
        ))}

        {/* Help link */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <button
            onClick={() => router.push("/help")}
            style={{
              background: "none", border: "1px solid #2c4a44", borderRadius: 20,
              padding: "6px 18px", fontFamily: MONO, fontSize: 10,
              letterSpacing: "0.12em", color: "#7fe3c8", cursor: "pointer",
              textTransform: "uppercase", transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1b332e"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >Report an issue →</button>
        </div>
      </div>
    </div>
  );
}
