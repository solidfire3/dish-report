'use client';
import { useState } from "react";
import { CUISINE_EXPLORER } from "@/lib/cuisine-explorer";

// Light card palette — home / browse surfaces (not result cards)
const LC_BG    = "#dde6e2";
const LC_BDR   = "#b9c7c1";
const LC_TEXT  = "#1c3b35";
const LC_CHIP  = "#eef3f0";
const LC_MUTED = "#4a6962";

type Props = {
  onDishSelect:   (dish: string) => void;
  onSearchNow?:   (term: string | null) => void;
};

function trunc(s: string, max = 17): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function CuisineExplorer({ onDishSelect, onSearchNow }: Props) {
  const [region,  setRegion]  = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);

  const regionData  = CUISINE_EXPLORER.find(r => r.label === region);
  const cuisineData = regionData?.cuisines.find(c => c.label === cuisine);

  const chipBase: React.CSSProperties = {
    border: `1px solid ${LC_BDR}`,
    borderRadius: 20,
    padding: "0 14px", height: 32,
    fontFamily: "'IBM Plex Mono','Courier New',monospace",
    fontSize: "0.6875rem", letterSpacing: "0.08em",
    cursor: "pointer", whiteSpace: "nowrap",
    transition: "background 0.12s, color 0.12s, border-color 0.12s",
    display: "inline-flex", alignItems: "center",
  };

  const Chip = ({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        ...chipBase,
        background: active ? LC_TEXT  : LC_CHIP,
        color:      active ? LC_BG    : LC_TEXT,
        borderColor: active ? LC_TEXT : LC_BDR,
        fontWeight: active ? 700 : 400,
      }}
      onMouseEnter={e => {
        if (!active) { e.currentTarget.style.background = LC_BG; e.currentTarget.style.borderColor = LC_TEXT; }
      }}
      onMouseLeave={e => {
        if (!active) { e.currentTarget.style.background = LC_CHIP; e.currentTarget.style.borderColor = LC_BDR; }
      }}
    >{label}</button>
  );

  const DishChip = ({ label }: { label: string }) => (
    <button
      onClick={() => onDishSelect(label)}
      style={{ ...chipBase, background: LC_BG, color: LC_TEXT, borderColor: LC_TEXT, fontWeight: 500, gap: 6 }}
      onMouseEnter={e => { e.currentTarget.style.background = LC_TEXT; e.currentTarget.style.color = LC_BG; }}
      onMouseLeave={e => { e.currentTarget.style.background = LC_BG; e.currentTarget.style.color = LC_TEXT; }}
    >
      {label}
      <span style={{ opacity: 0.55, fontSize: "0.6rem" }}>→</span>
    </button>
  );

  const StartOver = ({ onClick, label = "Start over" }: { onClick: () => void; label?: string }) => (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.625rem",
        letterSpacing: "0.10em", color: LC_MUTED,
        textDecoration: "underline", textUnderlineOffset: 3, padding: "2px 0",
      }}
    >{label}</button>
  );

  // SEARCH NOW button — always visible at bottom of explorer
  const searchNowLabel = cuisine
    ? `SEARCH ${trunc(cuisine.toUpperCase())}`
    : region
      ? `SEARCH ${trunc(region.toUpperCase())}`
      : "OPEN SEARCH";

  const SearchNow = () => (
    <button
      onClick={() => onSearchNow?.(cuisine || region || null)}
      style={{
        background: LC_TEXT, border: `1px solid ${LC_TEXT}`,
        borderRadius: 6, padding: "7px 14px",
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: "0.625rem", fontWeight: 700,
        color: LC_BG, letterSpacing: "0.12em",
        textTransform: "uppercase", cursor: "pointer",
        transition: "opacity 0.12s",
        whiteSpace: "nowrap",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
    >
      {searchNowLabel}
      <span style={{ fontSize: "0.55rem", opacity: 0.7 }}>→</span>
    </button>
  );

  return (
    <div style={{ background: LC_BG, border: `1px solid ${LC_BDR}`, borderRadius: 12, padding: "18px 16px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "0.75rem", fontWeight: 700,
          color: LC_TEXT, letterSpacing: "0.12em",
          textTransform: "uppercase", marginBottom: 4,
        }}>WHAT ARE YOU IN THE MOOD FOR?</div>
        <div style={{
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "0.5625rem", color: LC_MUTED,
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>
          {cuisine
            ? `${region} → ${cuisine} → dish`
            : region
              ? `${region} → cuisine`
              : "Region → cuisine → dish"}
        </div>
      </div>

      {/* Level 1 — regions */}
      {!region && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {CUISINE_EXPLORER.map(r => (
            <Chip key={r.label} label={r.label} onClick={() => setRegion(r.label)} />
          ))}
        </div>
      )}

      {/* Level 2 — cuisines within region */}
      {region && !cuisine && regionData && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {regionData.cuisines.map(c => (
              <Chip key={c.label} label={c.label} onClick={() => setCuisine(c.label)} />
            ))}
          </div>
          <StartOver onClick={() => { setRegion(null); setCuisine(null); }} />
        </>
      )}

      {/* Level 3 — dishes within cuisine */}
      {cuisine && cuisineData && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {cuisineData.dishes.map(d => (
              <DishChip key={d} label={d} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <StartOver label="← Back" onClick={() => setCuisine(null)} />
            <StartOver label="Start over" onClick={() => { setRegion(null); setCuisine(null); }} />
          </div>
        </>
      )}

      {/* SEARCH NOW — persistent escape at every level */}
      <div style={{
        marginTop: 14,
        display: "flex", justifyContent: "flex-end",
        borderTop: `1px solid ${LC_BDR}`, paddingTop: 12,
      }}>
        <SearchNow />
      </div>
    </div>
  );
}
