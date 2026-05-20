import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Tier 1 — hot scraped pages (races, compare, leaderboards). Tight.
const hotPageLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'rl:hot',
});

// Tier 2 — general pages. Generous for real users.
const pageLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'rl:page',
});

// Tier 3 — API. Tight by default.
const apiLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'rl:api',
});

// Country kill switch — review weekly
const BLOCKED_COUNTRIES = ['VN', 'BD'];

const HOT_ROUTES = ['/races/', '/compare', '/leaderboards'];

function isHotRoute(path: string): boolean {
  return HOT_ROUTES.some((r) => path === r || path.startsWith(r));
}

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const country = request.geo?.country ?? '';
  const path = request.nextUrl.pathname;

  if (BLOCKED_COUNTRIES.includes(country)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  let limiter = pageLimiter;
  if (path.startsWith('/api')) {
    limiter = apiLimiter;
  } else if (isHotRoute(path)) {
    limiter = hotPageLimiter;
  }

  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': '60',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
