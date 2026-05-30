'use client';
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1"    x2="12" y2="3"    />
    <line x1="12" y1="21"   x2="12" y2="23"   />
    <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"  />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1"  y1="12" x2="3"  y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
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

// ─── BACK BUTTON ─────────────────────────────────────────────────────────────
// dark defaults to false so existing page.tsx usage stays compatible
export function BackBtn({ onBack, dark = false }: { onBack: () => void; dark?: boolean }) {
  const borderColor  = dark ? "#3A3A3A" : "#D4CBC0";
  const color        = dark ? "#9A9390" : "#6B6560";
  const accentColor  = dark ? "#FFB800" : "#C8860A";

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
      onMouseEnter={e => {
        e.currentTarget.style.color = accentColor;
        e.currentTarget.style.borderColor = accentColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = color;
        e.currentTarget.style.borderColor = borderColor;
      }}
    >
      <ChevronLeftIcon />
    </button>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
type HeaderProps = {
  user: User | null;
  onSignOut: () => void;
  hasBack?: boolean;
  onBack?: () => void;
  // Controlled dark mode — when provided, page.tsx owns dark state
  dark?: boolean;
  onToggleDark?: () => void;
  // Legacy props kept so existing call sites compile unchanged
  favCount?: number;
  onFavsClick?: () => void;
};

export function Header({ user, onSignOut, hasBack, onBack, dark: darkProp, onToggleDark: onToggleDarkProp }: HeaderProps) {
  const router = useRouter();

  // Uncontrolled fallback — used when page.tsx doesn't pass dark/onToggleDark
  const [internalDark, setInternalDark] = useState(false);
  useEffect(() => {
    if (darkProp === undefined && localStorage.getItem("dr-dark") === "1") setInternalDark(true);
  }, [darkProp]);

  const dark = darkProp !== undefined ? darkProp : internalDark;

  const toggleDark = () => {
    if (onToggleDarkProp) {
      onToggleDarkProp();
    } else {
      setInternalDark(v => {
        const next = !v;
        localStorage.setItem("dr-dark", next ? "1" : "0");
        return next;
      });
    }
  };

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Theme values ────────────────────────────────────────────────────────────
  const bg          = dark ? "#1A1A1A" : "#F7F4F0";
  const border      = dark ? "#2C2C2C" : "#E8E3DC";
  const borderStrong = dark ? "#3A3A3A" : "#D4CBC0";
  const text        = dark ? "#F0EDE8" : "#1C1917";
  const secondary   = dark ? "#9A9390" : "#6B6560";
  const tertiary    = dark ? "#6B6866" : "#A89F99";
  const accent      = dark ? "#FFB800" : "#C8860A";
  const accentLight = dark ? "#2A2010" : "#FDF3E3";
  const accentBorder = dark ? "#4A3810" : "#F0D5A0";
  const inputBg     = dark ? "#232323" : "#FFFFFF";
  const inputBorder = dark ? "#3A3A3A" : "#E8E3DC";
  const shadow      = dark
    ? "0 1px 3px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.20)"
    : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)";

  // ── Compressed search bar preview (placeholder only) ────────────────────────
  const SearchPreview = (
    <div
      aria-hidden="true"
      style={{
        display: "flex", alignItems: "center", gap: 8, flex: 1,
        background: inputBg, border: `1.5px solid ${inputBorder}`,
        borderRadius: 10, height: 38, padding: "0 14px",
        cursor: "text", maxWidth: 520,
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.30)"
          : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <span style={{ color: tertiary, display: "flex", flexShrink: 0 }}>
        <SearchIcon />
      </span>
      <span style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: "0.9rem", fontWeight: 400,
        color: dark ? "#4A4846" : "#C8C2BC",
        userSelect: "none", letterSpacing: "0.01em",
        whiteSpace: "nowrap", overflow: "hidden",
      }}>
        Search a dish, cuisine, or restaurant...
      </span>
    </div>
  );

  // ── Right-side controls ──────────────────────────────────────────────────────
  const RightControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Light mode" : "Dark mode"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "transparent", border: `1px solid ${borderStrong}`,
          color: secondary, cursor: "pointer",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = accent;
          e.currentTarget.style.borderColor = accent;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = secondary;
          e.currentTarget.style.borderColor = borderStrong;
        }}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* User area */}
      {user ? (
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(v => !v)}
            aria-label="Account menu"
            style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: accentLight, border: `1.5px solid ${accentBorder}`,
              color: accent, fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {(user.email?.[0] || "U").toUpperCase()}
          </button>

          {showMenu && (
            <div style={{
              position: "absolute", top: 44, right: 0, zIndex: 200,
              background: bg, border: `1px solid ${border}`,
              borderRadius: 10, width: 208, overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)",
            }}>
              <div style={{
                padding: "10px 14px", borderBottom: `1px solid ${border}`,
                fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: secondary,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{user.email}</div>

              {([
                ["My Searches", "/dashboard/searches"],
                ["My Lists",    "/dashboard/lists"],
              ] as [string, string][]).map(([label, href]) => (
                <button
                  key={href}
                  onClick={() => { setShowMenu(false); router.push(href); }}
                  style={{
                    width: "100%", background: "none", border: "none",
                    borderBottom: `1px solid ${border}`,
                    padding: "11px 14px", cursor: "pointer", color: text,
                    fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                    textAlign: "left", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? "#232323" : "#F7F4F0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                >{label}</button>
              ))}

              <button
                onClick={() => { setShowMenu(false); onSignOut(); }}
                style={{
                  width: "100%", background: "none", border: "none",
                  padding: "11px 14px", cursor: "pointer",
                  color: dark ? "#EF4444" : "#991B1B",
                  fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
                  textAlign: "left", transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? "#2D1B1B" : "#FEF2F2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >Sign Out</button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => router.push("/auth/signin")}
          style={{
            height: 36, padding: "0 16px", flexShrink: 0,
            background: "transparent", border: `1.5px solid ${borderStrong}`,
            borderRadius: 8, color: text, cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 500,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = borderStrong; e.currentTarget.style.color = text; }}
        >Sign In</button>
      )}
    </div>
  );

  return (
    <header style={{
      background: bg,
      borderBottom: `1px solid ${border}`,
      boxShadow: shadow,
      position: "sticky", top: 0, zIndex: 100,
      width: "100%",
    }}>
      {/*
        Responsive layout:
        Desktop (>640px): single 56px row — [back?][wordmark][search flex][controls]
        Mobile (≤640px):  row 1 52px — [back?][wordmark][controls]
                          row 2 — [search bar full width]
      */}
      <style>{`
        .dr-row1 {
          display: flex; align-items: center; gap: 12px;
          padding: 0 16px; height: 56px;
        }
        .dr-search-center {
          display: flex; flex: 1; justify-content: center; padding: 0 16px;
        }
        .dr-row2 { display: none; }

        @media (max-width: 640px) {
          .dr-row1 { height: 52px; }
          .dr-search-center { display: none; }
          .dr-row2 {
            display: flex; padding: 0 16px 10px;
          }
        }
      `}</style>

      {/* Row 1 */}
      <div className="dr-row1">
        {hasBack && onBack && <BackBtn onBack={onBack} dark={dark} />}

        {/* Wordmark */}
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.3rem", fontWeight: 700,
          color: accent, lineHeight: 1, flexShrink: 0,
          letterSpacing: "0.01em", userSelect: "none",
        }}>
          Dish Report
        </div>

        {/* Center search bar — desktop only */}
        <div className="dr-search-center">
          {SearchPreview}
        </div>

        {/* Right controls — always visible */}
        {RightControls}
      </div>

      {/* Row 2 — mobile search bar */}
      <div className="dr-row2">
        {SearchPreview}
      </div>
    </header>
  );
}
