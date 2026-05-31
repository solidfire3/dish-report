'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

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
export function BackBtn({ onBack, dark = false }: { onBack: () => void; dark?: boolean }) {
  const borderColor = dark ? "#3A3A3A" : "#D4CBC0";
  const color       = dark ? "#9A9390" : "#6B6560";
  const accentColor = dark ? "#FFB800" : "#B8780A";
  return (
    <button
      onClick={onBack}
      aria-label="Go back"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: "transparent", border: `1px solid ${borderColor}`,
        color, cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = accentColor; e.currentTarget.style.borderColor = accentColor; }}
      onMouseLeave={e => { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = borderColor; }}
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
};

export function Header({
  user, onSignOut, hasBack, onBack, dark: darkProp, onToggleDark: onToggleDarkProp,
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

  // ── Theme ───────────────────────────────────────────────────────────────────
  const bg          = dark ? "#161616" : "#EDE8E0";
  const border      = dark ? "#2C2C2C" : "#D4CBC0";
  const borderStrong = dark ? "#3A3A3A" : "#C8B8A8";
  const text        = dark ? "#F0EDE8" : "#1C1917";
  const secondary   = dark ? "#9A9390" : "#6B6560";
  const tertiary    = dark ? "#6B6866" : "#A89F99";
  const accent      = dark ? "#FFB800" : "#B8780A";
  const accentLight = dark ? "#2A2010" : "#FDF3E3";
  const accentBorder = dark ? "#4A3810" : "#F0D5A0";
  const shadow      = dark
    ? "0 2px 8px rgba(0,0,0,0.40), 0 1px 3px rgba(0,0,0,0.30)"
    : "0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)";

  // ── Nav panel items ─────────────────────────────────────────────────────────
  const navItems: { label: string; sub: string; onClick: () => void }[] = [
    { label: "My Searches", sub: "Recent dish searches", onClick: () => { setShowNav(false); router.push("/dashboard/searches"); } },
    { label: "My Lists",    sub: "Saved collections",   onClick: () => { setShowNav(false); router.push("/dashboard/lists"); } },
    { label: "Favorites",   sub: "Saved spots",         onClick: () => { setShowNav(false); } },
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
        `}</style>

        <div className="dr-row1">
          {/* Back button */}
          {hasBack && onBack && <BackBtn onBack={onBack} dark={dark} />}

          {/* Brand mark */}
          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, userSelect: "none" }}>
            <div style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1.5rem", fontWeight: 900, lineHeight: 1,
              color: dark ? "#FFB800" : "#1C1917", letterSpacing: "0.04em",
              textShadow: dark ? "0 0 14px rgba(255,184,0,0.4)" : "none",
            }}>DISH REPORT</div>
            <div style={{
              height: 1, background: dark ? "#FFB800" : "#B8780A",
              opacity: dark ? 0.6 : 0.45, margin: "3px 0",
              boxShadow: dark ? "0 0 4px rgba(255,184,0,0.4)" : "none",
            }} />
            <div className="dr-brand-tagline" style={{
              fontFamily: "'Sevastopol', Georgia, serif",
              color: dark ? "rgba(255,184,0,0.7)" : "#B8780A",
              textTransform: "uppercase", letterSpacing: "0.35em", lineHeight: 1,
            }}>FOOD INTELLIGENCE</div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

            {/* Version */}
            <div style={{
              fontFamily: "'Sevastopol', Georgia, serif",
              fontSize: 9, color: tertiary, letterSpacing: "0.12em",
              userSelect: "none", whiteSpace: "nowrap",
            }}>· v1.4</div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              aria-label={dark ? "Light mode" : "Dark mode"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: "transparent", border: `1px solid ${borderStrong}`,
                color: secondary, cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = secondary; e.currentTarget.style.borderColor = borderStrong; }}
            >{dark ? <SunIcon /> : <MoonIcon />}</button>

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

      {/* ── Nav panel ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
        background: "#0A0A0A",
        borderLeft: "1px solid #2C2C2C",
        zIndex: 9900,
        transform: showNav ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-out",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 16px", borderBottom: "1px solid #1C1C1C",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-orbitron), 'Courier New', monospace",
              fontSize: "1.1rem", fontWeight: 900, color: "#FFB800",
              letterSpacing: "0.04em", lineHeight: 1,
            }}>DISH REPORT</div>
            <div style={{
              fontFamily: "'Sevastopol', Georgia, serif",
              fontSize: 8, color: "rgba(255,184,0,0.5)",
              letterSpacing: "0.3em", textTransform: "uppercase", marginTop: 4,
            }}>NAVIGATION</div>
          </div>
          <button
            onClick={() => setShowNav(false)}
            style={{
              background: "none", border: "1px solid #2C2C2C", borderRadius: 8,
              color: "#6B6866", cursor: "pointer", width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#FFB800"; e.currentTarget.style.borderColor = "#FFB800"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#6B6866"; e.currentTarget.style.borderColor = "#2C2C2C"; }}
          ><XIcon /></button>
        </div>

        {/* User info */}
        {user && (
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid #1C1C1C",
            fontFamily: "'Sevastopol', Georgia, serif",
          }}>
            <div style={{ fontSize: 8, color: "rgba(255,184,0,0.5)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4 }}>
              SIGNED IN AS
            </div>
            <div style={{ fontSize: "0.8rem", color: "#9A9390", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
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
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#161616"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{
                  fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                  fontSize: "0.75rem", fontWeight: 400, color: "#F0EDE8",
                  letterSpacing: "0.02em", marginBottom: 2,
                }}>{item.label}</div>
                <div style={{
                  fontFamily: "'Sevastopol', Georgia, serif",
                  fontSize: 9, color: "#6B6866", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}>{item.sub}</div>
              </div>
              <ChevronRightNav />
            </button>
          ))}
        </nav>

        {/* Sign in / out */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1C1C1C" }}>
          {user ? (
            <button
              onClick={() => { setShowNav(false); onSignOut(); }}
              style={{
                width: "100%", background: "none",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "12px",
                color: "#EF4444", cursor: "pointer",
                fontFamily: "'Sevastopol', Georgia, serif",
                fontSize: 10, letterSpacing: "0.2em",
                textTransform: "uppercase", transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >SIGN OUT</button>
          ) : (
            <button
              onClick={() => { setShowNav(false); router.push("/auth/signin"); }}
              style={{
                width: "100%", background: "#FFB800",
                border: "none", borderRadius: 8, padding: "12px",
                color: "#0A0A0A", cursor: "pointer",
                fontFamily: "var(--font-orbitron), 'Courier New', monospace",
                fontSize: "0.75rem", fontWeight: 700,
                letterSpacing: "0.04em", transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FFC933"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FFB800"; }}
            >SIGN IN</button>
          )}
        </div>

        {/* Panel footer */}
        <div style={{
          padding: "10px 20px 20px",
          fontFamily: "'Sevastopol', Georgia, serif",
          fontSize: 8, color: "#333", letterSpacing: "0.2em",
          textTransform: "uppercase", textAlign: "center",
        }}>
          SYS v1.4.0 // FOOD INTELLIGENCE
        </div>
      </div>
    </>
  );
}
