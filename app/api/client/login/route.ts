import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    
    const users: any[] = await query('SELECT * FROM vpn_users WHERE username = ?', [username]);
    const user = users[0];

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
       throw new Error("JWT_SECRET missing or too short");
    }

    // Generate JWT using jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new jose.SignJWT({ id: user.id, username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const res = NextResponse.json({ 
      success: true, 
      user: { 
        username: user.username, 
        traffic: user.traffic_total, 
        limit: user.traffic_limit_gb,
        status: user.status,
        expires: user.expires_at,
        wg_pubkey: user.wg_pubkey,
        // Intentionally leaving out plain text passwords and UUIDs for security
      } 
    });
    res.cookies.set('client_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 // 1 hr
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
