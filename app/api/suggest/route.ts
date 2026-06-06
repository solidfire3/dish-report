import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isMaintenanceMode, maintenanceResponse } from "@/lib/maintenance";

function makeSvc() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export type SuggestItem = {
  label: string;
  search_id?: string | null;
  run_count?: number;
  source: "mine" | "popular";
};

export async function POST(req: Request) {
  if (isMaintenanceMode()) return maintenanceResponse();
  try {
    const { q } = await req.json();
    const query = String(q ?? "").trim();
    if (query.length < 2) return NextResponse.json({ suggestions: [] });

    // Escape special ilike characters
    const esc = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const db  = makeSvc();

    const seen = new Set<string>();
    const suggestions: SuggestItem[] = [];

    // ── Source A: user's own past searches ───────────────────────────────────
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: personal } = await db
          .from("user_searches")
          .select("dish, search_cache_id")
          .eq("user_id", user.id)
          .ilike("dish", `%${esc}%`)
          .order("created_at", { ascending: false })
          .limit(3);

        for (const s of personal ?? []) {
          const label = s.dish?.trim();
          if (!label || seen.has(label.toLowerCase())) continue;
          seen.add(label.toLowerCase());
          suggestions.push({ label, search_id: s.search_cache_id, source: "mine" });
        }
      }
    } catch {}

    // ── Source B: popular across all users ───────────────────────────────────
    const { data: popular } = await db
      .from("searches")
      .select("id, raw_query, dish, run_count")
      .or(`raw_query.ilike.%${esc}%, dish.ilike.%${esc}%`)
      .order("run_count", { ascending: false })
      .limit(6);

    for (const s of popular ?? []) {
      const label = (s.raw_query || s.dish)?.trim();
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      suggestions.push({ label, search_id: s.id, run_count: s.run_count, source: "popular" });
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 6) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
