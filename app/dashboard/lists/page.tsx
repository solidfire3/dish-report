'use client';
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const T = {
  bg:"#0C0C0C",card:"#141414",card2:"#1C1C1C",border:"#2A2A2A",border2:"#383838",
  text:"#F0EDE8",muted:"#888",dim:"#444",neon:"#FFB800",green:"#2ECC71",blue:"#4A9EFF",red:"#FF4444",purple:"#B56BFF",
};

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

export default function ListsPage() {
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
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
  }, []);

  const loadLists = async () => {
    const { data } = await supabase
      .from("lists")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false });
    setLists(data ?? []);
    setLoading(false);
  };

  const loadItems = async (listId: string) => {
    const { data } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: false });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: data ?? [] } : l));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const list = lists.find(l => l.id === id);
    if (!list?.items) loadItems(id);
  };

  const createList = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("lists")
      .insert({ name: newName.trim(), description: newDesc.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (data) {
      setLists(prev => [{ ...data, items: [] }, ...prev]);
      setNewName(""); setNewDesc(""); setCreating(false);
    }
  };

  const deleteList = async (id: string) => {
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

  const scoreColor = (s: number | null) =>
    !s ? T.muted : s >= 8 ? T.green : s >= 7 ? T.neon : s >= 6 ? "#FF6B35" : T.red;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: T.card, padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 50, borderBottom: `1px solid ${T.neon}44`, boxShadow: `0 0 20px ${T.neon}22` }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: 3, color: T.neon, flex: 1 }}>My Lists</div>
        <button onClick={() => setCreating(true)} style={{ background: T.neon, border: "none", borderRadius: 5, color: "#000", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.44rem", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", padding: "6px 11px", cursor: "pointer" }}>
          + New List
        </button>
      </div>

      {/* CREATE FORM */}
      {creating && (
        <div style={{ background: T.card2, borderBottom: `1px solid ${T.border}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.44rem", letterSpacing: 3, color: T.neon, textTransform: "uppercase", fontWeight: 700 }}>New List</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="List name" autoFocus
            style={{ background: T.card, border: `1.5px solid ${T.border2}`, borderRadius: 6, padding: "9px 11px", color: T.text, fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", outline: "none" }}/>
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
            style={{ background: T.card, border: `1.5px solid ${T.border2}`, borderRadius: 6, padding: "9px 11px", color: T.text, fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", outline: "none" }}/>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={createList} disabled={saving || !newName.trim()} style={{ flex: 1, background: T.neon, border: "none", borderRadius: 5, color: "#000", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.48rem", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", padding: "9px", cursor: "pointer", opacity: saving || !newName.trim() ? 0.5 : 1 }}>
              {saving ? "Creating..." : "Create"}
            </button>
            <button onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }} style={{ background: "none", border: `1px solid ${T.border2}`, color: T.dim, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.44rem", letterSpacing: 2, textTransform: "uppercase", padding: "9px 13px", borderRadius: 5, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px 16px", textAlign: "center", color: T.muted, fontSize: "0.8rem" }}>Loading...</div>
      ) : lists.length === 0 ? (
        <div style={{ padding: "60px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: "0.8rem", color: T.muted, lineHeight: 1.7 }}>No lists yet.<br />Create lists to organize your must-visit spots.</div>
          <button onClick={() => setCreating(true)} style={{ marginTop: 18, background: T.neon, border: "none", borderRadius: 6, color: "#000", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.5rem", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", padding: "10px 18px", cursor: "pointer" }}>Create First List</button>
        </div>
      ) : (
        <div>
          {lists.map(list => (
            <div key={list.id} style={{ borderBottom: `1px solid ${T.border}` }}>
              {/* LIST HEADER ROW */}
              <div style={{ background: T.card, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => toggleExpand(list.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.93rem", fontWeight: 700, color: T.text }}>{list.name}</div>
                  {list.description && <div style={{ fontSize: "0.67rem", color: T.muted, marginTop: 2 }}>{list.description}</div>}
                </div>
                <span style={{ fontSize: "0.5rem", color: expandedId === list.id ? T.neon : T.dim, transition: "transform .2s", transform: expandedId === list.id ? "rotate(180deg)" : "none", display: "block" }}>▼</span>
                <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${list.name}"?`)) deleteList(list.id); }}
                  style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: "0.8rem", padding: "4px", marginLeft: 4 }}>🗑</button>
              </div>

              {/* LIST ITEMS */}
              {expandedId === list.id && (
                <div style={{ background: T.bg, padding: "8px 16px 12px" }}>
                  {!list.items ? (
                    <div style={{ padding: "12px 0", fontSize: "0.72rem", color: T.muted }}>Loading...</div>
                  ) : list.items.length === 0 ? (
                    <div style={{ padding: "14px 0", fontSize: "0.72rem", color: T.dim }}>No spots in this list yet. Add them from search results.</div>
                  ) : list.items.map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.87rem", fontWeight: 700, color: T.text }}>{item.restaurant_name}</div>
                        <div style={{ fontSize: "0.63rem", color: T.muted }}>{[item.neighborhood, item.cuisine, item.price_range].filter(Boolean).join(" · ")}</div>
                      </div>
                      {item.food_score != null && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", fontWeight: 700, color: scoreColor(item.food_score) }}>{item.food_score.toFixed(1)}</span>
                      )}
                      <button onClick={() => removeItem(list.id, item.id)} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: "0.75rem", padding: "4px" }}>✕</button>
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
