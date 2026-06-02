'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type ListItem = {
  id: string;
  restaurant_name: string;
  neighborhood: string | null;
  venue_type: string | null;
  price_range: string | null;
  food_score: number | null;
  cuisine: string | null;
  notes: string | null;
};

type UserList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  items?: ListItem[];
};

const scoreColor = (s: number | null) => {
  if (!s) return "#8aa9a2";
  if (s >= 8) return "#3fd98a";
  if (s >= 7) return "#e8b133";
  if (s >= 6) return "#e07b3a";
  return "#d64545";
};

export default function ListsPage() {
  const [lists, setLists]           = useState<UserList[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [saving, setSaving]         = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/signin"); return; }
      loadLists();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLists = async () => {
    const { data } = await supabase
      .from("lists")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false });
    setLists(data ?? []); setLoading(false);
  };

  const loadItems = async (listId: string) => {
    const { data } = await supabase
      .from("list_items").select("*").eq("list_id", listId)
      .order("created_at", { ascending: false });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: data ?? [] } : l));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!lists.find(l => l.id === id)?.items) loadItems(id);
  };

  const createList = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("lists")
      .insert({ name: newName.trim(), description: newDesc.trim() || null })
      .select().single();
    setSaving(false);
    if (data) {
      setLists(prev => [{ ...data, items: [] }, ...prev]);
      setNewName(""); setNewDesc(""); setCreating(false);
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm(`Delete this list?`)) return;
    await supabase.from("lists").delete().eq("id", id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const removeItem = async (listId: string, itemId: string) => {
    await supabase.from("list_items").delete().eq("id", itemId);
    setLists(prev => prev.map(l =>
      l.id === listId ? { ...l, items: l.items?.filter(i => i.id !== itemId) } : l
    ));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#10211e", border: "1.5px solid #2c4a44",
    borderRadius: 8, padding: "10px 12px", color: "#f0f4f1",
    fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ background: "#e8ece8", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{
        background: "#e8ece8", borderBottom: "1px solid #2c4a44",
        padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 56,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: "transparent", border: "1px solid #D4CBC0",
            color: "#7a8e8a", cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#7fe3c8"; e.currentTarget.style.borderColor = "#7fe3c8"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#7a8e8a"; e.currentTarget.style.borderColor = "#b9c4bf"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.2rem", fontWeight: 700, color: "#f0f4f1", flex: 1,
        }}>My Lists</div>

        <button
          onClick={() => setCreating(true)}
          style={{
            background: "#3d6b62", border: "none", borderRadius: 8,
            color: "#eafaf4", fontFamily: "'Inter', sans-serif",
            fontSize: "0.8rem", fontWeight: 600,
            padding: "8px 16px", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#5ccfb0"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#3d6b62"; }}
        >New List</button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{
          background: "#10211e", borderBottom: "1px solid #2c4a44",
          padding: "16px", display: "flex", flexDirection: "column", gap: 12,
          maxWidth: 680, margin: "0 auto",
        }}>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: "0.72rem",
            fontWeight: 600, color: "#7a8e8a",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>New List</div>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="List name" autoFocus
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = "#7fe3c8"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#2c4a44"; }}
          />
          <input
            value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = "#7fe3c8"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#2c4a44"; }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={createList}
              disabled={saving || !newName.trim()}
              style={{
                flex: 1, background: "#3d6b62", border: "none", borderRadius: 8,
                color: "#eafaf4", fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem", fontWeight: 600, padding: "11px",
                cursor: saving || !newName.trim() ? "not-allowed" : "pointer",
                opacity: saving || !newName.trim() ? 0.5 : 1,
              }}
            >{saving ? "Creating..." : "Create"}</button>
            <button
              onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}
              style={{
                background: "none", border: "1px solid #D4CBC0", borderRadius: 8,
                color: "#7a8e8a", fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem", padding: "11px 18px", cursor: "pointer",
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px 16px", textAlign: "center", color: "#8aa9a2", fontSize: "0.875rem" }}>
          Loading...
        </div>
      ) : lists.length === 0 ? (
        <div style={{ padding: "60px 16px", textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: "1.25rem",
            fontWeight: 700, color: "#f0f4f1", marginBottom: 8,
          }}>No lists yet</div>
          <div style={{ fontSize: "0.875rem", color: "#7a8e8a", lineHeight: 1.65, marginBottom: 24 }}>
            Create lists to organize your must-visit spots.
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{
              background: "#3d6b62", border: "none", borderRadius: 10,
              color: "#eafaf4", fontFamily: "'Inter', sans-serif",
              fontSize: "0.875rem", fontWeight: 600,
              padding: "12px 24px", cursor: "pointer",
            }}
          >Create First List</button>
        </div>
      ) : (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {lists.map(list => (
            <div key={list.id} style={{ borderBottom: "1px solid #2c4a44" }}>

              {/* List header row */}
              <div
                style={{
                  background: "#10211e", padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onClick={() => toggleExpand(list.id)}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#1b332e"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "#10211e"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1rem", fontWeight: 700, color: "#f0f4f1",
                  }}>{list.name}</div>
                  {list.description && (
                    <div style={{ fontSize: "0.8rem", color: "#7a8e8a", marginTop: 2 }}>
                      {list.description}
                    </div>
                  )}
                </div>

                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={expandedId === list.id ? "#3d6b62" : "#8aa9a2"}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: "transform 0.2s", transform: expandedId === list.id ? "rotate(180deg)" : "none", flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>

                <button
                  onClick={e => { e.stopPropagation(); deleteList(list.id); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#8aa9a2", padding: "4px 6px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#d64545"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#8aa9a2"; }}
                  aria-label="Delete list"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>

              {/* List items */}
              {expandedId === list.id && (
                <div style={{ background: "#1b332e", padding: "8px 16px 14px", borderTop: "1px solid #E8E3DC" }}>
                  {!list.items ? (
                    <div style={{ padding: "14px 0", fontSize: "0.8rem", color: "#8aa9a2" }}>Loading...</div>
                  ) : list.items.length === 0 ? (
                    <div style={{ padding: "16px 0", fontSize: "0.8rem", color: "#8aa9a2" }}>
                      No spots in this list yet. Add them from search results.
                    </div>
                  ) : list.items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 0", borderBottom: "1px solid #2c4a44",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "0.95rem", fontWeight: 700, color: "#f0f4f1",
                        }}>{item.restaurant_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#7a8e8a", marginTop: 2 }}>
                          {[item.neighborhood, item.cuisine, item.price_range].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {item.food_score != null && (
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "0.875rem", fontWeight: 700,
                          color: scoreColor(item.food_score), flexShrink: 0,
                        }}>{item.food_score.toFixed(1)}</span>
                      )}
                      <button
                        onClick={() => {
                          sessionStorage.setItem("dr-open-deep-dive", JSON.stringify({
                            name: item.restaurant_name,
                            food_score: item.food_score,
                          }));
                          router.push("/");
                        }}
                        style={{
                          background: "#1b332e", border: "1px solid #2c4a44",
                          borderRadius: 6, color: "#3d6b62",
                          fontFamily: "'Inter', sans-serif", fontSize: "0.75rem",
                          fontWeight: 600, padding: "5px 10px",
                          cursor: "pointer", flexShrink: 0,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#2c4a44"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#1b332e"; }}
                      >Deep Dive</button>
                      <button
                        onClick={() => removeItem(list.id, item.id)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#8aa9a2", padding: "4px", flexShrink: 0,
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#d64545"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#8aa9a2"; }}
                        aria-label="Remove from list"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
