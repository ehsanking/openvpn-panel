import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS_HASH = process.env.ADMIN_PASSWORD_HASH;
// Removed LEGACY_ADMIN_PASS

async function getSecret() {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
         return new TextEncoder().encode(process.env.JWT_SECRET);
    }
    throw new Error("A 32+ char JWT_SECRET must be provided in the environment variables.");
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('vpn_session_jwt');

  if (session) {
      try {
          const secret = await getSecret();
          const { payload } = await jose.jwtVerify(session.value, secret);
          if (payload.role === 'admin') {
                return NextResponse.json({ 
                user: { email: ADMIN_USER + '@local', displayName: 'Administrator' },
                isAdmin: true 
                });
          }
      } catch (e) {
          // Token invalid, fallthrough
      }
  }

  return NextResponse.json({ user: null, isAdmin: false });
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!ADMIN_PASS_HASH) {
      console.error("ADMIN_PASSWORD_HASH is not set.");
      return NextResponse.json({ error: 'Internal Server Error: No Hash' }, { status: 500 });
    }

    let isPasswordValid = false;
    try {
        isPasswordValid = bcrypt.compareSync(password, ADMIN_PASS_HASH);
    } catch(e) {
        console.error("BCrypt comparison failed:", e);
        return NextResponse.json({ error: 'Invalid password format' }, { status: 400 });
    }

    if (username === ADMIN_USER && isPasswordValid) {
      const cookieStore = await cookies();
      const secret = await getSecret();
      const token = await new jose.SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
      
      cookieStore.set('vpn_session_jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 1 day
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
  cookieStore.delete('vpn_session_jwt');
  cookieStore.delete('vpn_session'); // clear legacy cookie too
  return NextResponse.json({ success: true });
}
