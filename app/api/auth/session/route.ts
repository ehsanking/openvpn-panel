import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { parseBody, adminLoginSchema } from '@/lib/validation';

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';

// Support pre-hashed password via ADMIN_PASSWORD_HASH env var.
// If only ADMIN_PASSWORD is set, hash it once at startup.
const _rawPass = process.env.ADMIN_PASSWORD || 'password';
const _preHash = process.env.ADMIN_PASSWORD_HASH;

let adminPasswordHash: string;
if (_preHash) {
  adminPasswordHash = _preHash;
} else {
  adminPasswordHash = bcrypt.hashSync(_rawPass, 10);
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[Security] Set ADMIN_PASSWORD_HASH to a bcrypt hash instead of ADMIN_PASSWORD in .env'
    );
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('vpn_session');

  if (session?.value === 'authenticated') {
    return NextResponse.json({
      user: { email: ADMIN_USER + '@local', displayName: 'Administrator' },
      isAdmin: true,
    });
  }

  return NextResponse.json({ user: null, isAdmin: false });
}

export async function POST(req: Request) {
  // Rate limit: max 10 login attempts per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-login:${ip}`, 10, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const parsed = parseBody(adminLoginSchema, body);
    if (!parsed.success) return parsed.response;

    const { username, password } = parsed.data;

    const usernameMatch = username === ADMIN_USER;
    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

    if (usernameMatch && passwordMatch) {
      const cookieStore = await cookies();
      cookieStore.set('vpn_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('vpn_session');
  return NextResponse.json({ success: true });
}
