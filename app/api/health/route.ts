import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    anthropic_key_prefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) ?? "NOT SET",
    google_key_set: !!process.env.GOOGLE_PLACES_API_KEY,
    google_key_prefix: process.env.GOOGLE_PLACES_API_KEY?.slice(0, 10) ?? "NOT SET",
  });
}
