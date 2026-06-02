'use client';
import { useState, useEffect, useRef, type ReactNode } from "react";
import type { Restaurant, SearchMeta, AddToListTarget, AlsoTry } from "@/lib/types";
import { gURL, dirURL } from "@/lib/dish-shared";

// ─── LUMON THEME (dark teal cards always) ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function th(_dark: boolean) {
  return {
    card:        "#10211e",
    card2:       "#1b332e",
    border:      "#2c4a44",
    border2:     "#3d5c55",
    text:        "#f0f4f1",
    secondary:   "#d4e4df",
    tertiary:    "#8aa9a2",
    disabled:    "#5f7a74",
    accent:      "#7fe3c8",
    accentHover: "#5ccfb0",
    accentLight: "#1b332e",
    errorText:   "#d64545",
    s1: "0 2px 8px rgba(0,0,0,0.35),0 1px 3px rgba(0,0,0,0.25)",
    s2: "0 4px 16px rgba(0,0,0,0.45),0 2px 6px rgba(0,0,0,0.28)",
    s3: "0 8px 28px rgba(0,0,0,0.55),0 4px 10px rgba(0,0,0,0.32)",
  };
}

// ─── SCORE — vivid tiers on dark card background ───────────────────────────────
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

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = (d: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const DirectionsIcon = () => I(<><line x1="5" y1="19" x2="19" y2="5"/><path d="M9 5h10v10"/></>);
const PhotosIcon = () => I(<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15 L16 10 L5 21"/></>);
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"} stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
  </svg>
);
const ArrowLeft = () => I(<polyline points="15 18 9 12 15 6"/>);
const ArrowRight = () => I(<polyline points="9 18 15 12 9 6"/>);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── SCORE RING (redesigned as confident number — same export for compat) ──────
export function ScoreRing({ score, size = 52, dark: darkProp }: { score: number; size?: number; dark?: boolean }) {
  const [dark, setDark] = useState(darkProp ?? false);
  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  const safe = typeof score === "number" && !isNaN(score) ? score : 5;
  const clr  = scoreColor(safe, dark);
  const fs   = size >= 60 ? "2.5rem" : size >= 55 ? "2.25rem" : size >= 48 ? "2rem" : "1.75rem";
  const t    = th(dark);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {/* Score number */}
      <div style={{
        fontFamily: "var(--font-orbitron), 'Courier New', monospace",
        fontSize: fs, fontWeight: 900, color: clr, lineHeight: 1,
      }}>{safe.toFixed(1)}</div>
      {/* Colored underline */}
      <div style={{ width: 40, height: 2, background: clr, borderRadius: 1 }} />
      {/* / 10 */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.75rem", color: t.tertiary, lineHeight: 1,
      }}>/ 10</div>
    </div>
  );
}

// ─── PRICE TAG ────────────────────────────────────────────────────────────────
export function PriceTag({ price, dark: darkProp }: { price?: string; dark?: boolean }) {
  const [dark, setDark] = useState(darkProp ?? false);
  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  if (!price) return null;
  const t       = th(dark);
  const filled  = ["$", "$$", "$$$", "$$$$"].indexOf(price) + 1;
  return (
    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.02em" }}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} style={{ color: i <= filled ? t.accent : t.disabled }}>$</span>
      ))}
    </span>
  );
}

// ─── VENUE BADGE ─────────────────────────────────────────────────────────────
export function VenueBadge({ type, dark: darkProp }: { type: string; dark?: boolean }) {
  const [dark, setDark] = useState(darkProp ?? false);
  useEffect(() => {
    if (darkProp !== undefined) { setDark(darkProp); return; }
    setDark(localStorage.getItem("dr-dark") === "1");
  }, [darkProp]);

  const t = th(dark);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      color: t.tertiary, border: `1px solid ${t.border}`,
      fontFamily: "'CityLight', sans-serif", fontSize: "0.75rem",
      padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap",
      textTransform: "uppercase", letterSpacing: "0.06em",
    }}>{type}</span>
  );
}

// ─── PHOTO PLACEHOLDER ───────────────────────────────────────────────────────
export function Photo({ name }: { name?: string; domain?: string; rank?: number; dish?: string }) {
  const initial = (name || "?").split(" ").find(w => w.length > 0)?.[0]?.toUpperCase() || "?";
  return (
    <div style={{
      width: "100%", height: "100%", background: "#E8E3DC",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        fontFamily: "'Playfair Display',Georgia,serif",
        fontSize: "3rem", fontWeight: 700, color: "#A89F99",
        lineHeight: 1, userSelect: "none",
      }}>{initial}</div>
    </div>
  );
}

// ─── PLACES PHOTO THUMB ──────────────────────────────────────────────────────
export function PlacesPhotoThumb({ name, city, fallback }: { name?: string; city?: string; fallback: ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    fetch(`/api/photos?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city || "")}`)
      .then(r => r.json()).then(d => { if (d.photos?.[0]) setSrc(`/api/photo?name=${encodeURIComponent(d.photos[0])}`); }).catch(() => {});
  }, [name, city]);
  if (!src) return <>{fallback}</>;
  return <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setSrc(null)} />;
}

// ─── PLACES PHOTO STRIP ──────────────────────────────────────────────────────
export function PlacesPhotoStrip({ name, city }: { name?: string; city?: string }) {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    if (!name) return;
    fetch(`/api/photos?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city || "")}`)
      .then(r => r.json()).then(d => { if (d.photos?.length) setPhotos(d.photos.slice(0, 6)); }).catch(() => {});
  }, [name, city]);
  if (!photos.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 14px", scrollbarWidth: "none" }}>
      {photos.map((p, i) => (
        <img key={i} src={`/api/photo?name=${encodeURIComponent(p)}`} alt=""
          style={{ height: 140, width: "auto", minWidth: 100, maxWidth: 220, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
      ))}
    </div>
  );
}

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

  const prev = () => setIdx(c => Math.max(0, c - 1));
  const next = () => setIdx(c => Math.min(urls.length - 1, c + 1));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const diff = e.changedTouches[0].clientX - touchX.current;
        if (diff > 50) prev();
        if (diff < -50) next();
      }}
    >
      <img src={urls[idx]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onClick={e => e.stopPropagation()} />

      {/* Close */}
      <button onClick={onClose} aria-label="Close" style={{
        position: "absolute", top: 16, right: 16,
        background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><XIcon /></button>

      {/* Previous */}
      {idx > 0 && (
        <button onClick={prev} aria-label="Previous photo" style={{
          position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><ArrowLeft /></button>
      )}

      {/* Next */}
      {idx < urls.length - 1 && (
        <button onClick={next} aria-label="Next photo" style={{
          position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><ArrowRight /></button>
      )}

      {/* Dot indicators */}
      {urls.length > 1 && (
        <div style={{ position: "absolute", bottom: 24, display: "flex", gap: 6, alignItems: "center" }}>
          {urls.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? 24 : 6, height: 6, borderRadius: 3,
              background: i === idx ? "#fff" : "rgba(255,255,255,0.35)",
              transition: "all 0.2s", cursor: "pointer",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MORE MENU ────────────────────────────────────────────────────────────────
function MoreMenu({ onAddToList, onDeepDive, onShare, onClose, t }: {
  onAddToList?: () => void;
  onDeepDive: () => void;
  onShare: () => void;
  onClose: () => void;
  t: ReturnType<typeof th>;
}) {
  const itemStyle: React.CSSProperties = {
    width: "100%", background: "none", border: "none",
    padding: "11px 14px", cursor: "pointer",
    fontFamily: "'Inter',sans-serif", fontSize: "0.875rem",
    color: t.text, textAlign: "left",
    borderBottom: `1px solid ${t.border}`,
    transition: "background 0.1s",
    display: "block",
  };

  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 4px)", right: 0,
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 10, width: 164, zIndex: 200, overflow: "hidden",
      boxShadow: t.s3,
    }}>
      {onAddToList && (
        <button style={itemStyle} onClick={() => { onAddToList(); onClose(); }}
          onMouseEnter={e => { e.currentTarget.style.background = t.card2; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
        >Add to list</button>
      )}
      <button style={itemStyle} onClick={() => { onShare(); onClose(); }}
        onMouseEnter={e => { e.currentTarget.style.background = t.card2; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
      >Share</button>
      <button style={{ ...itemStyle, borderBottom: "none", color: t.accent }}
        onClick={() => { onDeepDive(); onClose(); }}
        onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
      >Deep Dive</button>
    </div>
  );
}

// ─── REST CARD ────────────────────────────────────────────────────────────────
type RestCardProps = {
  r: Restaurant; i: number; expanded: number | null;
  onToggle: (i: number) => void; onDeepDive: (name: string, score?: number, restaurantId?: string) => void;
  meta: SearchMeta | null; searchedDish: string;
  isFav: boolean; onToggleFav: (r: Restaurant) => void;
  onAddToList?: (r: Restaurant) => void;
};

export function RestCard({ r, i, expanded, onToggle, onDeepDive, meta, isFav, onToggleFav, onAddToList }: RestCardProps) {
  const isExpanded = expanded === i;

  const [photoRefs, setPhotoRefs] = useState<string[]>([]);
  const [hovered, setHovered]     = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [dark, setDark] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);

  // Dark mode
  useEffect(() => { setDark(localStorage.getItem("dr-dark") === "1"); }, []);

  // Load photos
  useEffect(() => {
    if (!r.name) return;
    fetch(`/api/photos?name=${encodeURIComponent(r.name)}&city=${encodeURIComponent(meta?.city || "")}`)
      .then(res => res.json())
      .then(d => { if (d.photos?.length) setPhotoRefs(d.photos.slice(0, 6)); })
      .catch(() => {});
  }, [r.name, meta?.city]);

  // Close More menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMoreMenu]);

  const t        = th(dark);
  const photoUrls = photoRefs.map(ref => `/api/photo?name=${encodeURIComponent(ref)}`);
  const mos      = (Array.isArray(r.must_orders) ? r.must_orders : []).filter(m => m != null);
  const also     = (Array.isArray(r.also_try)    ? r.also_try    : []).filter(a => a != null);
  const firstMo  = mos[0];

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };

  const handleShare = () => {
    const text = `${r.name}${meta?.city ? ` in ${meta.city}` : ""}`;
    if (navigator.share) { navigator.share({ title: r.name, text, url: window.location.href }).catch(() => {}); }
    else { navigator.clipboard.writeText(window.location.href).catch(() => {}); }
  };

  const borderColor = isExpanded || hovered ? t.accent : t.border;
  const shadow      = isExpanded ? t.s3 : hovered ? t.s2 : t.s1;

  // Action button style helper
  const actionBtn: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    background: "none", border: "none", cursor: "pointer",
    fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", fontWeight: 500,
    color: t.secondary, padding: "0 8px",
    transition: "color 0.15s", minWidth: 44, minHeight: 44,
    justifyContent: "center",
  };

  return (
    <>
      <div
        style={{
          background:   t.card,
          border:       `1px solid ${borderColor}`,
          borderRadius: 12,
          boxShadow:    shadow,
          overflow:     "hidden",
          transition:   "border-color 0.15s ease-out, box-shadow 0.15s ease-out",
          position:     "relative",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Photo strip ───────────────────────────────────────────────── */}
        <div style={{ position: "relative", height: 180, overflow: "hidden", flexShrink: 0 }}>
          {photoUrls.length > 0 ? (
            <div style={{ display: "flex", height: "100%", overflowX: "auto", scrollbarWidth: "none" }}>
              {photoUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={r.name}
                  onClick={e => { e.stopPropagation(); openLightbox(idx); }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{
                    height: "100%",
                    flexShrink: 0,
                    objectFit: "cover",
                    cursor: "pointer",
                    width: photoUrls.length === 1 ? "100%" : "72vw",
                    maxWidth: photoUrls.length === 1 ? "100%" : 290,
                    minWidth: photoUrls.length === 1 ? "auto" : 180,
                  }}
                />
              ))}
            </div>
          ) : (
            <Photo name={r.name} />
          )}

          {/* Rank badge */}
          {r.rank != null && (
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: "#7fe3c8", color: "#FFFFFF",
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "0.875rem", fontWeight: 700,
              padding: "4px 12px", borderRadius: 12,
              lineHeight: 1.4, letterSpacing: "0.04em",
            }}>{r.rank}</div>
          )}
        </div>

        {/* ── Content area (tap to expand) ──────────────────────────────── */}
        <div style={{ cursor: "pointer" }} onClick={() => onToggle(i)}>

          {/* Row 1 — Score LEFT + Name RIGHT */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px 10px" }}>
            {/* Score — left anchor. Base food_score, vivid tier color. */}
            {(() => {
              const score = r.food_score ?? 5;
              const clr = scoreColor(score, dark);
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                    fontSize: "2.5rem", fontWeight: 900, color: clr, lineHeight: 1,
                  }}>{score.toFixed(1)}</div>
                  <div style={{ width: 40, height: 2, background: clr, borderRadius: 1 }} />
                  <div style={{
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: "0.6rem", fontWeight: 600,
                    color: "#9fe3c8", letterSpacing: "0.04em",
                    textAlign: "center", whiteSpace: "nowrap",
                  }}>{scoreTierLabel(score)}</div>
                </div>
              );
            })()}
            {/* Restaurant name + optional dish relevance badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: "1.5rem", fontWeight: 700,
                color: t.text, lineHeight: 1.2,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
              }}>{r.name}</div>
              {r.dish_badge && (
                <div style={{
                  display: "inline-block", marginTop: 5,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.68rem", fontWeight: 600,
                  color: "#7fe3c8",
                  background: "rgba(127,227,200,0.08)",
                  border: "1px solid rgba(127,227,200,0.25)",
                  borderRadius: 4, padding: "2px 7px",
                  letterSpacing: "0.02em",
                }}>
                  {r.dish_badge}
                </div>
              )}
            </div>
          </div>

          {/* FIX 4: low-confidence flag — visible signal for thin-signal results */}
          {r.confidence === "low" && (
            <div style={{ padding: "0 20px 6px" }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.65rem", color: "#A89F99",
                background: "rgba(168,159,153,0.1)",
                border: "1px solid rgba(168,159,153,0.25)",
                borderRadius: 4, padding: "2px 7px",
                letterSpacing: "0.04em",
              }}>limited signal</span>
            </div>
          )}

          {/* Row 2 — Location · Type · Price */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: 5, flexWrap: "wrap",
            padding: "0 20px 12px",
          }}>
            {r.neighborhood && (
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", fontWeight: 500, color: t.secondary }}>
                {r.neighborhood}
              </span>
            )}
            {r.neighborhood && (r.venue_type || r.price_range) && (
              <span style={{ color: t.tertiary, fontSize: "0.875rem" }}>·</span>
            )}
            {r.venue_type && (
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", fontWeight: 500, color: t.secondary }}>
                {r.venue_type}
              </span>
            )}
            {r.price_range && (
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.875rem", fontWeight: 600 }}>
                {[1, 2, 3, 4].map(n => {
                  const filled = ["$", "$$", "$$$", "$$$$"].indexOf(r.price_range!) + 1;
                  return <span key={n} style={{ color: n <= filled ? t.accent : t.disabled }}>$</span>;
                })}
              </span>
            )}
          </div>

          {/* Row 3 — Action buttons */}
          <div
            style={{
              borderTop: `1px solid ${t.border}`,
              padding: "2px 4px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Directions */}
            <button
              style={actionBtn}
              onClick={() => window.open(dirURL(r.address, r.name, meta?.city || ""), "_blank")}
              onMouseEnter={e => { e.currentTarget.style.color = t.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.secondary; }}
            >
              <DirectionsIcon />Directions
            </button>

            {/* Photos */}
            <button
              style={{ ...actionBtn, opacity: photoUrls.length === 0 ? 0.4 : 1 }}
              onClick={() => photoUrls.length > 0 && openLightbox(0)}
              disabled={photoUrls.length === 0}
              onMouseEnter={e => { if (photoUrls.length > 0) e.currentTarget.style.color = t.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.secondary; }}
            >
              <PhotosIcon />Photos
            </button>

            {/* Save */}
            <button
              style={{ ...actionBtn, color: isFav ? t.accent : t.secondary }}
              onClick={() => onToggleFav(r)}
              onMouseEnter={e => { e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = isFav ? t.accent : t.secondary; }}
            >
              <HeartIcon filled={isFav} />{isFav ? "Saved" : "Save"}
            </button>

            {/* More */}
            <div ref={moreRef} style={{ position: "relative" }}>
              <button
                style={actionBtn}
                onClick={() => setShowMoreMenu(v => !v)}
                onMouseEnter={e => { e.currentTarget.style.color = t.text; }}
                onMouseLeave={e => { e.currentTarget.style.color = t.secondary; }}
              >
                <MoreIcon />More
              </button>

              {showMoreMenu && (
                <MoreMenu
                  onAddToList={onAddToList ? () => onAddToList(r) : undefined}
                  onDeepDive={() => { setShowMoreMenu(false); onDeepDive(r.name, r.food_score, r.restaurant_id); }}
                  onShare={handleShare}
                  onClose={() => setShowMoreMenu(false)}
                  t={t}
                />
              )}
            </div>
          </div>

          {/* Row 4 — WHY IT RANKS HERE */}
          {r.win_reason && (
            <div style={{ padding: "10px 20px 0" }}>
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem",
                fontWeight: 400, color: "#7fe3c8",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4,
              }}>Why it ranks here</div>
              <div style={{
                fontFamily: "'DM Sans','Inter',sans-serif",
                fontSize: "0.875rem", color: t.secondary, lineHeight: 1.5,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
              }}>{r.win_reason}</div>
            </div>
          )}

          {/* Row 5 — Must order preview */}
          {firstMo && (
            <div style={{ padding: "10px 20px 16px" }}>
              <div style={{
                fontFamily: "'Sevastopol', Georgia, serif", fontSize: "0.6875rem",
                fontWeight: 400, color: "#7fe3c8",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
              }}>Must Order</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: "#1b332e", border: "1px solid #2c4a44",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                    fontSize: "1.25rem", fontWeight: 900, color: "#7fe3c8", lineHeight: 1,
                  }}>{((firstMo.item || "?")[0] || "?").toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", fontWeight: 600,
                    color: t.text, lineHeight: 1.2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{firstMo.item || ""}</div>
                  {firstMo.differentiator && (
                    <div style={{
                      fontFamily: "'DM Sans','Inter',sans-serif", fontSize: "0.875rem",
                      color: t.secondary, lineHeight: 1.4, marginTop: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{firstMo.differentiator}</div>
                  )}
                </div>
                {mos.length > 1 && (
                  <div style={{
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.68rem",
                    color: t.tertiary, border: `1px solid ${t.border}`,
                    padding: "2px 8px", borderRadius: 10, flexShrink: 0,
                  }}>+{mos.length - 1}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Expanded content ──────────────────────────────────────────── */}
        <div style={{
          maxHeight: isExpanded ? "900px" : "0",
          overflow: "hidden",
          transition: "max-height 0.25s ease-out",
        }}>
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "20px 16px 16px" }}>

            {/* Experience note */}
            {r.experience_note && (
              <div style={{
                fontSize: "0.825rem", lineHeight: 1.55,
                padding: "8px 12px", marginBottom: 16,
                background: `${t.accent}10`,
                borderLeft: `2px solid ${t.accent}`,
                borderRadius: "0 6px 6px 0", color: t.text,
              }}>
                <div style={{
                  fontFamily: "'Inter',sans-serif", fontSize: "0.6rem",
                  fontWeight: 600, color: t.accent,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
                }}>Heads up</div>
                {r.experience_note}
              </div>
            )}

            {/* All must orders */}
            {mos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Inter',sans-serif", fontSize: "0.6rem",
                  fontWeight: 600, color: t.tertiary,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
                }}>Must Order</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mos.map((mo, j) => (
                    <div key={j} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {/* Only use a photo if this specific index has one — never fall back to
                          photoUrls[0] (the establishment shot), which repeats the same image
                          across every dish. Show an amber initial placeholder instead. */}
                      {photoUrls[j] ? (
                        <img
                          src={photoUrls[j]}
                          alt={mo?.item || ""}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 64, height: 64, borderRadius: 8, flexShrink: 0,
                          background: `radial-gradient(circle, #2c4a44 1px, transparent 1px) #1b332e`,
                          backgroundSize: "10px 10px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{
                            fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                            fontSize: "1.1rem", fontWeight: 900, color: "#7fe3c8", lineHeight: 1,
                          }}>{((mo?.item || "?")[0] || "?").toUpperCase()}</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Inter',sans-serif", fontSize: "0.9rem",
                          fontWeight: 600, color: t.text, marginBottom: 3,
                        }}>{mo?.item || ""}</div>
                        {mo?.why && (
                          <div style={{
                            fontFamily: "'DM Sans','Inter',sans-serif",
                            fontSize: "0.825rem", color: t.secondary, lineHeight: 1.5,
                          }}>{mo.why}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Also try */}
            {also.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Inter',sans-serif", fontSize: "0.6rem",
                  fontWeight: 600, color: t.tertiary,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
                }}>Also try</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {also.filter((a): a is NonNullable<AlsoTry> => a != null).map((a, j) => {
                    const label = typeof a === "string" ? a : (a?.dish || "");
                    if (!label) return null;
                    return (
                      <div key={j} style={{
                        background: t.card2, border: `1px solid ${t.border}`,
                        borderRadius: 20, padding: "4px 12px",
                        fontFamily: "'Inter',sans-serif", fontSize: "0.8rem",
                        color: t.secondary,
                      }}>{label}</div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Best quote */}
            {r.best_quote && (
              <div style={{
                background: t.card2, border: `1px solid ${t.border}`,
                borderRadius: 8, padding: "10px 12px", marginBottom: 20,
              }}>
                <div style={{
                  fontFamily: "'Inter',sans-serif", fontSize: "0.6rem",
                  fontWeight: 600, color: t.tertiary,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5,
                }}>Top review signal</div>
                <div style={{
                  fontFamily: "'DM Sans','Inter',sans-serif",
                  fontSize: "0.825rem", color: t.secondary,
                  lineHeight: 1.65, fontStyle: "italic",
                }}>"{r.best_quote}"</div>
              </div>
            )}

            {/* Deep Dive button */}
            <button
              onClick={e => { e.stopPropagation(); onDeepDive(r.name, r.food_score, r.restaurant_id); }}
              style={{
                width: "100%", background: t.accent, border: "none",
                borderRadius: 10, color: "#FFFFFF",
                fontFamily: "'Inter',sans-serif", fontSize: "0.875rem",
                fontWeight: 600, height: 44, cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
            >Full Deep Dive</button>

            {/* Show less */}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                onClick={e => { e.stopPropagation(); onToggle(i); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Inter',sans-serif", fontSize: "0.75rem",
                  color: t.tertiary, padding: "4px 8px",
                }}
              >↑ Show less</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && photoUrls.length > 0 && (
        <Lightbox urls={photoUrls} startIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
