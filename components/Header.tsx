'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { FontSize } from "@/lib/font-scale";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1"  x2="12" y2="3"  /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="1"  y1="12" x2="3"  y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"  />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
    <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"  />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronRightNav = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ─── BACK BUTTON ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BackBtn({ onBack, dark: _dark = false }: { onBack: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onBack}
      aria-label="Go back"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: "transparent", border: "1px solid #b9c4bf",
        color: "#7a8e8a", cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "#7fe3c8"; e.currentTarget.style.borderColor = "#7fe3c8"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "#7a8e8a"; e.currentTarget.style.borderColor = "#b9c4bf"; }}
    ><ChevronLeftIcon /></button>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
type HeaderProps = {
  user: User | null;
  onSignOut: () => void;
  hasBack?: boolean;
  onBack?: () => void;
  dark?: boolean;
  onToggleDark?: () => void;
  favCount?: number;
  onFavsClick?: () => void;
  fontSz?: FontSize;
  onFontSz?: (s: FontSize) => void;
};

export function Header({
  user, onSignOut, hasBack, onBack, dark: darkProp, onToggleDark: onToggleDarkProp,
  favCount, onFavsClick, fontSz = "normal", onFontSz,
}: HeaderProps) {
  const router = useRouter();

  const [internalDark, setInternalDark] = useState(false);
  useEffect(() => {
    if (darkProp === undefined && localStorage.getItem("dr-dark") === "1") setInternalDark(true);
  }, [darkProp]);
  const dark = darkProp !== undefined ? darkProp : internalDark;

  const toggleDark = () => {
    if (onToggleDarkProp) { onToggleDarkProp(); return; }
    setInternalDark(v => { const next = !v; localStorage.setItem("dr-dark", next ? "1" : "0"); return next; });
  };

  const [showNav, setShowNav] = useState(false);

  // ── Lumon theme — bone header, dark teal nav panel ─────────────────────────
  void dark; // dark mode toggle removed; Lumon theme is always applied
  const bg           = "#e8ece8";
  const border       = "#c4cdc8";
  const borderStrong = "#b9c4bf";
  const text         = "#23413b";
  const secondary    = "#7a8e8a";
  const tertiary     = "#8aa9a2";
  const accent       = "#7fe3c8";
  const accentLight  = "#1b332e";
  const accentBorder = "#2c4a44";
  const shadow       = "0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)";

  // ── Nav panel items ─────────────────────────────────────────────────────────
  const navItems: { label: string; sub: string; onClick: () => void }[] = [
    { label: "Home",        sub: "Back to search",       onClick: () => { setShowNav(false); router.push("/"); } },
    { label: "Favorites",   sub: "Saved spots",          onClick: () => { setShowNav(false); onFavsClick?.(); } },
    { label: "My Lists",    sub: "Saved collections",    onClick: () => { setShowNav(false); router.push("/dashboard/lists"); } },
    { label: "My Searches", sub: "Recent searches",      onClick: () => { setShowNav(false); router.push("/dashboard/searches"); } },
    { label: "About",       sub: "How Dish Report works",onClick: () => { setShowNav(false); router.push("/about"); } },
    { label: "Help",        sub: "Report an issue",      onClick: () => { setShowNav(false); router.push("/help"); } },
  ];

  return (
    <>
      <header style={{
        background: bg, borderBottom: `1px solid ${border}`, boxShadow: shadow,
        position: "sticky", top: 0, zIndex: 100, width: "100%",
      }}>
        <style>{`
          .dr-brand-tagline { font-size: 9px; }
          @media (max-width: 640px) { .dr-brand-tagline { font-size: 11px; } }
          .dr-row1 { display: flex; align-items: center; gap: 12px; padding: 0 20px; height: 64px; }
          @media (max-width: 640px) { .dr-row1 { height: 56px; padding: 0 16px; } }
          /* Desktop nav links — hidden on mobile */
          .dr-desktop-nav { display: flex; align-items: center; gap: 2px; }
          @media (max-width: 768px) { .dr-desktop-nav { display: none; } }
          /* Mobile: hide sign-in CTA text, show icon only */
          .dr-signin-label { display: inline; }
          @media (max-width: 640px) { .dr-signin-label { display: none; } }
        `}</style>

        <div className="dr-row1">
          {/* Back button */}
          {hasBack && onBack && <BackBtn onBack={onBack} dark={dark} />}

          {/* Logo + brand mark — clicking navigates home */}
          <div
            role="link"
            tabIndex={0}
            onClick={() => router.push("/")}
            onKeyDown={e => e.key === "Enter" && router.push("/")}
            style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0, userSelect: "none", cursor: "pointer" }}
          >
            <svg viewBox="0 0 56 56" width="28" height="28" style={{ flexShrink: 0 }}>
              <path d="M8 40 q20 9 40 0" fill="none" stroke="#2f4f49" strokeWidth="2" strokeLinecap="round"/>
              <ellipse cx="28" cy="40" rx="20" ry="5" fill="none" stroke="#2f4f49" strokeWidth="1.2" opacity=".45"/>
              <rect x="19" y="14" width="18" height="24" rx="2" fill="#e8ece8" stroke="#2f4f49" strokeWidth="2"/>
              <path d="M23 20 h10 M23 25 h10 M23 30 h6" stroke="#2f4f49" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                fontFamily: "var(--font-orbitron),'Courier New',monospace",
                fontSize: "1.1rem", fontWeight: 900, lineHeight: 1,
                color: "#2f4f49", letterSpacing: "0.04em",
              }}>DISH REPORT</div>
              <div style={{ height: 1, background: "#3d6b62", opacity: 0.45, margin: "3px 0" }} />
              <div className="dr-brand-tagline" style={{
                fontFamily: "'IBM Plex Mono','Courier New',monospace",
                fontSize: 8, color: "#7a8e8a",
                textTransform: "uppercase", letterSpacing: "0.22em", lineHeight: 1,
              }}>FOOD INTELLIGENCE · V2</div>
            </div>
          </div>

          {/* Desktop nav links */}
          <nav className="dr-desktop-nav" style={{ marginLeft: 16 }}>
            {[
              { label: "HOME",      action: () => router.push("/") },
              { label: "FAVORITES", action: () => onFavsClick?.() },
              { label: "LISTS",     action: () => router.push("/dashboard/lists") },
              { label: "ABOUT",     action: () => router.push("/about") },
              { label: "HELP",      action: () => router.push("/help") },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 10, letterSpacing: "0.16em",
                  color: secondary, padding: "6px 10px", borderRadius: 6,
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.background = "rgba(127,227,200,0.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = secondary; e.currentTarget.style.background = "none"; }}
              >{item.label}</button>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

            {/* Sign In CTA (when not signed in) / Account indicator (when signed in) */}
            {user ? (
              <button
                onClick={() => { setShowNav(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: accentLight, border: `1px solid ${accentBorder}`,
                  borderRadius: 20, padding: "5px 12px",
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                  letterSpacing: "0.10em", color: accent, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#24433e"; }}
                onMouseLeave={e => { e.currentTarget.style.background = accentLight; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="dr-signin-label">ACCOUNT</span>
              </button>
            ) : (
              <button
                onClick={() => router.push("/auth/signin")}
                style={{
                  background: "#3d6b62", border: "1px solid #4d8377",
                  borderRadius: 20, padding: "5px 14px",
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                  letterSpacing: "0.10em", color: "#eafaf4", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#4d8377"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#3d6b62"; }}
              >
                <span className="dr-signin-label">SIGN IN</span>
                <span style={{ display: "none" }} className="dr-mobile-icon">→</span>
              </button>
            )}

            {/* Text size button — cycles Normal → Large → X-Large */}
            {onFontSz && (() => {
              const sizes: FontSize[] = ["normal", "large", "xl"];
              const labels: Record<FontSize, string> = { normal: "A", large: "A", xl: "A" };
              const pxMap: Record<FontSize, number> = { normal: 13, large: 15, xl: 17 };
              const isActive = fontSz !== "normal";
              return (
                <button
                  onClick={() => onFontSz(sizes[(sizes.indexOf(fontSz) + 1) % sizes.length])}
                  title={`Text size: ${fontSz === "normal" ? "Normal" : fontSz === "large" ? "Large" : "X-Large"} (click to cycle)`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: 28, minWidth: 32, padding: "0 7px", borderRadius: 6,
                    background: isActive ? accentLight : "transparent",
                    border: `1px solid ${isActive ? accentBorder : borderStrong}`,
                    color: isActive ? accent : secondary,
                    cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
                    fontFamily: "'IBM Plex Mono','Courier New',monospace",
                    fontSize: pxMap[fontSz], fontWeight: 700, lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? accentBorder : borderStrong; e.currentTarget.style.color = isActive ? accent : secondary; }}
                >{labels[fontSz]}</button>
              );
            })()}

            {/* ONLINE indicator (replaces dark mode toggle) */}
            <span style={{
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#3fd98a",
              letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fd98a", display: "inline-block" }} />
              ONLINE
            </span>

            {/* Hamburger */}
            <button
              onClick={() => setShowNav(true)}
              aria-label="Open navigation"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: "transparent", border: `1px solid ${borderStrong}`,
                color: secondary, cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = secondary; e.currentTarget.style.borderColor = borderStrong; }}
            ><HamburgerIcon /></button>
          </div>
        </div>
      </header>

      {/* ── Nav panel backdrop ─────────────────────────────────────────────── */}
      <div
        onClick={() => setShowNav(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 9800, opacity: showNav ? 1 : 0, pointerEvents: showNav ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* ── Nav panel — dark teal ─────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
        background: "#10211e",
        borderLeft: "1px solid #2c4a44",
        zIndex: 9900,
        transform: showNav ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-out",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 16px", borderBottom: "1px solid #2c4a44",
        }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono','Courier New',monospace",
              fontSize: "1rem", fontWeight: 700, color: "#7fe3c8",
              letterSpacing: "0.26em", lineHeight: 1,
            }}>DISH REPORT</div>
            <div style={{
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 8, color: "#5f857d",
              letterSpacing: "0.28em", textTransform: "uppercase", marginTop: 4,
            }}>NAVIGATION</div>
          </div>
          <button
            onClick={() => setShowNav(false)}
            style={{
              background: "none", border: "1px solid #2c4a44", borderRadius: 8,
              color: "#8aa9a2", cursor: "pointer", width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#7fe3c8"; e.currentTarget.style.borderColor = "#7fe3c8"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#8aa9a2"; e.currentTarget.style.borderColor = "#2c4a44"; }}
          ><XIcon /></button>
        </div>

        {/* User info */}
        {user && (
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid #2c4a44",
            fontFamily: "'IBM Plex Mono',monospace",
          }}>
            <div style={{ fontSize: 8, color: "#5f857d", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4 }}>
              SIGNED IN AS
            </div>
            <div style={{ fontSize: "0.8rem", color: "#d4e4df", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
            </div>
          </div>
        )}

        {/* Text size picker */}
        {onFontSz && (
          <div style={{ padding: "14px 20px 16px", borderBottom: "1px solid #1a2e28" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#5f857d", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 10 }}>
              TEXT SIZE
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["normal", "large", "xl"] as const).map((s, idx) => (
                <button
                  key={s}
                  onClick={() => onFontSz(s)}
                  style={{
                    flex: 1, padding: "10px 4px", borderRadius: 6, cursor: "pointer",
                    background: fontSz === s ? "#3d6b62" : "#1b332e",
                    border: `1px solid ${fontSz === s ? "#4d8377" : "#2c4a44"}`,
                    color: fontSz === s ? "#eafaf4" : "#8aa9a2",
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: [13, 16, 19][idx], fontWeight: 700, lineHeight: 1,
                    transition: "all 0.15s", textAlign: "center",
                  }}
                >A</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
              {["Normal", "Large", "X-Large"].map(label => (
                <div key={label} style={{ flex: 1, textAlign: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#5f857d", letterSpacing: "0.06em" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                width: "100%", background: "none", border: "none",
                padding: "14px 20px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid #111",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1b332e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono','Courier New',monospace",
                  fontSize: "0.8rem", fontWeight: 500, color: "#f0f4f1",
                  letterSpacing: "0.06em", marginBottom: 2,
                }}>{item.label}</div>
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 9, color: "#5f857d", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}>{item.sub}</div>
              </div>
              <ChevronRightNav />
            </button>
          ))}
        </nav>

        {/* Sign in / out */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #2c4a44" }}>
          {user ? (
            <button
              onClick={() => { setShowNav(false); onSignOut(); }}
              style={{
                width: "100%", background: "none",
                border: "1px solid rgba(214,69,69,0.35)",
                borderRadius: 8, padding: "12px",
                color: "#d64545", cursor: "pointer",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 10, letterSpacing: "0.22em",
                textTransform: "uppercase", transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(214,69,69,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >SIGN OUT</button>
          ) : (
            <button
              onClick={() => { setShowNav(false); router.push("/auth/signin"); }}
              style={{
                width: "100%", background: "#3d6b62",
                border: "1px solid #4d8377", borderRadius: 8, padding: "12px",
                color: "#eafaf4", cursor: "pointer",
                fontFamily: "'IBM Plex Mono','Courier New',monospace",
                fontSize: "0.8rem", fontWeight: 700,
                letterSpacing: "0.14em", transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4d8377"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#3d6b62"; }}
            >SIGN IN</button>
          )}
        </div>

        {/* Panel footer */}
        <div style={{
          padding: "10px 20px 20px",
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: 8, color: "#2c4a44", letterSpacing: "0.2em",
          textTransform: "uppercase", textAlign: "center",
        }}>
          SYS v1.4.0 // FOOD INTELLIGENCE
        </div>
      </div>
    </>
  );
}
