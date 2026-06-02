import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { what_doing, error_desc, email } = await req.json();

    if (!error_desc?.trim()) {
      return NextResponse.json({ error: "error_desc is required" }, { status: 400 });
    }

    // Resolve user_id from session if signed in (best-effort)
    let user_id: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) user_id = user.id;
    } catch {}

    // Insert via service role (bypasses RLS — anon INSERT policy also allows it)
    const svc = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await svc.from("error_reports").insert({
      what_doing: what_doing?.trim() || null,
      error_desc: error_desc.trim(),
      email: email?.trim() || null,
      user_id,
      page_url: req.headers.get("referer") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    if (error) {
      console.error("[report] insert error:", error.message);
      return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
