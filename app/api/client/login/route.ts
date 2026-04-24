import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/auth-utils';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { parseBody, clientLoginSchema } from '@/lib/validation';

export async function POST(req: Request) {
  // Rate limit: max 10 login attempts per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`client-login:${ip}`, 10, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const parsed = parseBody(clientLoginSchema, body);
    if (!parsed.success) return parsed.response;

    const { username, password } = parsed.data;

    const users: any[] = await query(
      'SELECT * FROM vpn_users WHERE username = ?',
      [username]
    );
    const user = users[0];

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const secret = await getJwtSecret();
    const token = jwt.sign(
      { id: user.id, username: user.username },
      secret,
      { expiresIn: '1h' }
    );

    const res = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        traffic: user.traffic_total,
        limit: user.traffic_limit_gb,
        status: user.status,
        expires: user.expires_at,
        cisco_password: user.cisco_password,
        l2tp_password: user.l2tp_password,
        wg_pubkey: user.wg_pubkey,
        xray_uuid: user.xray_uuid,
        xray_flow: user.xray_flow,
      },
    });

    res.cookies.set('client_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
