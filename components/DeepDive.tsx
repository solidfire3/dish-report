'use client';
import { useState, useEffect, useRef, type ReactNode } from "react";
import type {
  DeepDiveData, CompareData, MarketData, Alternative, Vendor,
  AddToListTarget, AlsoTry,
} from "@/lib/types";
import { gURL, dirURL } from "@/lib/dish-shared";
import { ScoreRing, PriceTag, VenueBadge } from "@/components/RestaurantCard";

// ─── THEME ────────────────────────────────────────────────────────────────────
function th(dark: boolean) {
  return {
    bg:           dark ? "#0F0F0F" : "#F7F4F0",
    card:         dark ? "#1A1A1A" : "#FFFFFF",
    card2:        dark ? "#232323" : "#FDFCFB",
    border:       dark ? "#2C2C2C" : "#E8E3DC",
    border2:      dark ? "#3A3A3A" : "#D4CBC0",
    text:         dark ? "#F0EDE8" : "#1C1917",
    secondary:    dark ? "#9A9390" : "#6B6560",
    tertiary:     dark ? "#6B6866" : "#A89F99",
    disabled:     dark ? "#4A4846" : "#C8C2BC",
    accent:       dark ? "#FFB800" : "#C8860A",
    accentHover:  dark ? "#FFC933" : "#A86E08",
    accentLight:  dark ? "#2A2010" : "#FDF3E3",
    accentBorder: dark ? "#4A3810" : "#F0D5A0",
    blue:         dark ? "#93C5FD" : "#1E40AF",
    blueBg:       dark ? "rgba(30,64,175,0.12)" : "#EFF6FF",
    blueBorder:   dark ? "rgba(30,64,175,0.35)" : "#BFDBFE",
    green:        dark ? "#86EFAC" : "#166534",
    greenBg:      dark ? "rgba(22,101,52,0.12)" : "#F0FDF4",
    greenBorder:  dark ? "rgba(22,101,52,0.35)" : "#86EFAC",
    red:          dark ? "#EF4444" : "#9B1C1C",
    s1:  dark ? "0 1px 3px rgba(0,0,0,.30),0 1px 2px rgba(0,0,0,.20)" : "0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04)",
    s2:  dark ? "0 4px 12px rgba(0,0,0,.40),0 2px 4px rgba(0,0,0,.30)" : "0 4px 12px rgba(0,0,0,.10),0 2px 4px rgba(0,0,0,.06)",
    s3:  dark ? "0 8px 24px rgba(0,0,0,.50),0 4px 8px rgba(0,0,0,.30)" : "0 8px 24px rgba(0,0,0,.12),0 4px 8px rgba(0,0,0,.08)",
  };
}

function scoreColor(score: number, dark: boolean): string {
  if (dark) {
    if (score >= 8) return "#2ECC71";
    if (score >= 7) return "#FFB800";
    if (score >= 6) return "#F59E0B";
    return "#EF4444";
  }
  if (score >= 8) return "#1A7A3C";
  if (score >= 7) return "#C8860A";
  if (score >= 6) return "#B45309";
  return "#9B1C1C";
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
};

export function DeepDiveResult({ data, city, isFav, onFav, onCompare, onMarket, onAddToList, onBack }: DeepDiveResultProps) {
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
      .then(d => { if (d.photos?.length) setPhotoRefs(d.photos.slice(0, 6)); })
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

  const handleShare = () => {
    const text = data.name;
    if (navigator.share) { navigator.share({ title: data.name, text, url: window.location.href }).catch(() => {}); }
    else { navigator.clipboard.writeText(window.location.href).catch(() => {}); }
  };

  const showMarket = !!(data.venue_type?.toLowerCase().match(/market|hall|court|food hall/));

  const outlineBtn = (active = false): React.CSSProperties => ({
    height: 36, padding: "0 14px", borderRadius: 8, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 500,
    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
    background: active ? t.accentLight : "transparent",
    border: `1px solid ${active ? t.accentBorder : t.border2}`,
    color: active ? t.accent : t.text,
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  });

  const SL = (text: string, color?: string) => (
    <div style={{
      fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600,
      color: color || t.tertiary, textTransform: "uppercase",
      letterSpacing: "0.1em", marginBottom: 16,
    }}>{text}</div>
  );

  const Divider = () => <div style={{ height: 1, background: t.border, margin: "28px 0 0" }} />;

  return (
    <>
      <div style={{ background: t.bg, minHeight: "100vh", paddingBottom: 64 }}>

        {/* ── Hero photo strip ─────────────────────────────────────────── */}
        <div style={{ position: "relative", height: 240, overflow: "hidden", background: "#E8E3DC" }}>
          {photoUrls.length > 0 ? (
            <div style={{ display: "flex", height: "100%", overflowX: "auto", scrollbarWidth: "none" }}>
              {photoUrls.map((url, idx) => (
                <img
                  key={idx} src={url} alt=""
                  onClick={() => { setLightboxIdx(idx); setLightboxOpen(true); }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{
                    height: "100%", objectFit: "cover", cursor: "pointer", flexShrink: 0,
                    width: photoUrls.length === 1 ? "100%" : "88%",
                    minWidth: photoUrls.length === 1 ? "100%" : 260,
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "4rem", fontWeight: 700, color: "#A89F99" }}>
                {data.name?.[0]?.toUpperCase() || "?"}
              </div>
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "65%",
            background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))",
            pointerEvents: "none",
          }} />
        </div>

        {/* ── Identity block ───────────────────────────────────────────── */}
        <div style={{ padding: "20px 16px 24px", borderBottom: `1px solid ${t.border}` }}>
          {/* Name */}
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2.25rem", fontWeight: 700,
            color: t.text, lineHeight: 1.15, marginBottom: 10,
          }}>{data.name}</div>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {data.neighborhood && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary }}>
                {data.neighborhood}
              </span>
            )}
            {data.neighborhood && data.venue_type && <span style={{ color: t.tertiary }}>·</span>}
            {data.venue_type && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.tertiary }}>
                {data.venue_type}
              </span>
            )}
            {data.price_range && <PriceTag price={data.price_range} dark={dark} />}
          </div>

          {/* Vibe tags */}
          {vibes.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {vibes.map((v, i) => {
                const label = stripEmoji(v);
                if (!label) return null;
                return (
                  <span key={i} style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", fontWeight: 600,
                    color: t.tertiary, border: `1px solid ${t.border}`,
                    padding: "3px 10px", borderRadius: 20,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    whiteSpace: "nowrap",
                  }}>{label}</span>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            <button
              style={outlineBtn()}
              onClick={() => window.open(dirURL(data.address, data.name, city || ""), "_blank")}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border2; e.currentTarget.style.color = t.text; }}
            ><DirIcon />Directions</button>

            <button
              style={outlineBtn(isFav)}
              onClick={onFav}
            ><HeartIcon filled={isFav} />{isFav ? "Saved" : "Save"}</button>

            <button
              style={outlineBtn()}
              onClick={handleShare}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border2; e.currentTarget.style.color = t.text; }}
            ><ShareIcon />Share</button>

            {onAddToList && (
              <button
                style={outlineBtn()}
                onClick={() => onAddToList({ name: data.name, neighborhood: data.neighborhood, venue_type: data.venue_type, price_range: data.price_range, food_score: data.food_score, cuisine: data.cuisine })}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border2; e.currentTarget.style.color = t.text; }}
              ><PlusIcon />Add to list</button>
            )}
          </div>
        </div>

        {/* ── Score block ──────────────────────────────────────────────── */}
        <div style={{
          padding: "28px 16px 24px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "3.5rem", fontWeight: 700,
              color: scoreColor(data.food_score ?? 5, dark), lineHeight: 1,
            }}>{(data.food_score ?? 5).toFixed(1)}</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "1.5rem", color: t.tertiary,
              lineHeight: 1, paddingBottom: "0.5rem",
            }}>/10</div>
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", fontWeight: 600,
            color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.12em",
          }}>Food Score</div>
        </div>

        {/* Sentinel for sticky header */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        <div style={{ padding: "0 16px" }}>

          {/* ── Must orders ─────────────────────────────────────────────── */}
          {mos.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("What You're Here For", t.accent)}
              {mos.map((mo, j) => (
                <div key={j}>
                  {/* Food photo */}
                  {photoUrls[j] && (
                    <img
                      src={photoUrls[j]} alt={mo?.item || ""}
                      onClick={() => { setLightboxIdx(j); setLightboxOpen(true); }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      style={{
                        width: "100%", height: 200,
                        objectFit: "cover", borderRadius: 12,
                        marginBottom: 12, cursor: "pointer", display: "block",
                      }}
                    />
                  )}
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: "1.375rem", fontWeight: 700,
                    color: t.text, marginBottom: 8, lineHeight: 1.2,
                  }}>{mo?.item || ""}</div>
                  {mo?.why && (
                    <div style={{
                      fontFamily: "'DM Sans', 'Inter', sans-serif",
                      fontSize: "0.9rem", color: t.text, lineHeight: 1.65,
                    }}>{mo.why}</div>
                  )}
                  {j < mos.length - 1 && <div style={{ height: 1, background: t.border, margin: "20px 0" }} />}
                </div>
              ))}
              <Divider />
            </div>
          )}

          {/* ── Also try ─────────────────────────────────────────────────── */}
          {also.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("Also Worth Ordering")}
              {also.filter((a): a is NonNullable<AlsoTry> => a != null).map((a, j) => {
                const name = typeof a === "string" ? a : (a?.dish || "");
                const note = typeof a === "object" ? a?.note : undefined;
                if (!name) return null;
                return (
                  <div key={j}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: t.text, marginBottom: note ? 3 : 0 }}>{name}</div>
                    {note && <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.8rem", fontStyle: "italic", color: t.secondary, lineHeight: 1.45 }}>{note}</div>}
                    {j < also.length - 1 && <div style={{ height: 1, background: t.border, margin: "12px 0" }} />}
                  </div>
                );
              })}
              <Divider />
            </div>
          )}

          {/* ── Skip these ───────────────────────────────────────────────── */}
          {skip.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("Skip These", dark ? "#EF4444" : "#9B1C1C")}
              {skip.filter(s => s != null).map((s, j) => (
                <div key={j}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: t.secondary }}>
                    {String(s)}
                  </div>
                  {j < skip.length - 1 && <div style={{ height: 1, background: t.border, margin: "10px 0" }} />}
                </div>
              ))}
              <Divider />
            </div>
          )}

          {/* ── Insider tips ─────────────────────────────────────────────── */}
          {tips.length > 0 && (
            <div style={{ paddingTop: 28 }}>
              {SL("Insider Tips", dark ? "#93C5FD" : "#1E40AF")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tips.filter(tip => tip != null).map((tip, j) => (
                  <div key={j} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    background: dark ? "rgba(30,64,175,0.1)" : "#F0F4FF",
                    borderRadius: 8, padding: 12,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: dark ? "#93C5FD" : "#1E40AF",
                      flexShrink: 0, marginTop: "0.45em",
                    }} />
                    <div style={{
                      fontFamily: "'DM Sans', 'Inter', sans-serif",
                      fontSize: "0.875rem", color: t.text, lineHeight: 1.55,
                    }}>{String(tip)}</div>
                  </div>
                ))}
              </div>
              <Divider />
            </div>
          )}

          {/* ── The details ──────────────────────────────────────────────── */}
          {(data.hours || data.specials || data.experience_note) && (
            <div style={{ paddingTop: 28 }}>
              {SL("The Details")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.hours && (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.text }}>
                    <span style={{ color: t.tertiary, fontWeight: 600, marginRight: 8, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hours</span>
                    {data.hours}
                  </div>
                )}
                {data.specials && (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.text }}>
                    <span style={{ color: t.tertiary, fontWeight: 600, marginRight: 8, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Specials</span>
                    {data.specials}
                  </div>
                )}
                {data.experience_note && (
                  <div style={{
                    fontSize: "0.875rem", lineHeight: 1.55, padding: "10px 12px",
                    background: `${t.accent}10`,
                    borderLeft: `2px solid ${t.accent}`,
                    borderRadius: "0 6px 6px 0", color: t.text, marginTop: 4,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: t.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Heads up</div>
                    {data.experience_note}
                  </div>
                )}
              </div>
              <Divider />
            </div>
          )}

          {/* ── The verdict ──────────────────────────────────────────────── */}
          {data.verdict && (
            <div style={{ paddingTop: 28 }}>
              {SL("The Bottom Line", t.accent)}
              <div style={{
                borderLeft: `3px solid ${t.accent}`,
                paddingLeft: 16, paddingTop: 2, paddingBottom: 2,
                background: t.accentLight,
                borderRadius: "0 8px 8px 0",
                padding: "14px 14px 14px 16px",
              }}>
                <div style={{
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                  fontSize: "1rem", color: t.text, lineHeight: 1.7,
                }}>{data.verdict}</div>
              </div>
              <Divider />
            </div>
          )}

          {/* ── Explore nearby ───────────────────────────────────────────── */}
          <div style={{ paddingTop: 28 }}>
            {SL("Explore Nearby")}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => onCompare(5, data, "similar")}
                style={{
                  flex: 1, height: 44, borderRadius: 8,
                  background: t.blueBg, border: `1px solid ${t.blueBorder}`,
                  color: t.blue,
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >Similar spots</button>

              <button
                onClick={() => onCompare(5, data, "any")}
                style={{
                  flex: 1, height: 44, borderRadius: 8,
                  background: t.greenBg, border: `1px solid ${t.greenBorder}`,
                  color: t.green,
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >Best food nearby</button>
            </div>
          </div>

          {/* ── Market guide ─────────────────────────────────────────────── */}
          {onMarket && (
            <div style={{ paddingTop: 16, paddingBottom: 8 }}>
              <button
                onClick={() => onMarket(data.name)}
                style={{
                  width: "100%", height: 48, borderRadius: 10,
                  background: t.accent, border: "none",
                  color: "#FFFFFF",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  fontWeight: 600, cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
              >View Market Guide — all vendors</button>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky header ────────────────────────────────────────────────── */}
      {showSticky && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          height: 52,
          background: dark ? "rgba(26,26,26,0.92)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
        }}>
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: t.secondary, padding: 4, display: "flex",
                alignItems: "center", minWidth: 36, minHeight: 36,
              }}
            ><BackIcon /></button>
          )}
          <div style={{
            flex: 1, minWidth: 0,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "1rem", fontWeight: 700, color: t.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{data.name}</div>
          <div style={{
            background: scoreColor(data.food_score ?? 5, dark),
            color: "#fff",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.875rem", fontWeight: 700,
            padding: "4px 12px", borderRadius: 20, flexShrink: 0,
          }}>{(data.food_score ?? 5).toFixed(1)}</div>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxOpen && photoUrls.length > 0 && (
        <Lightbox urls={photoUrls} startIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ─── MARKET GUIDE RESULT ─────────────────────────────────────────────────────
export function MarketGuideResult({ data }: { data: MarketData }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("dr-dark") === "1"); }, []);
  const t = th(dark);

  const vendors = (Array.isArray(data.vendors) ? data.vendors : []).filter((v): v is Vendor => v != null);

  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "24px 16px" }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600,
          color: t.green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
        }}>Market Guide</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", fontWeight: 700, color: t.text, lineHeight: 1.15, marginBottom: 6 }}>{data.market_name}</div>
            {data.location && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, marginBottom: 4 }}>{data.location}</div>}
            {data.hours && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.text }}><span style={{ color: t.tertiary, fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 6 }}>Hours</span>{data.hours}</div>}
          </div>
          <div style={{
            background: t.greenBg, border: `1px solid ${t.greenBorder}`,
            borderRadius: 10, padding: "10px 14px", textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.75rem", fontWeight: 700, color: t.green, lineHeight: 1 }}>{vendors.length}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: t.green, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>Vendors</div>
          </div>
        </div>
        {data.vibe && <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, lineHeight: 1.6, marginTop: 12, padding: "10px 12px", background: t.card2, borderRadius: 8 }}>{data.vibe}</div>}
      </div>

      {/* Vendor list */}
      <div style={{ padding: "16px 16px 60px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600, color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Best thing at each vendor — ranked by food quality
        </div>
        {vendors.map((v, i) => {
          const sc = v.food_score ?? 0;
          const clr = scoreColor(sc, dark);
          return (
            <div key={i} style={{ background: t.card, border: `1px solid ${i === 0 ? t.greenBorder : t.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: i === 0 ? t.s2 : t.s1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {i === 0 && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: t.green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Top Pick</div>}
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: t.text, lineHeight: 1.2, marginBottom: 3 }}>{v.name || ""}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: t.secondary }}>{v.specialty || ""}</div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.5rem", fontWeight: 700, color: clr, lineHeight: 1 }}>{sc.toFixed(1)}</div>
              </div>
              <div style={{ background: t.card2, borderRadius: 8, padding: "10px 12px", marginBottom: v.insider_note ? 8 : 0 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: t.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Order this</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: t.text, marginBottom: 4, lineHeight: 1.2 }}>{v.the_order || ""}</div>
                <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.825rem", color: t.secondary, lineHeight: 1.55 }}>{v.why || ""}</div>
              </div>
              {v.insider_note && (
                <div style={{
                  fontSize: "0.825rem", color: t.blue,
                  background: t.blueBg, border: `1px solid ${t.blueBorder}`,
                  borderRadius: 6, padding: "8px 10px",
                  fontFamily: "'DM Sans', 'Inter', sans-serif", lineHeight: 1.5,
                }}>{v.insider_note}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMPARE RESULT ──────────────────────────────────────────────────────────
type CompareResultProps = {
  data: CompareData;
  originalScore?: number;
  onDeepDive: (name: string, city: string) => void;
};

export function CompareResult({ data, originalScore, onDeepDive }: CompareResultProps) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("dr-dark") === "1"); }, []);
  const t = th(dark);

  const alts = (Array.isArray(data.alternatives) ? data.alternatives : []).filter((a): a is Alternative => a != null);
  const isAny = data._mode === "any";
  const accentClr    = isAny ? t.green    : t.blue;
  const accentBg     = isAny ? t.greenBg  : t.blueBg;
  const accentBorder = isAny ? t.greenBorder : t.blueBorder;

  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "24px 16px" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600, color: accentClr, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          {isAny ? "Best Food Nearby" : "Similar Spots"}
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: t.text, lineHeight: 1.15, marginBottom: 6 }}>
          {isAny ? "Best food near " : "Similar spots near "}
          <span style={{ color: accentClr }}>{data.original?.name}</span>
        </div>
        {data.search_area && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: t.secondary, marginBottom: 12 }}>{data.search_area}</div>}
        {/* Original score reference */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600, color: accentClr, textTransform: "uppercase", letterSpacing: "0.08em" }}>You're comparing</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", fontWeight: 700, color: t.text }}>{data.original?.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem", fontWeight: 700, color: scoreColor(originalScore ?? 0, dark) }}>{(originalScore ?? 0).toFixed(1)}</div>
        </div>
      </div>

      {/* Alternatives */}
      <div style={{ padding: "16px 16px 60px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", fontWeight: 600, color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
          {isAny ? "All cuisines — ranked by food quality" : "Same cuisine — ranked by food quality"}
        </div>
        {alts.map((a, i) => {
          const score = a.food_score ?? 5;
          const delta = a.food_score != null && originalScore != null ? a.food_score - originalScore : null;
          const deltaLabel = delta != null ? (delta > 0.2 ? `+${delta.toFixed(1)}` : delta < -0.2 ? delta.toFixed(1) : "similar") : null;
          const deltaColor = (delta ?? 0) > 0.2 ? t.green : (delta ?? 0) < -0.2 ? t.red : t.tertiary;

          return (
            <div key={i} style={{ background: t.card, border: `1px solid ${i === 0 ? accentBorder : t.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: i === 0 ? t.s2 : t.s1 }}>
              {i === 0 && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: accentClr, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Top alternative</div>}

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
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: t.tertiary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>vs {data.original?.name}</div>
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
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 600, color: t.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Order this</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: t.text, marginBottom: 3 }}>{a.must_order}</div>
                  {a.must_order_why && <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: "0.8rem", color: t.secondary, lineHeight: 1.5 }}>{a.must_order_why}</div>}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onDeepDive(a.name ?? "", "")}
                  style={{ flex: 1, height: 38, borderRadius: 8, background: accentBg, border: `1px solid ${accentBorder}`, color: accentClr, fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}
                >Deep Dive</button>
                {(a.address || a.name) && (
                  <a
                    href={dirURL(a.address, a.name ?? "", "")} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, height: 38, borderRadius: 8, background: t.card2, border: `1px solid ${t.border}`, color: t.secondary, fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                  >Directions</a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
