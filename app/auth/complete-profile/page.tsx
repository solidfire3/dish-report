'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const AGE_RANGES = ["Under 25", "25-34", "35-44", "45-54", "55 and over"] as const;

export default function CompleteProfilePage() {
  const [fullName,  setFullName]  = useState("");
  const [city,      setCity]      = useState("");
  const [ageRange,  setAgeRange]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required."); return; }
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/signin"); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim(),
      city: city.trim() || null,
      age_range: ageRange || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/");
  };

  const inputStyle = {
    width: "100%", background: "#FFFFFF",
    border: "1.5px solid #E8E3DC",
    borderRadius: 8, padding: "11px 14px",
    color: "#1C1917", fontFamily: "'Inter', sans-serif",
    fontSize: "1rem", outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const labelStyle = {
    display: "block" as const, marginBottom: 6,
    fontFamily: "'Inter', sans-serif", fontSize: "0.8rem",
    fontWeight: 600 as const, color: "#6B6560",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
  };

  return (
    <div style={{
      background: "#F7F4F0", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2rem", fontWeight: 700, color: "#C8860A", marginBottom: 8,
          }}>Dish Report</div>
          <div style={{ fontSize: "0.875rem", color: "#6B6560" }}>
            One more step before you start exploring.
          </div>
        </div>

        <div style={{
          background: "#FFFFFF", border: "1px solid #E8E3DC", borderRadius: 12,
          padding: "28px 24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: "1.25rem",
            fontWeight: 700, color: "#1C1917", marginBottom: 4,
          }}>Tell us about yourself</div>
          <div style={{ fontSize: "0.875rem", color: "#6B6560", marginBottom: 24, lineHeight: 1.5 }}>
            This helps us personalize your results.
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Full name */}
            <div>
              <label style={labelStyle}>Full name <span style={{ color: "#C8860A" }}>*</span></label>
              <input
                type="text" value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Parker Fessier"
                autoFocus
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#C8860A"; e.currentTarget.style.boxShadow = "0 0 0 3px #FDF3E3"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#E8E3DC"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* City */}
            <div>
              <label style={labelStyle}>City</label>
              <input
                type="text" value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. San Diego"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#C8860A"; e.currentTarget.style.boxShadow = "0 0 0 3px #FDF3E3"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#E8E3DC"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* Age range */}
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
                onFocus={e => { e.currentTarget.style.borderColor = "#C8860A"; e.currentTarget.style.boxShadow = "0 0 0 3px #FDF3E3"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#E8E3DC"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <option value="">Select age range...</option>
                {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {error && (
              <div style={{
                fontSize: "0.8rem", color: "#991B1B",
                background: "#FEF2F2", border: "1px solid #FECACA",
                borderRadius: 8, padding: "10px 14px",
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              style={{
                background: "#C8860A", border: "none", borderRadius: 10,
                color: "#FFFFFF", fontFamily: "'Inter', sans-serif",
                fontSize: "1rem", fontWeight: 600, padding: "15px",
                cursor: loading || !fullName.trim() ? "not-allowed" : "pointer",
                opacity: loading || !fullName.trim() ? 0.5 : 1,
                transition: "background 0.15s, opacity 0.15s",
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading && fullName.trim()) e.currentTarget.style.background = "#A86E08"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#C8860A"; }}
            >
              {loading ? "Saving..." : "Continue to Dish Report"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
