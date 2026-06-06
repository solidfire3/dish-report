import { NextResponse } from "next/server";

export function maintenanceResponse(): NextResponse {
  return NextResponse.json(
    { error: "paused", message: "Service temporarily unavailable" },
    { status: 503 }
  );
}
