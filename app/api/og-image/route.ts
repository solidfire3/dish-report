import { NextRequest, NextResponse } from "next/server";

// Server-side OG image extractor — avoids CORS and mixed-content issues.
// Fetches the restaurant's website and extracts the og:image meta tag.
// Falls back gracefully (returns null) on any failure.

const OG_REGEX = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
];

function extractOgImage(html: string, domain: string): string | null {
  for (const re of OG_REGEX) {
    const m = html.match(re);
    if (m?.[1]) {
      let url = m[1].trim();
      if (url.startsWith("//")) url = "https:" + url;
      else if (url.startsWith("/")) url = `https://${domain}${url}`;
      if (url.startsWith("http")) return url;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.trim();
  if (!domain) return NextResponse.json({ url: null });

  // Strip any protocol prefix that might have slipped in
  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];

  try {
    const res = await fetch(`https://${cleanDomain}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DishReport/1.0; +https://dishreport.app)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return NextResponse.json({ url: null });

    // Only parse text/html responses
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return NextResponse.json({ url: null });

    // Read only the first 32 KB — og tags are in <head>
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ url: null });
    let html = "";
    const dec = new TextDecoder();
    while (html.length < 32768) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      // Stop once we've passed </head>
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});

    const url = extractOgImage(html, cleanDomain);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
