'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { persistFontSize, type FontSize } from "@/lib/font-scale";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const AGE_RANGES = ["Under 25", "25-34", "35-44", "45-54", "55 and over"] as const;

const CUISINES = [
  "American", "Mexican", "Japanese", "Italian", "Korean", "Chinese",
  "Thai", "Vietnamese", "Indian", "Mediterranean", "BBQ", "Seafood",
  "Pizza", "Burgers", "Breakfast", "Desserts",
];

const DINING_STYLES = [
  "Dine-in", "Takeout", "Delivery", "Late night",
  "Brunch", "Date night", "Special occasions", "Quick lunch",
];

const GROUP_SIZES = ["Solo", "Couple", "Small group (3–4)", "Large group (5+)"];

const PRICE_OPTIONS = ["Under $15", "$15–30", "$30–60", "$60+"];

const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string; description: string }> = [
  { value: "normal",  label: "Normal",   description: "Default" },
  { value: "large",   label: "Large",    description: "Comfortable" },
  { value: "xl",      label: "X-Large",  description: "Easiest to read" },
];

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 4,
  fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
  fontWeight: 600, color: "#7a8e8a",
  textTransform: "uppercase", letterSpacing: "0.08em",
};

const subtextStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
  color: "#8aa9a2", marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#10211e",
  border: "1.5px solid #2c4a44", borderRadius: 8,
  padding: "11px 14px", color: "#f0f4f1",
  fontFamily: "'Inter', sans-serif", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #E8E3DC", margin: "4px 0",
};

// ─── PILL COMPONENTS ─────────────────────────────────────────────────────────

function MultiPill({
  label, selected, onToggle,
}: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        padding: "9px 16px", minHeight: 44,
        borderRadius: 24, cursor: "pointer",
        fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
        fontWeight: selected ? 600 : 400,
        border: `1.5px solid ${selected ? "#3d6b62" : "#2c4a44"}`,
        background: selected ? "#3d6b62" : "#10211e",
        color: selected ? "#10211e" : "#7a8e8a",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#b9c4bf";
          e.currentTarget.style.color = "#23413b";
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#2c4a44";
          e.currentTarget.style.color = "#7a8e8a";
        }
      }}
    >{label}</button>
  );
}

function SinglePill({
  label, selected, onSelect,
}: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        padding: "9px 16px", minHeight: 44,
        borderRadius: 24, cursor: "pointer",
        fontFamily: "'Inter', sans-serif", fontSize: "0.875rem",
        fontWeight: selected ? 600 : 400,
        border: `1.5px solid ${selected ? "#3d6b62" : "#2c4a44"}`,
        background: selected ? "#3d6b62" : "#10211e",
        color: selected ? "#10211e" : "#7a8e8a",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#b9c4bf";
          e.currentTarget.style.color = "#23413b";
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = "#2c4a44";
          e.currentTarget.style.color = "#7a8e8a";
        }
      }}
    >{label}</button>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function CompleteProfilePage() {
  const [fullName,         setFullName]         = useState("");
  const [city,             setCity]             = useState("");
  const [ageRange,         setAgeRange]         = useState("");
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  const [diningStyle,      setDiningStyle]      = useState<string[]>([]);
  const [typicalGroupSize, setTypicalGroupSize] = useState("");
  const [pricePreference,  setPricePreference]  = useState("");
  const [fontSizePref,     setFontSizePref]     = useState<FontSize>("normal");
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/auth/signin");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMulti = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required."); return; }
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/signin"); return; }
    const { error } = await supabase.from("profiles").upsert({
      id:                   user.id,
      full_name:            fullName.trim(),
      city:                 city.trim() || null,
      age_range:            ageRange || null,
      favorite_cuisines:    favoriteCuisines.length ? favoriteCuisines : null,
      dining_style:         diningStyle.length ? diningStyle : null,
      typical_group_size:   typicalGroupSize || null,
      price_preference:     pricePreference || null,
    }, { onConflict: 'id' });
    // Save font-size to user metadata (no schema change needed) + localStorage
    if (fontSizePref !== "normal") {
      persistFontSize(fontSizePref);
      await supabase.auth.updateUser({ data: { font_size: fontSizePref } }).catch(() => {});
    }
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/");
  };

  return (
    <div style={{
      background: "#e8ece8", minHeight: "100vh",
      padding: "40px 16px 60px",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2rem", fontWeight: 700, color: "#3d6b62", marginBottom: 8,
          }}>Dish Report</div>
          <div style={{ fontSize: "0.875rem", color: "#7a8e8a" }}>
            Tell us a bit about yourself so we can sharpen your results.
          </div>
        </div>

        <div style={{
          background: "#10211e", border: "1px solid #E8E3DC", borderRadius: 12,
          padding: "28px 24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: "1.25rem",
            fontWeight: 700, color: "#f0f4f1", marginBottom: 4,
          }}>Your profile</div>
          <div style={{ fontSize: "0.875rem", color: "#7a8e8a", marginBottom: 28, lineHeight: 1.5 }}>
            All fields except your name are optional.
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── Full name ──────────────────────────────────────────── */}
            <div>
              <label style={labelStyle}>
                Full name <span style={{ color: "#3d6b62" }}>*</span>
              </label>
              <input
                type="text" value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Parker Fessier"
                autoFocus
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#7fe3c8"; e.currentTarget.style.boxShadow = "0 0 0 3px #1b332e"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#2c4a44"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* ── City ───────────────────────────────────────────────── */}
            <div>
              <label style={labelStyle}>City</label>
              <input
                type="text" value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. San Diego"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#7fe3c8"; e.currentTarget.style.boxShadow = "0 0 0 3px #1b332e"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#2c4a44"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* ── Age range ──────────────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Age range</label>
              <select
                value={ageRange}
                onChange={e => setAgeRange(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: "none" as const,
                  background: `#FFFFFF url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B6560' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center`,
                  cursor: "pointer",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#7fe3c8"; e.currentTarget.style.boxShadow = "0 0 0 3px #1b332e"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#2c4a44"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <option value="">Select age range...</option>
                {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={divider} />

            {/* ── Favorite cuisines ──────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Favorite cuisines</label>
              <p style={subtextStyle}>Select all that apply</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CUISINES.map(c => (
                  <MultiPill
                    key={c} label={c}
                    selected={favoriteCuisines.includes(c)}
                    onToggle={() => toggleMulti(favoriteCuisines, setFavoriteCuisines, c)}
                  />
                ))}
              </div>
            </div>

            <div style={divider} />

            {/* ── Dining style ───────────────────────────────────────── */}
            <div>
              <label style={labelStyle}>How do you usually eat?</label>
              <p style={subtextStyle}>Select all that apply</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DINING_STYLES.map(s => (
                  <MultiPill
                    key={s} label={s}
                    selected={diningStyle.includes(s)}
                    onToggle={() => toggleMulti(diningStyle, setDiningStyle, s)}
                  />
                ))}
              </div>
            </div>

            <div style={divider} />

            {/* ── Typical group size ─────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Usually dining with</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {GROUP_SIZES.map(g => (
                  <SinglePill
                    key={g} label={g}
                    selected={typicalGroupSize === g}
                    onSelect={() => setTypicalGroupSize(typicalGroupSize === g ? "" : g)}
                  />
                ))}
              </div>
            </div>

            <div style={divider} />

            {/* ── Price preference ───────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Typical budget per person</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 10 }}>
                {PRICE_OPTIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPricePreference(pricePreference === p ? "" : p)}
                    style={{
                      padding: "11px 4px", minHeight: 44,
                      borderRadius: 8, cursor: "pointer",
                      fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
                      fontWeight: pricePreference === p ? 600 : 400,
                      border: `1.5px solid ${pricePreference === p ? "#3d6b62" : "#2c4a44"}`,
                      background: pricePreference === p ? "#3d6b62" : "#10211e",
                      color: pricePreference === p ? "#10211e" : "#7a8e8a",
                      transition: "all 0.15s",
                      textAlign: "center",
                    }}
                    onMouseEnter={e => {
                      if (pricePreference !== p) {
                        e.currentTarget.style.borderColor = "#b9c4bf";
                        e.currentTarget.style.color = "#23413b";
                      }
                    }}
                    onMouseLeave={e => {
                      if (pricePreference !== p) {
                        e.currentTarget.style.borderColor = "#2c4a44";
                        e.currentTarget.style.color = "#7a8e8a";
                      }
                    }}
                  >{p}</button>
                ))}
              </div>
            </div>

            <div style={divider} />

            {/* ── Text size ──────────────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Preferred text size</label>
              <p style={subtextStyle}>You can change this anytime from the app header</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 4 }}>
                {FONT_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFontSizePref(opt.value)}
                    style={{
                      padding: "12px 8px", minHeight: 64,
                      borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${fontSizePref === opt.value ? "#3d6b62" : "#2c4a44"}`,
                      background: fontSizePref === opt.value ? "#3d6b62" : "#10211e",
                      color: fontSizePref === opt.value ? "#eafaf4" : "#7a8e8a",
                      transition: "all 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}
                  >
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: opt.value === "xl" ? 20 : opt.value === "large" ? 16 : 13, lineHeight: 1 }}>A</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.08em" }}>{opt.label}</span>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, opacity: 0.7 }}>{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────── */}
            {error && (
              <div style={{
                fontSize: "0.8rem", color: "#d64545",
                background: "#FEF2F2", border: "1px solid #FECACA",
                borderRadius: 8, padding: "10px 14px",
              }}>{error}</div>
            )}

            {/* ── Submit ─────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              style={{
                background: "#3d6b62", border: "none", borderRadius: 10,
                color: "#eafaf4", fontFamily: "'Inter', sans-serif",
                fontSize: "1rem", fontWeight: 600, padding: "15px",
                cursor: loading || !fullName.trim() ? "not-allowed" : "pointer",
                opacity: loading || !fullName.trim() ? 0.5 : 1,
                transition: "background 0.15s, opacity 0.15s",
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading && fullName.trim()) e.currentTarget.style.background = "#5ccfb0"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#3d6b62"; }}
            >
              {loading ? "Saving..." : "Continue to Dish Report"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
