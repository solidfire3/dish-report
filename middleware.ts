import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// ── Maintenance gate ──────────────────────────────────────────────────────────
// Set MAINTENANCE_MODE=true in the Vercel dashboard and redeploy to pause.
// Set to false (or remove) and redeploy to restore.
// Middleware runs on every request before any handler — this is the only
// reliable interception point that works regardless of static/dynamic rendering.

const BLOCKED_API = [
  "/api/search",
  "/api/deepdive",
  "/api/compare",
  "/api/market",
  "/api/places",
  "/api/photos",
  "/api/photo",
  "/api/suggest",
];

function maintenanceHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dish Report — Upgrading</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    background: #0d1a17;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 2rem;
  }
  .wrap { text-align: center; max-width: 400px; }
  .brand {
    font-size: 0.65rem;
    letter-spacing: 0.35em;
    color: #7fe3c8;
    text-transform: uppercase;
    margin-bottom: 2.5rem;
    font-weight: 600;
  }
  .rule { width: 2rem; height: 1px; background: #2c4a44; margin: 0 auto 2.5rem; }
  h1 { font-size: 1.5rem; font-weight: 300; color: #f0f4f1; margin-bottom: 1rem; line-height: 1.5; }
  p { font-size: 0.875rem; color: #8aa9a2; line-height: 1.6; }
</style>
</head>
<body>
  <div class="wrap">
    <p class="brand">Dish Report</p>
    <div class="rule"></div>
    <h1>Getting an upgrade.</h1>
    <p>Back soon.</p>
  </div>
</body>
</html>`;
}

export async function middleware(request: NextRequest) {
  const maint = process.env.MAINTENANCE_MODE;
  const { pathname } = request.nextUrl;

  console.log("[maint] MAINTENANCE_MODE=", maint, "path=", pathname);

  if (maint === "true") {
    // Block expensive API routes — return 503 before any handler executes
    if (BLOCKED_API.some(p => pathname.startsWith(p))) {
      console.log("[maint] blocking API route:", pathname);
      return NextResponse.json(
        { error: "paused", message: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Pass through safe API routes (/api/health, /api/report, /api/og-image, etc.)
    if (pathname.startsWith("/api/")) return NextResponse.next();

    // All page routes: return the maintenance screen directly (no React rendering needed)
    console.log("[maint] serving maintenance screen for:", pathname);
    return new NextResponse(maintenanceHtml(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Normal operation — run Supabase session refresh
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
