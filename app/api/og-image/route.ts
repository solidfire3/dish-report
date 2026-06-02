import { NextRequest, NextResponse } from "next/server";

// Server-side image extractor for restaurant thumbnails.
// Priority: apple-touch-icon (logo) → PNG/SVG favicon (logo) → og:image (photo)
// Returns { url, imgType } or { url: null }

type ImgType = "logo" | "photo";
type Result  = { url: string; imgType: ImgType } | { url: null };

function resolveUrl(raw: string, domain: string): string | null {
  const u = raw.trim();
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("/"))  return `https://${domain}${u}`;
  if (u.startsWith("http")) return u;
  return null;
}

function extractImages(html: string, domain: string): Result {
  // 1. apple-touch-icon — highest quality site icon, almost always a real logo
  const atiRe = /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i;
  const atiM  = html.match(atiRe)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i);
  if (atiM?.[1]) {
    const url = resolveUrl(atiM[1], domain);
    if (url) return { url, imgType: "logo" };
  }

  // 2. PNG or SVG favicon — skip .ico files (too low quality)
  const iconRe = [
    /<link[^>]+rel=["'][^"']*(?:shortcut )?icon[^"']*["'][^>]+href=["']([^"']+\.(?:png|svg)[^"']*)["']/i,
    /<link[^>]+href=["']([^"']+\.(?:png|svg)[^"']*)["'][^>]+rel=["'][^"']*(?:shortcut )?icon[^"']*["']/i,
  ];
  for (const re of iconRe) {
    const m = html.match(re);
    if (m?.[1]) {
      const url = resolveUrl(m[1], domain);
      if (url) return { url, imgType: "logo" };
    }
  }

  // 3. og:image — treat as photo (renders with cover)
  const ogRe = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const re of ogRe) {
    const m = html.match(re);
    if (m?.[1]) {
      const url = resolveUrl(m[1], domain);
      if (url) return { url, imgType: "photo" };
    }
  }

  return { url: null };
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.trim();
  if (!domain) return NextResponse.json({ url: null });

  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];

  try {
    const res = await fetch(`https://${cleanDomain}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DishReport/1.0)",
        "Accept":     "text/html",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ url: null });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return NextResponse.json({ url: null });

    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ url: null });
    let html = "";
    const dec = new TextDecoder();
    while (html.length < 40960) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});

    const result = extractImages(html, cleanDomain);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ url: null });
  }
}
