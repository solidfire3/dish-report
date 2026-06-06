import { NextRequest, NextResponse } from "next/server";
import { maintenanceResponse } from "@/lib/maintenance";

export async function GET(req: NextRequest) {
  console.log("[maint] MAINTENANCE_MODE=", process.env.MAINTENANCE_MODE);
  if (process.env.MAINTENANCE_MODE === "true") return maintenanceResponse();
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) return new NextResponse(null, { status: 404 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new NextResponse(null, { status: 500 });

  try {
    const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1600&key=${apiKey}`;
    const res = await fetch(url, { redirect: "follow" });

    if (!res.ok) return new NextResponse(null, { status: 404 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
