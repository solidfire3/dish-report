import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Server-side signup route — uses the admin (service role) client so we can
// pass email_confirm: true and create users that are immediately usable,
// regardless of the Supabase dashboard "Confirm email" toggle.
// SUPABASE_SERVICE_ROLE_KEY never leaves the server.

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,   // <-- user is confirmed immediately, no email verification needed
    });

    console.log('[AUTH DEBUG] admin signup status:', JSON.stringify({
      user_id:            data?.user?.id,
      user_email:         data?.user?.email,
      email_confirmed_at: data?.user?.email_confirmed_at,
      error:              error?.message ?? null,
    }));

    if (error) {
      // Map common admin errors to friendly messages
      let msg = error.message;
      if (msg.includes("already been registered") || msg.includes("already exists") || msg.includes("duplicate"))
        msg = "An account with this email already exists. Try signing in.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ userId: data.user?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
