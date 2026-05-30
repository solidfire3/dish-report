'use client';
import { T } from "@/lib/dish-shared";

const RADII = [2, 5, 10, 25];

type Props = {
  locMode: string;
  onLocModeChange: (m: string) => void;
  city: string;
  onCityChange: (c: string) => void;
  area: string;
  onAreaChange: (a: string) => void;
  radius: number;
  onRadiusChange: (r: number) => void;
};

export function SearchFilters({
  locMode, onLocModeChange, city, onCityChange, area, onAreaChange, radius, onRadiusChange,
}: Props) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8, marginBottom: 13,
      background: T.card2, border: `1px solid ${T.border}`,
      borderRadius: 7, padding: "10px 12px",
    }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", border: `1.5px solid ${T.border2}`, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
          {["city", "area"].map(m => (
            <button
              key={m}
              onClick={() => onLocModeChange(m)}
              style={{
                background: locMode === m ? T.neon : T.card2,
                border: "none",
                color: locMode === m ? "#000" : T.dim,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "0.48rem", letterSpacing: 2, textTransform: "uppercase",
                padding: "7px 10px", cursor: "pointer",
                borderRight: m === "city" ? `1px solid ${T.border2}` : "none",
                fontWeight: locMode === m ? 700 : 400,
              }}
            >{m === "city" ? "City" : "By Area"}</button>
          ))}
        </div>

        {locMode === "city" ? (
          <input
            className="inp"
            style={{ flex: 1 }}
            placeholder="San Diego"
            value={city}
            onChange={e => onCityChange(e.target.value)}
          />
        ) : (
          <input
            className="inp"
            style={{ flex: 1 }}
            placeholder="Burbank, North Park, Silver Lake..."
            value={area}
            onChange={e => onAreaChange(e.target.value)}
          />
        )}
      </div>

      {locMode === "area" && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.42rem",
            letterSpacing: 2, color: T.dim, textTransform: "uppercase",
          }}>Within</span>
          {RADII.map(r => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              style={{
                border: `1.5px solid ${radius === r ? T.neon : T.border2}`,
                background: radius === r ? `${T.neon}18` : T.card2,
                color: radius === r ? T.neon : T.dim,
                fontFamily: "'IBM Plex Mono',monospace", fontSize: "0.54rem",
                padding: "4px 9px", cursor: "pointer", borderRadius: 20,
                fontWeight: radius === r ? 700 : 400,
                boxShadow: radius === r ? `0 0 6px ${T.neon}44` : "none",
              }}
            >{r} mi</button>
          ))}
        </div>
      )}
    </div>
  );
}
