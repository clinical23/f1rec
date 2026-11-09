import { NextRequest, NextResponse } from "next/server";
import { pathEnabled } from "@/lib/features";

// The launch switch. Production pages sit behind a password until SITE_PUBLIC=on is set in Vercel
// (Production) and the site is redeployed; removing it locks the site again the same way.
// Previews are never gated here: Vercel already requires a sign-in for them.
//
// Never touched by the gate:
//  - /api/*            → the tweet/blog pipeline and crons (each checks its own secret)
//  - _next static/image, favicon, robots, sitemap, ads.txt → assets and crawl files
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|ads.txt).*)"],
};

export function middleware(req: NextRequest) {
  // Sections switched off in src/lib/features.ts are a 404 before anything renders.
  if (!pathEnabled(req.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL("/__section-off", req.url), { status: 404 });
  }

  // Fail closed: only a known preview or local build skips the gate; anything else is treated as production.
  const env = process.env.VERCEL_ENV;
  if (env === "preview" || (!process.env.VERCEL && process.env.NODE_ENV === "development")) {
    return NextResponse.next();
  }
  if (process.env.SITE_PUBLIC === "on") return NextResponse.next();

  const USER = process.env.BASIC_AUTH_USER;
  const PASS = process.env.BASIC_AUTH_PASS;

  // Fail closed: if the gate isn't configured, the site stays locked.
  if (!USER || !PASS) {
    return new NextResponse("Site unavailable", { status: 503 });
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === USER && pass === PASS) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="f1rec", charset="UTF-8"' },
  });
}
