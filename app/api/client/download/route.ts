import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { query } from '@/lib/db';
import { getOrGeneratePki, getOrGenerateClientCert } from '@/lib/pki-service';
import { generateOvpnProfile } from '@/lib/ovpn-generator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify client JWT cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('client_token');

    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(tokenCookie.value, secret);
    const username = payload.username as string;

    // Fetch user and active servers
    const users = await query(
      'SELECT * FROM vpn_users WHERE username = ? AND status = "active"',
      [username]
    );
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 });
    }

    const servers = await query(
      'SELECT ip_address, ports FROM vpn_servers WHERE status = "online" AND is_active = TRUE'
    );

    // Generate PKI + client cert
    const { caCertPem, caKeyPem, tlsAuthKey } = await getOrGeneratePki();
    const { clientCertPem, clientKeyPem } = await getOrGenerateClientCert(username, caCertPem, caKeyPem);

    const ovpnContent = generateOvpnProfile(username, servers, {
      caCertPem,
      tlsAuthKey,
      clientCertPem,
      clientKeyPem,
    });

    return new Response(ovpnContent, {
      headers: {
        'Content-Type': 'application/x-openvpn-profile',
        'Content-Disposition': `attachment; filename="${username}.ovpn"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
