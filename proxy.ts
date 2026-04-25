import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Routes that don't require admin JWT
const PUBLIC_API_PREFIXES = [
  '/api/auth/session',
  '/api/health',
  '/api/client/',
];

function isPublicRoute(pathname: string) {
  return PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CORS ────────────────────────────────────────────────────────────────────
  const response = NextResponse.next();
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-migration-token');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // ── Admin auth guard ─────────────────────────────────────────────────────
  if (pathname.startsWith('/api/') && !isPublicRoute(pathname)) {
    const cookie = request.cookies.get('vpn_session_jwt');

    if (!cookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret || jwtSecret.length < 32) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
      }
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(cookie.value, secret);

      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
