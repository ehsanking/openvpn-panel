import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getJwtSecret } from '@/lib/auth-utils';
import { getCACertPem, getOrCreateTlsAuthKey, getOrCreateUserCert } from '@/lib/pki';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('client_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/client', req.url));
    }

    const secret = await getJwtSecret();
    const decoded: any = jwt.verify(token, secret);

    const users: any[] = await query(
      'SELECT * FROM vpn_users WHERE id = ?',
      [decoded.id]
    );
    const user = users[0];

    if (!user || user.status !== 'active') {
      return NextResponse.redirect(new URL('/client', req.url));
    }

    // Select least-loaded active server
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

    let userProtocol = 'udp';
    if (user.custom_config) {
      try {
        const parsed = JSON.parse(user.custom_config);
        if (parsed.protocol) userProtocol = parsed.protocol;
      } catch (_) {}
    }

    const remoteLine = server
      ? `remote ${server.ip_address} ${JSON.parse(server.ports || '[1194]')[0]}`
      : `remote 45.12.99.1 1194`;

    // Fetch real PKI material (generates on first use, cached thereafter)
    const [caCert, tlsAuthKey, userCert] = await Promise.all([
      getCACertPem(),
      getOrCreateTlsAuthKey(),
      getOrCreateUserCert(user.id, user.username),
    ]);

    const profileContent = `client
dev tun
proto ${userProtocol}
${remoteLine}
resolv-retry infinite
nobind
persist-key
persist-tun
keepalive 10 60
remote-cert-tls server
auth SHA256
cipher AES-256-GCM
key-direction 1
verb 3
connect-retry 1
connect-timeout 5

<ca>
${caCert.trim()}
</ca>
<cert>
${userCert.certPem.trim()}
</cert>
<key>
${userCert.keyPem.trim()}
</key>
<tls-auth>
${tlsAuthKey.trim()}
</tls-auth>`;

    return new NextResponse(profileContent, {
      headers: {
        'Content-Disposition': `attachment; filename="${user.username}.ovpn"`,
        'Content-Type': 'application/x-openvpn-profile',
      },
    });
  } catch (error: any) {
    return NextResponse.redirect(new URL('/client', req.url));
  }
}
