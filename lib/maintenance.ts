import { NextResponse } from "next/server";

export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === "true";
}

export function maintenanceResponse(): NextResponse {
  return NextResponse.json(
    { error: "paused", message: "Service temporarily unavailable" },
    { status: 503 }
  );
}
