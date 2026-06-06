import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    keys_present: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google_places: !!process.env.GOOGLE_PLACES_API_KEY,
      supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
