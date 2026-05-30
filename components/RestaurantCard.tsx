'use client';
import { useState, useEffect, useRef, type ReactNode } from "react";
import type { Restaurant, SearchMeta, AddToListTarget, AlsoTry } from "@/lib/types";
import { gURL, dirURL } from "@/lib/dish-shared";

// ─── THEME ────────────────────────────────────────────────────────────────────
function th(dark: boolean) {
  return {
    card:       dark ? "#1A1A1A" : "#FFFFFF",
    card2:      dark ? "#232323" : "#FDFCFB",
    border:     dark ? "#2C2C2C" : "#E8E3DC",
    border2:    dark ? "#3A3A3A" : "#D4CBC0",
    text:       dark ? "#F0EDE8" : "#1C1917",
    secondary:  dark ? "#9A9390" : "#6B6560",
    tertiary:   dark ? "#6B6866" : "#A89F99",
    disabled:   dark ? "#4A4846" : "#C8C2BC",
    accent:     dark ? "#FFB800" : "#C8860A",
    accentHover:dark ? "#FFC933" : "#A86E08",
    accentLight:dark ? "#2A2010" : "#FDF3E3",
    errorText:  dark ? "#EF4444" : "#9B1C1C",
    s1: dark
      ? "0 1px 3px rgba(0,0,0,0.30),0 1px 2px rgba(0,0,0,0.20)"
      : "0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)",
    s2: dark
      ? "0 4px 12px rgba(0,0,0,0.40),0 2px 4px rgba(0,0,0,0.30)"
      : "0 4px 12px rgba(0,0,0,0.10),0 2px 4px rgba(0,0,0,0.06)",
    s3: dark
      ? "0 8px 24px rgba(0,0,0,0.50),0 4px 8px rgba(0,0,0,0.30)"
      : "0 8px 24px rgba(0,0,0,0.12),0 4px 8px rgba(0,0,0,0.08)",
  };
}

// ─── SCORE ────────────────────────────────────────────────────────────────────
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
      {/* ANALYTICAL SCORE label */}
      <div style={{
        fontFamily: "'Sevastopol', Georgia, serif",
        fontSize: "0.45rem", fontWeight: 400, color: clr,
        textTransform: "uppercase", letterSpacing: "0.2em", lineHeight: 1,
      }}>ANALYTICAL SCORE</div>

      {/* Score number in targeting box */}
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* Border box */}
        <div style={{
          fontFamily: "'IBM Plex Mono',monospace", fontSize: fs, fontWeight: 700,
          color: clr, lineHeight: 1,
          border: `1px solid ${clr}`,
          padding: "4px 8px", borderRadius: 2,
        }}>{safe.toFixed(1)}</div>
        {/* Corner marks — targeting reticle */}
        {[
          { top: -3, left: -3, borderTop: `2px solid ${clr}`, borderLeft: `2px solid ${clr}` },
          { top: -3, right: -3, borderTop: `2px solid ${clr}`, borderRight: `2px solid ${clr}` },
          { bottom: -3, left: -3, borderBottom: `2px solid ${clr}`, borderLeft: `2px solid ${clr}` },
          { bottom: -3, right: -3, borderBottom: `2px solid ${clr}`, borderRight: `2px solid ${clr}` },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 5, height: 5, ...s }} />
        ))}
      </div>

      {/* / 10.0 MAX */}
      <div style={{
        fontFamily: "'Sevastopol', Georgia, serif",
        fontSize: "0.45rem", fontWeight: 400, color: t.tertiary,
        textTransform: "uppercase", letterSpacing: "0.15em", lineHeight: 1,
      }}>/ 10.0 MAX</div>
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
      fontFamily: "'Inter',sans-serif", fontSize: "0.72rem", fontWeight: 500,
      padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap",
      textTransform: "uppercase", letterSpacing: "0.05em",
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
  onToggle: (i: number) => void; onDeepDive: (name: string) => void;
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
    fontFamily: "'Inter',sans-serif", fontSize: "0.72rem",
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
              background: "#C8860A", color: "#FFFFFF",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: "0.68rem", fontWeight: 700,
              padding: "3px 9px", borderRadius: 12,
              lineHeight: 1.4,
            }}>{r.rank}</div>
          )}
        </div>

        {/* ── Content area (tap to expand) ──────────────────────────────── */}
        <div style={{ cursor: "pointer" }} onClick={() => onToggle(i)}>
          <div style={{ padding: 16 }}>

            {/* Row 1 — Name + Score */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <div style={{
                fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: "1.375rem", fontWeight: 700,
                color: t.text, lineHeight: 1.2, flex: 1, minWidth: 0,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
              }}>{r.name}</div>

              {/* Score with targeting reticle */}
              {(() => {
                const clr = scoreColor(r.food_score ?? 5, dark);
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{
                      fontFamily: "'Sevastopol', Georgia, serif",
                      fontSize: "0.45rem", color: clr,
                      textTransform: "uppercase", letterSpacing: "0.2em", lineHeight: 1,
                    }}>ANALYTICAL SCORE</div>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <div style={{
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: "2rem", fontWeight: 700,
                        color: clr, lineHeight: 1,
                        border: `1px solid ${clr}`, padding: "4px 8px", borderRadius: 2,
                      }}>{(r.food_score ?? 5).toFixed(1)}</div>
                      {[
                        { top: -3, left: -3, borderTop: `2px solid ${clr}`, borderLeft: `2px solid ${clr}` },
                        { top: -3, right: -3, borderTop: `2px solid ${clr}`, borderRight: `2px solid ${clr}` },
                        { bottom: -3, left: -3, borderBottom: `2px solid ${clr}`, borderLeft: `2px solid ${clr}` },
                        { bottom: -3, right: -3, borderBottom: `2px solid ${clr}`, borderRight: `2px solid ${clr}` },
                      ].map((s, i) => (
                        <div key={i} style={{ position: "absolute", width: 5, height: 5, ...s }} />
                      ))}
                    </div>
                    <div style={{
                      fontFamily: "'Sevastopol', Georgia, serif",
                      fontSize: "0.45rem", color: t.tertiary,
                      textTransform: "uppercase", letterSpacing: "0.15em", lineHeight: 1,
                    }}>/ 10.0 MAX</div>
                  </div>
                );
              })()}
            </div>

            {/* Row 2 — Location · Type · Price */}
            <div style={{
              display: "flex", alignItems: "center",
              gap: 5, flexWrap: "wrap",
              marginBottom: 12,
            }}>
              {r.neighborhood && (
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: t.secondary }}>
                  {r.neighborhood}
                </span>
              )}
              {r.neighborhood && (r.venue_type || r.price_range) && (
                <span style={{ color: t.tertiary, fontSize: "0.75rem" }}>·</span>
              )}
              {r.venue_type && (
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: t.tertiary }}>
                  {r.venue_type}
                </span>
              )}
              {r.price_range && (
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.8rem", fontWeight: 600 }}>
                  {[1, 2, 3, 4].map(n => {
                    const filled = ["$", "$$", "$$$", "$$$$"].indexOf(r.price_range!) + 1;
                    return <span key={n} style={{ color: n <= filled ? t.accent : t.disabled }}>$</span>;
                  })}
                </span>
              )}
            </div>

            {/* Row 3 — Must order preview */}
            {firstMo && (
              <div style={{ marginBottom: 2 }}>
                <div style={{
                  fontFamily: "'Inter',sans-serif", fontSize: "0.6rem",
                  fontWeight: 600, color: t.tertiary,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  marginBottom: 7,
                }}>Must Order</div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Thumbnail — use 2nd photo (more likely food) */}
                  {(photoUrls[1] || photoUrls[0]) && (
                    <img
                      src={photoUrls[1] || photoUrls[0]}
                      alt={firstMo.item || ""}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: "0.875rem", fontWeight: 600,
                      color: t.text, lineHeight: 1.2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{firstMo.item || ""}</div>

                    {firstMo.differentiator && (
                      <div style={{
                        fontFamily: "'DM Sans','Inter',sans-serif",
                        fontSize: "0.8rem", fontStyle: "italic",
                        color: t.secondary, lineHeight: 1.3, marginTop: 2,
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

          {/* Row 4 — Quick actions */}
          <div
            style={{
              borderTop: `1px solid ${t.border}`,
              padding: "2px 4px 2px",
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
                  onDeepDive={() => { setShowMoreMenu(false); onDeepDive(r.name); }}
                  onShare={handleShare}
                  onClose={() => setShowMoreMenu(false)}
                  t={t}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Expanded content ──────────────────────────────────────────── */}
        <div style={{
          maxHeight: isExpanded ? "900px" : "0",
          overflow: "hidden",
          transition: "max-height 0.25s ease-out",
        }}>
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "20px 16px 16px" }}>

            {/* Win reason */}
            {r.win_reason && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Inter',sans-serif", fontSize: "0.6rem",
                  fontWeight: 600, color: t.accent,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7,
                }}>Why it ranks here</div>
                <div style={{
                  fontFamily: "'DM Sans','Inter',sans-serif",
                  fontSize: "0.9rem", color: t.text, lineHeight: 1.65,
                }}>{r.win_reason}</div>
              </div>
            )}

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
                      {(photoUrls[j] || photoUrls[0]) && (
                        <img
                          src={photoUrls[j] || photoUrls[0]}
                          alt={mo?.item || ""}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                        />
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
              onClick={e => { e.stopPropagation(); onDeepDive(r.name); }}
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
