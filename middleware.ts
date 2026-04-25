import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import { getJwtSecret } from '@/lib/auth-utils';

export async function middleware(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  if (!isApiRoute) {
    return NextResponse.next();
  }

  // Exempt routes
  const publicRoutes = ['/api/auth/session', '/api/client/login', '/api/client/download'];
  
  if (publicRoutes.includes(request.nextUrl.pathname)) {
      return NextResponse.next();
  }
  
  // Protect /api/migrate specifically
  if (request.nextUrl.pathname === '/api/migrate') {
      // Basic block, perhaps require a local dev environment or specific token.
      // Easiest is to block it once production or check an env var
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
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }
    
    return NextResponse.next();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}

export const config = {
  matcher: '/api/:path*',
};
