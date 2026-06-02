'use client';
import { useRouter } from "next/navigation";

const MONO = "'IBM Plex Mono','Courier New',monospace";
const SERIF = "'Playfair Display',Georgia,serif";
const SANS = "'Inter',-apple-system,sans-serif";

type Section = { id: string; title: string; body: string[] };

const SECTIONS: Section[] = [
  {
    id: "goal",
    title: "THE GOAL",
    body: [
      "Dish Report cuts through review noise to surface what matters — the food.",
      "Most platforms blend food quality with parking complaints, service moods, ambiance notes, off-days, and influencer hype. The result is a score that tells you almost nothing about whether a place is worth eating at.",
      "Dish Report isolates the food-quality signal. We tell you the dishes worth ordering and the spots worth your time — nothing else.",
    ],
  },
  {
    id: "signal",
    title: "HOW WE FOCUS ON SIGNAL",
    body: [
      "We analyze large volumes of review text and filter out noise — parking, wait times, decor, and raves or pans that say nothing about the food itself.",
      "We weight consistency over one-off extremes. One exceptional visit and one disaster don't average out to a recommendation. We look for what reviewers repeatedly and credibly say about specific dishes at a specific location.",
      "We discount hype not backed by specifics. \"Best tacos I've ever had!\" with no dish detail contributes nothing. \"The carnitas melt — rendered low and slow, properly crisped\" contributes a lot.",
      "We look for patterns across independent voices, not volume of praise.",
    ],
  },
  {
    id: "scores",
    title: "WHAT THE SCORE MEANS — AND WHY WE'RE CRITICAL",
    body: [
      "Our scores are deliberately harsh. A genuinely average place earns a middling score, not a generous one. High scores are rare and earned.",
      "We do this on purpose. A system where everything rates \"great\" is useless — you can't use it to decide anything. Being critical and honest is what makes a high Dish Report score mean something.",
      "When we rate a place highly, it means something. When we rate it middling, that's honest. We'd rather under-praise than send you to a mediocre meal.",
      "The number shown is a food-quality score, period. It is not a vibe score, a service score, or a popularity score.",
    ],
  },
  {
    id: "trust",
    title: "HONESTY & TRUST",
    body: [
      "Every claim we surface is grounded in real review signal. We aim never to invent restaurants, dishes, quotes, or praise.",
      "When evidence is thin or conflicting, we say so — or we don't surface that result at all. A smaller set of confident results beats a padded list of shaky ones.",
      "We don't accept paid placements or sponsored rankings. The score is the score.",
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
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
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

      {/* Hero */}
      <div style={{ background: "#10211e", padding: "40px 20px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "#5f857d", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 14 }}>
          DISH REPORT · FOOD INTELLIGENCE TERMINAL
        </div>
        <div style={{ fontFamily: SERIF, fontSize: "clamp(1.6rem,5vw,2.2rem)", fontWeight: 700, color: "#f0f4f1", lineHeight: 1.2, marginBottom: 12, maxWidth: 520, margin: "0 auto 12px" }}>
          Food intelligence that actually means something.
        </div>
        <div style={{ fontFamily: SANS, fontSize: "0.95rem", color: "#8aa9a2", lineHeight: 1.65, maxWidth: 460, margin: "0 auto" }}>
          We analyze reviews at scale to extract the signal that matters — the food — and filter out everything that doesn't.
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 64px" }}>
        {SECTIONS.map((section, idx) => (
          <div key={section.id} style={{ marginTop: 32 }}>
            {/* Dark card */}
            <div style={{
              background: "#10211e", border: "1px solid #2c4a44",
              borderRadius: 12, overflow: "hidden",
            }}>
              {/* Section header */}
              <div style={{
                padding: "14px 20px",
                borderBottom: "1px solid #2c4a44",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  fontFamily: MONO, fontSize: "0.65rem", fontWeight: 700,
                  color: "#5f857d", letterSpacing: "0.20em", textTransform: "uppercase",
                }}>
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700,
                  color: "#9fe3c8", letterSpacing: "0.10em", textTransform: "uppercase",
                }}>
                  {section.title}
                </div>
              </div>
              {/* Section body */}
              <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {section.body.map((para, j) => (
                  <p key={j} style={{
                    fontFamily: SANS, fontSize: "0.9375rem", color: "#d4e4df",
                    lineHeight: 1.7, margin: 0,
                  }}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div style={{
          marginTop: 40, padding: "16px 20px",
          background: "#1b332e", border: "1px solid #2c4a44",
          borderRadius: 8, textAlign: "center",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#5f857d", letterSpacing: "0.18em", marginBottom: 6 }}>
            QUESTIONS OR ISSUES?
          </div>
          <button
            onClick={() => router.push("/help")}
            style={{
              background: "#3d6b62", border: "1px solid #4d8377", borderRadius: 20,
              padding: "6px 18px", fontFamily: MONO, fontSize: 10,
              letterSpacing: "0.12em", color: "#eafaf4", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#4d8377"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#3d6b62"; }}
          >SUBMIT A REPORT →</button>
        </div>
      </div>
    </div>
  );
}
