import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import { getJwtSecret } from '@/lib/auth-utils';
import { isRateLimited } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // HTTPS enforcement
  if (process.env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') !== 'https') {
      return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}`, 301);
  }

  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  if (!isApiRoute) {
    return NextResponse.next();
  }

  // General Rate Limiting for APIs
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip, 60)) { // 60 requests per minute
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Exempt routes
  const publicRoutes = ['/api/auth/session', '/api/client/login', '/api/client/download'];
  
  if (publicRoutes.includes(request.nextUrl.pathname)) {
      return NextResponse.next();
  }
  
  // Protect /api/migrate specifically
  if (request.nextUrl.pathname === '/api/migrate') {
      if (process.env.ALLOW_MIGRATION !== 'true') {
         return NextResponse.json({ error: 'Migration forbidden' }, { status: 403 });
      }
      return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('vpn_session_jwt');
  
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
  }

  try {
    const secret = await getJwtSecret();
    const { payload } = await jose.jwtVerify(sessionCookie.value, secret);
    
    // RBAC
    const path = request.nextUrl.pathname;
    const role = payload.role as string;

    if (path.startsWith('/api/admin') && role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    if (path.startsWith('/api/users') && !['admin', 'reseller'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden. Admin or Reseller access required.' }, { status: 403 });
    }
    
    const response = NextResponse.next();
    // Security headers
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}

export const config = {
  matcher: '/api/:path*',
};
