'use client';
import { useEffect, useState } from "react";

export type BackgroundBannerProps = {
  dish:          string;
  isReady:       boolean;
  onTap:         () => void;
  onCancel:      () => void;
  queuedLabel?:  string;   // short label of the queued search, if any
};

const CSS = `
  @keyframes bgb-in      { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes bgb-dot     { 0%,100%{opacity:0.3;transform:scale(0.75)} 50%{opacity:1;transform:scale(1)} }
  @keyframes bgb-glow    { 0%,100%{box-shadow:0 -3px 18px rgba(63,217,138,0.18),inset 0 1px 0 rgba(63,217,138,0.08)} 50%{box-shadow:0 -8px 40px rgba(63,217,138,0.48),inset 0 1px 0 rgba(63,217,138,0.15)} }
  @keyframes bgb-bounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
  @keyframes bgb-shimmer { 0%{opacity:0.7} 50%{opacity:1} 100%{opacity:0.7} }
`;

const CANCEL_STYLE: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  padding: "0 16px 0 12px",
  minWidth: 44, minHeight: 44,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};

export function BackgroundBanner({ dish, isReady, onTap, onCancel, queuedLabel }: BackgroundBannerProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t); }, []);

  const label = (dish || "SEARCH").toUpperCase().slice(0, 26);

  return (
    <>
      <style>{CSS}</style>

      {isReady ? (
        /* ── READY — green glow, begging to be tapped ─────────────────────── */
        <div
          role="button" tabIndex={0}
          onClick={onTap}
          onKeyDown={e => e.key === "Enter" && onTap()}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 8500,
            background: "#0f2920",
            borderTop: "2px solid #3fd98a",
            display: "flex", alignItems: "center",
            height: 60, boxSizing: "border-box",
            cursor: "pointer",
            fontFamily: "'IBM Plex Mono','Courier New',monospace",
            animation: visible
              ? "bgb-glow 2.2s ease-in-out infinite"
              : "none",
            outline: "none",
          }}
        >
          {/* Glowing dot */}
          <div style={{
            width: 11, height: 11, borderRadius: "50%", flexShrink: 0,
            background: "#3fd98a",
            boxShadow: "0 0 8px #3fd98a, 0 0 20px rgba(63,217,138,0.45)",
            marginLeft: 18,
            animation: "bgb-bounce 1.9s ease-in-out infinite",
          }} />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, padding: "0 12px" }}>
            <div style={{
              fontSize: "0.5625rem", letterSpacing: "0.22em",
              color: "#1d9e75", marginBottom: 3,
            }}>REPORT READY</div>
            <div style={{
              fontSize: "0.75rem", letterSpacing: "0.05em", fontWeight: 600,
              color: "#3fd98a",
              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              animation: "bgb-shimmer 2.2s ease-in-out infinite",
            }}>
              {label} · TAP TO OPEN →
            </div>
          </div>

          {/* Cancel — stops propagation so it doesn't open results */}
          <button
            onClick={e => { e.stopPropagation(); onCancel(); }}
            aria-label="Cancel search"
            style={{ ...CANCEL_STYLE, color: "#1d9e75" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

      ) : (
        /* ── WORKING — dark, amber pulse, indeterminate ────────────────────── */
        <div
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 8500,
            background: "#10211e",
            borderTop: "1px solid #2c4a44",
            display: "flex", alignItems: "center",
            height: 56, boxSizing: "border-box",
            fontFamily: "'IBM Plex Mono','Courier New',monospace",
            animation: visible ? "bgb-in 0.28s cubic-bezier(0.4,0,0.2,1) both" : "none",
          }}
        >
          {/* Amber pulsing dot */}
          <div style={{
            width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
            background: "#e8b133",
            marginLeft: 18,
            animation: "bgb-dot 1.6s ease-in-out infinite",
          }} />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, padding: "0 12px" }}>
            <div style={{
              fontSize: "0.5625rem", letterSpacing: "0.22em",
              color: "#5f857d", marginBottom: 3,
            }}>
              RUNNING IN BACKGROUND{queuedLabel ? " · 1 QUEUED" : ""}
            </div>
            <div style={{
              fontSize: "0.75rem", letterSpacing: "0.05em",
              color: "#7fe3c8",
              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            }}>
              ANALYZING {label}
              {queuedLabel && <span style={{ color: "#5f857d", marginLeft: 8 }}>→ {queuedLabel.toUpperCase()}</span>}
            </div>
          </div>

          {/* Cancel */}
          <button
            onClick={onCancel}
            aria-label="Cancel search"
            style={{ ...CANCEL_STYLE, color: "#5f857d" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
