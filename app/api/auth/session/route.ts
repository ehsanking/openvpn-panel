import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import { getJwtSecret, verifyAdminToken } from '@/lib/auth-utils';
import { isRateLimited } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS_HASH = process.env.ADMIN_PASSWORD_HASH;

export async function GET(req: Request) {
  const payload = await verifyAdminToken(req);
  if (payload) {
    return NextResponse.json({
      user: { email: ADMIN_USER + '@local', displayName: 'Administrator', role: 'admin' },
      isAdmin: true
    });
  }
  return NextResponse.json({ user: null, isAdmin: false });
}

export async function POST(req: Request) {
  const ip = (await headers()).get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const username = String(body.username || '');
    const password = String(body.password || '');
    
    if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (!ADMIN_PASS_HASH) {
      return NextResponse.json({ error: 'Internal Server Error: No Hash' }, { status: 500 });
    }

    let isPasswordValid = false;
    try {
        isPasswordValid = await bcrypt.compare(password, ADMIN_PASS_HASH);
    } catch {
        return NextResponse.json({ error: 'Invalid password format' }, { status: 400 });
    }

    if (username === ADMIN_USER && isPasswordValid) {
      const cookieStore = await cookies();
      const secret = await getJwtSecret();
      const expiresInSeconds = 60 * 60 * 24; // 1 day
      const token = await new jose.SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${expiresInSeconds}s`)
        .sign(secret);

      cookieStore.set('vpn_session_jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresInSeconds
      });

      await auditLog('admin', 'admin_login_success', `Username: ${username}`);
      // The native app uses `token` + `expiresIn` to authenticate via the
      // `Authorization: Bearer ...` header. The web panel ignores them and
      // relies on the cookie set above.
      return NextResponse.json({
        success: true,
        token,
        tokenType: 'Bearer',
        expiresIn: expiresInSeconds,
        user: { username: ADMIN_USER, role: 'admin' }
      });
    }

    await auditLog('anonymous', 'admin_login_failed', `Username: ${username}`);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error: any) {
    await auditLog('system', 'admin_login_error', `Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('vpn_session_jwt');
  cookieStore.delete('vpn_session'); // clear legacy cookie too
  return NextResponse.json({ success: true });
}
