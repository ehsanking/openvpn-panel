import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { generateOvpnProfile } from '@/lib/ovpn-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('client_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/client', req.url));
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET missing or too short");
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    
    const users: any[] = await query('SELECT * FROM vpn_users WHERE id = ?', [payload.id]);
    const user = users[0];

    // Added revocation, suspension and expiry check
    if (!user || user.status !== 'active' || (user.expires_at && new Date(user.expires_at) < new Date())) {
       return new NextResponse('User account expired, suspended or not found. Cannot download profile.', { status: 403 });
    }

    // 1. Select the least loaded active server
    const servers: any[] = await query(`
      SELECT 
        s.id, s.ip_address, s.ports, s.protocol, s.load_score,
        (SELECT COUNT(*) FROM sessions WHERE server_id = s.id AND status = 'active') as active_connections
      FROM vpn_servers s
      WHERE s.is_active = TRUE AND s.status = 'online'
      ORDER BY s.load_score ASC, active_connections ASC
      LIMIT 1
    `);

    const server = servers[0];
    
    // Check if user has custom config
    let userConfig = {};
    if (user.custom_config) {
        try {
            userConfig = JSON.parse(user.custom_config);
        } catch (e: any) {
            console.warn("Invalid custom_config JSON for user:", user.username, e.message);
        }
    }

    const profileContent = await generateOvpnProfile(user.username, server ? [server] : [], userConfig);

    return new NextResponse(profileContent, {
        headers: {
            'Content-Disposition': `attachment; filename="${user.username}.ovpn"`,
            'Content-Type': 'application/x-openvpn-profile'
        }
    });

  } catch (error: any) {
    return NextResponse.redirect(new URL('/client', req.url));
  }
}
