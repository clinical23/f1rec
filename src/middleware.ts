import { NextRequest, NextResponse } from "next/server";

// Gate every human-facing page, but DO NOT touch:
//  - /api/*            → the autonomous tweet/blog pipeline + cron (already secret-protected)
//  - _next static/image, favicon, robots, sitemap → assets / crawl files
// To FULLY freeze (including the pipeline), change the matcher to: ["/(.*)"]
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export function middleware(req: NextRequest) {
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
