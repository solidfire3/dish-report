'use client';
import { useState, useEffect, useRef, type ReactNode } from "react";
import type {
  DeepDiveData, CompareData, MarketData, Alternative, Vendor,
  AddToListTarget, AlsoTry,
} from "@/lib/types";
import { gURL, dirURL } from "@/lib/dish-shared";
import { ScoreRing, PriceTag, VenueBadge, PlacesPhotoStrip } from "@/components/RestaurantCard";

// ─── THEME — Lumon palette (dark teal surfaces always) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function th(_dark: boolean) {
  return {
    bg:           "#e8ece8",    // bone page
    card:         "#10211e",    // dark teal card
    card2:        "#1b332e",    // lifted surface
    border:       "#2c4a44",    // box border
    border2:      "#3d5c55",
    text:         "#f0f4f1",    // primary on dark
    secondary:    "#d4e4df",    // body on dark
    tertiary:     "#8aa9a2",    // muted
    disabled:     "#5f7a74",
    accent:       "#7fe3c8",    // bright teal
    accentHover:  "#5ccfb0",
    accentLight:  "#1b332e",
    accentBorder: "#2c4a44",
    blue:         "#7fe3c8",    // info → teal
    blueBg:       "rgba(127,227,200,0.08)",
    blueBorder:   "#2c4a44",
    green:        "#3fd98a",    // vivid score green
    greenBg:      "rgba(63,217,138,0.08)",
    greenBorder:  "rgba(63,217,138,0.25)",
    red:          "#d64545",
    s1: "0 2px 8px rgba(0,0,0,.35),0 1px 3px rgba(0,0,0,.25)",
    s2: "0 4px 16px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.28)",
    s3: "0 8px 28px rgba(0,0,0,.55),0 4px 10px rgba(0,0,0,.32)",
  };
}

// Vivid tier colors on dark #10211e background
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scoreColor(score: number, _dark: boolean): string {
  if (score >= 9) return "#3fd98a";
  if (score >= 8) return "#7bc24a";
  if (score >= 7) return "#e8b133";
  if (score >= 6) return "#e07b3a";
  return "#d64545";
}

function scoreTierLabel(score: number): string {
  if (score >= 9.2) return "Local legend";
  if (score >= 8.7) return "Local legend";
  if (score >= 8.1) return "Always great";
  if (score >= 7.5) return "Solid spot";
  if (score >= 6.9) return "Hit & miss";
  if (score >= 6.0) return "Convenience";
  if (score >= 5.0) return "Compromise";
  return "Below avg";
}

const stripEmoji = (s: string) =>
  // Remove common emoji ranges without Unicode property escapes (ES5 compat)
  s.replace(/[\uD800-\uDFFF]|[⌀-⏿]|[☀-➿]|[︀-️]/g, "").trim();

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = (d: ReactNode, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const BackIcon    = () => I(<polyline points="15 18 9 12 15 6" />);
const XIcon       = () => I(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, 20);
const ArrowLeft   = () => I(<polyline points="15 18 9 12 15 6" />, 20);
const ArrowRight  = () => I(<polyline points="9 18 15 12 9 6" />, 20);
const HeartIcon   = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const ShareIcon   = () => I(<><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></>, 16);
const DirIcon     = () => I(<><line x1="5" y1="19" x2="19" y2="5"/><path d="M9 5h10v10"/></>, 16);
const PlusIcon    = () => I(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, 16);

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const touchX = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  setIdx(c => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setIdx(c => Math.min(urls.length - 1, c + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [urls.length, onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const d = e.changedTouches[0].clientX - touchX.current;
        if (d > 50) setIdx(c => Math.max(0, c - 1));
        if (d < -50) setIdx(c => Math.min(urls.length - 1, c + 1));
      }}
    >
      <img src={urls[idx]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><XIcon /></button>
      {idx > 0 && <button onClick={() => setIdx(c => c - 1)} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft /></button>}
      {idx < urls.length - 1 && <button onClick={() => setIdx(c => c + 1)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowRight /></button>}
      {urls.length > 1 && (
        <div style={{ position: "absolute", bottom: 24, display: "flex", gap: 6, alignItems: "center" }}>
          {urls.map((_, i) => <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 24 : 6, height: 6, borderRadius: 3, background: i === idx ? "#fff" : "rgba(255,255,255,0.35)", transition: "all 0.2s", cursor: "pointer" }} />)}
        </div>
      )}
    </div>
  );
}

// ─── DEEP DIVE RESULT ────────────────────────────────────────────────────────
type DeepDiveResultProps = {
  data: DeepDiveData; city: string; isFav: boolean; onFav: () => void;
  onCompare: (radius: number, data: DeepDiveData, mode: string) => void;
  onMarket?: (name: string) => void;
  onAddToList?: (target: AddToListTarget) => void;
  onBack?: () => void;
  searchQuery?: string;
  isMarket?: boolean;  // explicit signal from the confirm step (is_market from deepdive API)
};

export function DeepDiveResult({ data, city, isFav, onFav, onCompare, onMarket, onAddToList, onBack, searchQuery, isMarket }: DeepDiveResultProps) {
  const [dark, setDark] = useState(false);
  const [photoRefs, setPhotoRefs] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showSticky, setShowSticky] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDark(localStorage.getItem("dr-dark") === "1"); }, []);

  useEffect(() => {
    if (!data.name) return;
    fetch(`/api/photos?name=${encodeURIComponent(data.name)}&city=${encodeURIComponent(city || "")}`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setPhotoRefs(d.photos); }) // all available
      .catch(() => {});
  }, [data.name, city]);

  // Sticky header appears after scrolling past identity block
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  const t        = th(dark);
  const photoUrls = photoRefs.map(ref => `/api/photo?name=${encodeURIComponent(ref)}`);
  const mos      = (Array.isArray(data.must_orders) ? data.must_orders : []).filter(m => m != null);
  const also     = (Array.isArray(data.also_try)    ? data.also_try    : []).filter(a => a != null);
  const skip     = (Array.isArray(data.skip)        ? data.skip        : []).filter(s => s != null);
  const tips     = (Array.isArray(data.insider_tips) ? data.insider_tips : []).filter(t => t != null);
  const vibes    = (Array.isArray(data.vibe_tags)   ? data.vibe_tags   : []);

  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = () => {
    // Generate a deep link that opens this restaurant's deep dive when followed
    const p = new URLSearchParams({ deepDive: data.name });
    if (city) p.set("city", city);
    const url = `${window.location.origin}/?${p.toString()}`;
    const text = `${data.name}${city ? ` in ${city}` : ""} — food intelligence from Dish Report`;
    if (navigator.share) {
      navigator.share({ title: data.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2200);
      }).catch(() => {});
    }
  };

  // Food-hall detection: explicit signal from confirm step OR venue_type from deep-dive analysis.
  // Graceful fallback: if neither fires, treat as normal restaurant (no vendor list shown).
  const isFoodHall = !!(isMarket || data.venue_type?.toLowerCase().match(/\bfood hall\b|\bfood court\b|\bmarket\b|\bhall\b|\bcourt\b/));

  const outlineBtn = (active = false): React.CSSProperties => ({
    height: 38, padding: "0 14px", borderRadius: 8, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 600,
    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
    background: active ? t.accentLight : "transparent",
    border: `1px solid ${active ? t.accentBorder : t.border2}`,
    color: active ? t.accent : t.text,
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  });

  const SL = (text: string, color?: string) => (
    <div style={{
      fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem", fontWeight: 700,
      color: color || "#23413b", textTransform: "uppercase",
      letterSpacing: "0.12em", marginBottom: 12,
    }}>{text}</div>
  );

  const Divider = () => <div style={{ height: 1, background: t.border, margin: "28px 0 0" }} />;

  return (
    <>
      <div style={{ background: t.bg, minHeight: "100vh", paddingBottom: 64 }}>

        {/* ── Hero photo strip — 16:9 aspect ratio, real photos only (up to 5) ── */}
        {(() => {
          const realPhotos = photoUrls.slice(0, 5);
          const initial = (data.name?.[0] || "?").toUpperCase();

          // No photos: single placeholder in 16:9 container
          if (realPhotos.length === 0) {
            return (
              <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#1b332e", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-orbitron),'Courier New',monospace", fontSize: "4rem", fontWeight: 900, color: "#7fe3c8", opacity: 0.35 }}>
                    {initial}
                  </span>
                </div>
              </div>
            );
          }

          return (
            // 16:9 aspect-ratio container via padding-top trick — ensures no fixed-height zoom distortion
            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", overflow: "hidden", background: "#2c4a44" }}>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex",
                overflowX: "auto", scrollbarWidth: "none" as const,
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
              }}>
                {realPhotos.map((url, idx) => (
                  <div key={idx} style={{
                    position: "relative", height: "100%", flexShrink: 0,
                    scrollSnapAlign: "start",
                    width: realPhotos.length === 1 ? "100%" : "88%",
                    minWidth: realPhotos.length === 1 ? "100%" : 260,
                  }}>
                    <img
                      src={url} alt=""
                      onClick={() => { setLightboxIdx(idx); setLightboxOpen(true); }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer", display: "block" }}
                    />
                    {idx === 0 && (
                      <div style={{ position: "absolute", bottom: 8, left: 10, background: "rgba(0,0,0,0.55)", padding: "3px 8px", borderRadius: 4 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#d4e4df", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                          ESTABLISHMENT
                        </span>
                      </div>
                    )}
                    {realPhotos.length > 1 && (
                      <div style={{ position: "absolute", bottom: 8, right: 10, background: "rgba(0,0,0,0.55)", padding: "3px 8px", borderRadius: 4 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#d4e4df", letterSpacing: "0.10em" }}>
                          {idx + 1}/{realPhotos.length}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
                background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.40))",
                pointerEvents: "none",
              }} />
            </div>
          );
        })()}

        {/* ── FIX 8: Breadcrumb ────────────────────────────────────────── */}
        {searchQuery && (
          <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={onBack}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontFamily: "'Inter', sans-serif", fontSize: "0.8125rem",
                color: t.accent, whiteSpace: "nowrap",
                textDecoration: "underline", textUnderlineOffset: "2px",
              }}
            >{searchQuery}</button>
            <span style={{ color: t.tertiary, fontSize: "0.8125rem" }}>›</span>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: "0.8125rem",
              color: t.tertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{data.name}</span>
          </div>
        )}

        {/* ── IDENTITY BANNER — dark teal, near-white text ── */}
        <div style={{ background: t.card, padding: "20px 16px" }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2.25rem", fontWeight: 700,
            color: t.text, lineHeight: 1.15, marginBottom: 10,
          }}>{data.name}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {data.neighborhood && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500, color: t.secondary }}>
                {data.neighborhood}
              </span>
            )}
            {data.neighborhood && data.venue_type && <span style={{ color: t.tertiary }}>·</span>}
            {data.venue_type && (
              <span style={{ fontFamily: "'CityLight', sans-serif", fontSize: "0.875rem", color: t.tertiary }}>
                {data.venue_type}
              </span>
            )}
            {data.price_range && <PriceTag price={data.price_range} dark={dark} />}
          </div>

          {/* Food-hall badge — only shown when isFoodHall is confirmed */}
          {isFoodHall && (
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.625rem", fontWeight: 700,
                background: "rgba(127,227,200,0.12)",
                border: "1px solid #7fe3c8",
                color: "#7fe3c8",
                padding: "5px 12px", borderRadius: 4,
                textTransform: "uppercase", letterSpacing: "0.14em",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: "0.55rem", opacity: 0.8 }}>◈</span>
                Food Hall / Market
              </span>
            </div>
          )}

          {/* FIX 2: Vibe tags — solid dark chips */}
          {vibes.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {vibes.slice(0, 4).map((v, i) => {
                const label = stripEmoji(v);
                if (!label) return null;
                return (
                  <span key={i} style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.625rem", fontWeight: 600,
                    background: "#1b332e",
                    border: "1px solid #2c4a44",
                    color: "#9fe3c8",
                    padding: "5px 11px", borderRadius: 4,
                    textTransform: "uppercase", letterSpacing: "0.12em",
                    whiteSpace: "nowrap", display: "inline-flex",
                  }}>{label}</span>
                );
              })}
            </div>
          )}

          {/* FIX 1 SECTION 4: Action buttons */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 20 }}>
            <button style={outlineBtn()}
              onClick={() => window.open(dirURL(data.address, data.name, city || ""), "_blank")}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border2; e.currentTarget.style.color = t.text; }}
            ><DirIcon />Directions</button>
            <button style={outlineBtn(isFav)} onClick={onFav}>
              <HeartIcon filled={isFav} />{isFav ? "Saved" : "Save"}
            </button>
            <button style={outlineBtn()} onClick={handleShare}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border2; e.currentTarget.style.color = t.text; }}
            ><ShareIcon />{shareCopied ? "Copied!" : "Share"}</button>
            {onAddToList && (
              <button style={outlineBtn()}
                onClick={() => onAddToList({ name: data.name, neighborhood: data.neighborhood, venue_type: data.venue_type, price_range: data.price_range, food_score: data.food_score, cuisine: data.cuisine })}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border2; e.currentTarget.style.color = t.text; }}
              ><PlusIcon />Add to list</button>
            )}
          </div>
        </div>

        {/* FIX 1 SECTION 5: Score block */}
        {(() => {
          const clr = scoreColor(data.food_score ?? 5, dark);
          return (
            <div style={{
              background: t.card, border: `2px solid ${t.accent}`,
              borderRadius: 10, margin: "16px 16px 0",
              padding: "24px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10,
            }}>
              <div style={{
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "4rem", fontWeight: 900, color: clr, lineHeight: 1,
              }}>{(data.food_score ?? 5).toFixed(1)}</div>
              <div style={{ width: 60, height: 2, background: clr, borderRadius: 1 }} />
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6875rem", color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.12em" }}>ANALYTICAL SCORE</div>

              {/* KNOWN FOR badges — prominently show must-order strengths */}
              {data.must_orders && data.must_orders.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  {(data.must_orders as Array<{item?: string}>).slice(0, 3).map((mo, idx) => mo?.item ? (
                    <span key={idx} style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.6rem", fontWeight: 700,
                      background: "#1b332e", border: "1px solid #2c4a44",
                      color: "#9fe3c8",
                      padding: "4px 10px", borderRadius: 20,
                      textTransform: "uppercase", letterSpacing: "0.10em",
                      whiteSpace: "nowrap",
                    }}>KNOWN FOR {mo.item}</span>
                  ) : null)}
                </div>
              )}

              {/* Confidence — de-emphasized: only show non-high confidence as small muted note */}
              {data.confidence && data.confidence !== "high" && (
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: "0.5rem", color: t.disabled, opacity: 0.7,
                  letterSpacing: "0.08em",
                }}>
                  {data.confidence === "medium"
                    ? "moderate signal"
                    : "limited signal"}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── QUICK READ — 3 fast-facts badges ──────────────────────────── */}
        {(() => {
          // Badge 1 — #1 DISH: top must-order item name
          const topDish = mos[0]?.item || null;

          // Badge 2 — TOP INSIGHT: first sentence of verdict, capped to ~55 chars
          const verdictRaw = (data.verdict ?? "").trim();
          const firstSentence = verdictRaw.split(/(?<=[.!?])\s+/)[0]?.trim() || verdictRaw;
          const topInsight = firstSentence.length > 58
            ? firstSentence.slice(0, 55).replace(/\s+\S*$/, "") + "..."
            : firstSentence || null;

          // Badge 3 — BEST ADVICE: first insider tip short enough to read at a glance
          const shortTip = tips.find((tip): tip is string =>
            typeof tip === "string" && tip.length >= 6 && tip.length <= 80
          ) || null;
          const bestAdvice = shortTip && shortTip.length > 58
            ? shortTip.slice(0, 55).replace(/\s+\S*$/, "") + "..."
            : shortTip;

          const badges = [
            topDish    ? { label: "#1 DISH",      value: topDish,    color: "#3fd98a" } : null,
            topInsight ? { label: "TOP INSIGHT",  value: topInsight, color: "#7fe3c8" } : null,
            bestAdvice ? { label: "BEST ADVICE",  value: bestAdvice, color: "#e8b133" } : null,
          ].filter(Boolean) as Array<{ label: string; value: string; color: string }>;

          if (badges.length === 0) return null;
          return (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 16px 0" }}>
              {badges.map(b => (
                <div key={b.label} style={{
                  background: "#0d1f1c",
                  border: "1px solid #2c4a44",
                  borderLeft: `3px solid ${b.color}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  flex: "1 1 140px",
                  minWidth: 130, maxWidth: "100%",
                }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: "0.5rem", fontWeight: 700,
                    color: b.color, letterSpacing: "0.18em",
                    textTransform: "uppercase", marginBottom: 5, opacity: 0.8,
                  }}>{b.label}</div>
                  <div style={{
                    fontFamily: "'Inter',sans-serif",
                    fontSize: "0.8rem", fontWeight: 500,
                    color: "#d4e4df", lineHeight: 1.4,
                  }}>{b.value}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Sentinel for sticky header */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        <div style={{ padding: "0 16px" }}>

          {/* THE DETAILS — info card */}
          {(data.hours || data.specials || data.experience_note || data.website_domain || data.address) && (
            <div style={{ paddingTop: 20, paddingBottom: 20 }}>
              {SL("The Details")}
              <div style={{
                background: t.card,
                borderLeft: "3px solid #7fe3c8",
                borderRadius: "0 8px 8px 0",
                padding: "4px 16px",
                boxShadow: t.s1,
              }}>
                {/* Address row */}
                {data.address && (
                  <div style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: `1px solid ${t.border}`,
                  }}>
                    <span style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.5, flexShrink: 0, minWidth: 64, paddingTop: 1 }}>ADDRESS</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.accent, lineHeight: 1.6, textDecoration: "underline", textUnderlineOffset: "2px" }}
                    >{data.address}</a>
                  </div>
                )}

                {/* Website row */}
                {data.website_domain && (
                  <div style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: `1px solid ${t.border}`,
                  }}>
                    <span style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.5, flexShrink: 0, minWidth: 64, paddingTop: 1 }}>WEBSITE</span>
                    <a
                      href={`https://${data.website_domain}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.accent, lineHeight: 1.6, textDecoration: "underline", textUnderlineOffset: "2px", wordBreak: "break-all" as const }}
                    >{data.website_domain}</a>
                  </div>
                )}

                {data.hours && (
                  <div style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: data.specials || data.experience_note ? `1px solid ${t.border}` : "none",
                  }}>
                    <span style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.5, flexShrink: 0, minWidth: 64, paddingTop: 1 }}>HOURS</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#d4e4df", lineHeight: 1.6 }}>{data.hours}</span>
                  </div>
                )}
                {data.specials && (
                  <div style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: data.experience_note ? `1px solid ${t.border}` : "none",
                  }}>
                    <span style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.5, flexShrink: 0, minWidth: 64, paddingTop: 1 }}>SPECIALS</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#d4e4df", lineHeight: 1.6 }}>{data.specials}</span>
                  </div>
                )}
                {data.experience_note && (
                  <div style={{ padding: "12px 0" }}>
                    <div style={{
                      padding: "10px 12px",
                      background: `${t.accent}10`,
                      borderLeft: `2px solid ${t.accent}`,
                      borderRadius: "0 6px 6px 0",
                    }}>
                      <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem", color: "#7fe3c8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Heads up</div>
                      <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.9375rem", color: t.secondary, lineHeight: 1.65 }}>{data.experience_note}</div>
                    </div>
                  </div>
                )}
              </div>
              <Divider />
            </div>
          )}

          {/* FIX 1+4: WHAT YOU'RE HERE FOR — must orders as cards */}
          {mos.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("What You're Here For", "#9fe3c8")}
              {mos.map((mo, j) => (
                <div key={j} style={{
                  background: t.card, border: `1px solid ${t.border}`,
                  borderRadius: 12, overflow: "hidden",
                  boxShadow: t.s1, marginBottom: 12,
                }}>
                  {/* Dish initial placeholder — intentional texture */}
                  <div style={{
                    height: 120,
                    background: `radial-gradient(circle, #2c4a44 1px, transparent 1px) #1b332e`,
                    backgroundSize: "16px 16px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                      fontSize: "3rem", fontWeight: 900, color: "#7fe3c8",
                      opacity: 0.85,
                    }}>{((mo?.item || "?")[0] || "?").toUpperCase()}</span>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "1.25rem", fontWeight: 700,
                      color: t.text, lineHeight: 1.2, marginBottom: 8,
                    }}>{mo?.item || ""}</div>
                    {mo?.why && (
                      <div style={{
                        fontFamily: "'DM Sans', 'Inter', sans-serif",
                        fontSize: "0.875rem", color: t.secondary, lineHeight: 1.6, marginBottom: 10,
                      }}>{mo.why}</div>
                    )}
                    <span style={{
                      fontFamily: "'Sevastopol', Georgia, serif",
                      fontSize: "0.5625rem", color: "#7fe3c8",
                      background: "#1b332e", border: "1px solid #2c4a44",
                      padding: "4px 10px", borderRadius: 20,
                      textTransform: "uppercase", letterSpacing: "0.12em",
                    }}>Must Order</span>
                  </div>
                </div>
              ))}
              <Divider />
            </div>
          )}

          {/* ALSO WORTH ORDERING — dark card wrapper matching Must Order / Insider Tips */}
          {also.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("Also Worth Ordering", "#9fe3c8")}
              <div style={{
                background: t.card, border: `1px solid ${t.border}`,
                borderRadius: 10, overflow: "hidden", boxShadow: t.s1,
              }}>
                {also.filter((a): a is NonNullable<AlsoTry> => a != null).map((a, j, arr) => {
                  const name = typeof a === "string" ? a : (a?.dish || "");
                  const note = typeof a === "object" ? a?.note : undefined;
                  if (!name) return null;
                  return (
                    <div key={j} style={{
                      padding: "12px 16px",
                      borderBottom: j < arr.length - 1 ? `1px solid ${t.border}` : "none",
                    }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: t.text, marginBottom: note ? 4 : 0 }}>{name}</div>
                      {note && <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, lineHeight: 1.55 }}>{note}</div>}
                    </div>
                  );
                })}
              </div>
              <Divider />
            </div>
          )}

          {/* FIX 5: INSIDER TIPS — amber tint rows with diamond */}
          {tips.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("Insider Tips //", "#9fe3c8")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tips.filter(tip => tip != null).map((tip, j) => (
                  <div key={j} style={{
                    background: "#1b332e",
                    borderRadius: 8, padding: "12px 14px",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <span style={{ color: "#7fe3c8", fontSize: "0.5rem", lineHeight: 2.2, flexShrink: 0 }}>◆</span>
                    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.875rem", color: "#d4e4df", lineHeight: 1.6 }}>{String(tip)}</div>
                  </div>
                ))}
              </div>
              <Divider />
            </div>
          )}

          {/* FIX 6: SKIP THESE — red cautionary treatment */}
          {skip.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem", fontWeight: 700,
                color: "#d64545", textTransform: "uppercase",
                letterSpacing: "0.12em", marginBottom: 12,
              }}>⚠ Skip These</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {skip.filter(s => s != null).map((s, j) => (
                  <div key={j} style={{
                    background: "#1b332e",
                    borderLeft: "3px solid #d64545",
                    borderRadius: "0 8px 8px 0",
                    padding: "10px 14px",
                  }}>
                    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.875rem", color: "#d4e4df" }}>{String(s)}</div>
                  </div>
                ))}
              </div>
              <Divider />
            </div>
          )}

          {/* FIX 7: THE BOTTOM LINE — dark authoritative card */}
          {data.verdict && (
            <div style={{ paddingTop: 28 }}>
              <div style={{
                background: t.card,
                borderRadius: 12, padding: 20, marginBottom: 8,
              }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: "0.72rem", fontWeight: 700, color: "#9fe3c8",
                    textTransform: "uppercase", letterSpacing: "0.10em",
                  }}>THE BOTTOM LINE</div>
                  <div style={{
                    fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                    fontSize: "1.75rem", fontWeight: 700,
                    color: scoreColor(data.food_score ?? 5, true), lineHeight: 1,
                  }}>{(data.food_score ?? 5).toFixed(1)}</div>
                </div>
                <div style={{ height: 1, background: t.border, marginBottom: 16 }} />
                <div style={{
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                  fontSize: "1rem", color: t.text, lineHeight: 1.75,
                }}>{data.verdict}</div>
              </div>
            </div>
          )}

          {/* ── Explore nearby ───────────────────────────────────────────── */}
          <div style={{ paddingTop: 28 }}>
            {SL("Explore Nearby")}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => onCompare(5, data, "similar")}
                style={{ flex: 1, height: 44, borderRadius: 8, background: t.blueBg, border: `1px solid ${t.blueBorder}`, color: t.blue, fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >Similar spots</button>
              <button
                onClick={() => onCompare(5, data, "any")}
                style={{ flex: 1, height: 44, borderRadius: 8, background: t.greenBg, border: `1px solid ${t.greenBorder}`, color: t.green, fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >Best food nearby</button>
            </div>
          </div>

          {isFoodHall && onMarket && (
            <div style={{ paddingTop: 16, paddingBottom: 8 }}>
              <button
                onClick={() => onMarket(data.name)}
                style={{ width: "100%", height: 48, borderRadius: 10, background: "transparent", border: `1px solid ${t.accent}`, color: t.accent, fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >See vendors inside →</button>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky header — sits below the main site header ─────────────── */}
      {showSticky && (
        <>
          <style>{`
            .dr-dd-sticky { top: 64px; }
            @media (max-width: 640px) { .dr-dd-sticky { top: 56px; } }
          `}</style>
          <div className="dr-dd-sticky" style={{
            position: "fixed", left: 0, right: 0, zIndex: 1000,
            height: 48,
            background: dark ? "#10211e" : "#10211e",
            borderBottom: `1px solid ${t.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
          }}>
            {/* Back arrow — 44×44 tap area */}
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: t.secondary, display: "flex", alignItems: "center",
                  justifyContent: "center", width: 44, height: 44, flexShrink: 0,
                  marginLeft: -10,
                }}
              ><BackIcon /></button>
            )}
            {/* Restaurant name — truncated */}
            <div style={{
              flex: 1, minWidth: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1rem", fontWeight: 600, color: t.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{data.name}</div>
            {/* Score — clean number in score color, 12px gap from name */}
            <div style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1.25rem", fontWeight: 700, color: scoreColor(data.food_score ?? 5, dark),
              flexShrink: 0, marginLeft: 4,
            }}>{(data.food_score ?? 5).toFixed(1)}</div>
            {/* Save icon */}
            <button
              onClick={onFav}
              aria-label={isFav ? "Unsave" : "Save"}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: isFav ? t.accent : t.secondary,
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 44, height: 44, flexShrink: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = isFav ? t.accent : t.secondary; }}
            ><HeartIcon filled={isFav} /></button>
          </div>
        </>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxOpen && photoUrls.length > 0 && (
        <Lightbox urls={photoUrls} startIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ─── VENDOR LIST (replaces scored market guide) ───────────────────────────────
// Per-vendor scoring removed — thin review data produces unreliable numbers.
// This shows who's inside and what they serve, honestly, with no rankings.
export function MarketGuideResult({ data }: { data: MarketData }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("dr-dark") === "1"); }, []);
  const t = th(dark);

  const vendors = (Array.isArray(data.vendors) ? data.vendors : []).filter((v): v is Vendor => v != null);

  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.625rem", fontWeight: 700,
            color: t.accent, textTransform: "uppercase", letterSpacing: "0.14em",
            background: "rgba(127,227,200,0.10)", border: `1px solid ${t.accentBorder}`,
            padding: "4px 10px", borderRadius: 4,
          }}>Food Hall · Vendors Inside</span>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 700, color: t.text, lineHeight: 1.15, marginBottom: 6 }}>{data.market_name}</div>
        {data.location && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, marginBottom: 4 }}>{data.location}</div>}
        {data.hours && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.text, marginBottom: 8 }}>
            <span style={{ color: t.tertiary, fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 6 }}>Hours</span>
            {data.hours}
          </div>
        )}
        {data.vibe && (
          <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, lineHeight: 1.6, padding: "10px 12px", background: t.card2, borderRadius: 8 }}>
            {data.vibe}
          </div>
        )}
      </div>

      {/* Vendor list — no scores, no rankings */}
      <div style={{ padding: "16px 16px 60px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.65rem", fontWeight: 700, color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} inside
        </div>
        {vendors.map((v, i) => (
          <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: t.s1 }}>
            {/* Vendor name + specialty */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: t.text, lineHeight: 1.2, marginBottom: 3 }}>{v.name || ""}</div>
              {v.specialty && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: t.tertiary }}>{v.specialty}</div>}
            </div>
            {/* What to get */}
            {(v.the_order || v.why) && (
              <div style={{ background: t.card2, borderRadius: 8, padding: "10px 12px", marginBottom: v.insider_note ? 8 : 0 }}>
                {v.the_order && (
                  <>
                    <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.5625rem", color: t.accent, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>Order this</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: t.text, marginBottom: v.why ? 4 : 0, lineHeight: 1.2 }}>{v.the_order}</div>
                  </>
                )}
                {v.why && <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.825rem", color: t.secondary, lineHeight: 1.55 }}>{v.why}</div>}
              </div>
            )}
            {v.insider_note && (
              <div style={{
                fontSize: "0.825rem", color: t.blue,
                background: t.blueBg, border: `1px solid ${t.blueBorder}`,
                borderRadius: 6, padding: "8px 10px",
                fontFamily: "'DM Sans', 'Inter', sans-serif", lineHeight: 1.5,
              }}>{v.insider_note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPARE RESULT ──────────────────────────────────────────────────────────
type CompareResultProps = {
  data: CompareData;
  originalScore?: number;
  onDeepDive: (name: string, city: string, score?: number) => void;
  city?: string;
  isFav?: (name: string) => boolean;
  onToggleFav?: (r: { name: string; neighborhood?: string; food_score?: number }) => void;
};

export function CompareResult({ data, originalScore, onDeepDive, city, isFav, onToggleFav }: CompareResultProps) {
  const [dark, setDark] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  useEffect(() => { setDark(localStorage.getItem("dr-dark") === "1"); }, []);
  const t = th(dark);

  const handleShare = (a: Alternative, i: number) => {
    if (!a.name) return;
    const p = new URLSearchParams({ deepDive: a.name });
    if (city) p.set("city", city);
    const url = `${window.location.origin}/?${p.toString()}`;
    if (navigator.share) {
      navigator.share({ title: a.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx(null), 2200);
      }).catch(() => {});
    }
  };

  const alts = (Array.isArray(data.alternatives) ? data.alternatives : []).filter((a): a is Alternative => a != null);
  const isAny = data._mode === "any";
  const accentClr    = isAny ? t.green    : t.blue;
  const accentBg     = isAny ? t.greenBg  : t.blueBg;
  const accentBorder = isAny ? t.greenBorder : t.blueBorder;

  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "24px 16px" }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color: accentClr, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
          {isAny ? "Best Food Nearby" : "Similar Spots"}
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: t.text, lineHeight: 1.15, marginBottom: 6 }}>
          {isAny ? "Best food near " : "Similar spots near "}
          <span style={{ color: accentClr }}>{data.original?.name}</span>
        </div>
        {data.search_area && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, marginBottom: 12 }}>{data.search_area}</div>}
        {/* Original score reference */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color: accentClr, textTransform: "uppercase", letterSpacing: "0.08em" }}>You're comparing</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", fontWeight: 700, color: t.text }}>{data.original?.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem", fontWeight: 700, color: scoreColor(originalScore ?? 0, dark) }}>{(originalScore ?? 0).toFixed(1)}</div>
        </div>
      </div>

      {/* Alternatives */}
      <div style={{ padding: "16px 16px 60px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
          {isAny ? "All cuisines — ranked by food quality" : "Same cuisine — ranked by food quality"}
        </div>
        {alts.map((a, i) => {
          const score = a.food_score ?? 5;
          const delta = a.food_score != null && originalScore != null ? a.food_score - originalScore : null;
          const deltaLabel = delta != null ? (delta > 0.2 ? `+${delta.toFixed(1)}` : delta < -0.2 ? delta.toFixed(1) : "similar") : null;
          const deltaColor = (delta ?? 0) > 0.2 ? t.green : (delta ?? 0) < -0.2 ? t.red : t.tertiary;

          const favd = isFav?.(a.name || "");
          return (
            <div key={i} style={{ background: t.card, border: `1px solid ${i === 0 ? accentBorder : t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: i === 0 ? t.s2 : t.s1 }}>
              {/* Photo strip — same height/treatment as normal result-card headers */}
              <PlacesPhotoStrip name={a.name} city={city} />

              <div style={{ padding: "12px 16px 14px" }}>
              {i === 0 && <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.5625rem", fontWeight: 400, color: accentClr, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Top alternative</div>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>{a.name || ""}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: t.secondary, marginBottom: 6 }}>{[a.neighborhood, a.cuisine].filter(Boolean).join(" · ")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {a.price_range && <PriceTag price={a.price_range} dark={dark} />}
                    {deltaLabel && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", fontWeight: 700, color: deltaColor }}>{deltaLabel}</span>}
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.75rem", fontWeight: 700, color: scoreColor(score, dark), lineHeight: 1, flexShrink: 0 }}>{score.toFixed(1)}</div>
              </div>

              {a.verdict_vs_original && (
                <div style={{ background: t.card2, borderRadius: 8, padding: "8px 10px", marginBottom: a.go_here_if || a.must_order ? 10 : 0 }}>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.5625rem", fontWeight: 400, color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>vs {data.original?.name}</div>
                  <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.825rem", color: t.text, lineHeight: 1.55 }}>{a.verdict_vs_original}</div>
                </div>
              )}

              {a.go_here_if && (
                <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.825rem", color: t.secondary, marginBottom: a.must_order ? 10 : 0, fontStyle: "italic" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontStyle: "normal", fontWeight: 600, color: t.tertiary, fontSize: "0.72rem", marginRight: 6 }}>Pick this if</span>
                  {a.go_here_if}
                </div>
              )}

              {a.must_order && (
                <div style={{ background: t.card2, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                  <div style={{ fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.5625rem", fontWeight: 400, color: t.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Order this</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: t.text, marginBottom: 3 }}>{a.must_order}</div>
                  {a.must_order_why && <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.8rem", color: t.secondary, lineHeight: 1.5 }}>{a.must_order_why}</div>}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onDeepDive(a.name ?? "", "", a.food_score)}
                  style={{ flex: 1, height: 38, borderRadius: 8, background: accentBg, border: `1px solid ${accentBorder}`, color: accentClr, fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}
                >Deep Dive</button>
                {(a.address || a.name) && (
                  <a
                    href={dirURL(a.address, a.name ?? "", "")} target="_blank" rel="noopener noreferrer"
                    style={{ height: 38, width: 38, borderRadius: 8, background: t.card2, border: `1px solid ${t.border}`, color: t.secondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flexShrink: 0 }}
                  ><DirIcon /></a>
                )}
                {onToggleFav && a.name && (
                  <button
                    onClick={() => onToggleFav({ name: a.name!, neighborhood: a.neighborhood, food_score: a.food_score })}
                    style={{ height: 38, width: 38, borderRadius: 8, background: t.card2, border: `1px solid ${t.border}`, color: favd ? t.accent : t.tertiary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  ><HeartIcon filled={!!favd} /></button>
                )}
                {a.name && (
                  <button
                    onClick={() => handleShare(a, i)}
                    style={{ height: 38, width: 38, borderRadius: 8, background: t.card2, border: `1px solid ${t.border}`, color: copiedIdx === i ? t.green : t.tertiary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >{copiedIdx === i ? <span style={{ fontSize: "0.65rem", fontFamily: "'IBM Plex Mono',monospace" }}>✓</span> : <ShareIcon />}</button>
                )}
              </div>

              </div>{/* end inner padding */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
