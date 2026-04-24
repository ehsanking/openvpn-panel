import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('client_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/client', req.url));
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    const users: any[] = await query('SELECT * FROM vpn_users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user || user.status !== 'active') {
       return NextResponse.redirect(new URL('/client', req.url));
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
    let userProtocol = 'udp';
    if (user.custom_config) {
        try {
            const parsed = JSON.parse(user.custom_config);
            if (parsed.protocol) userProtocol = parsed.protocol;
        } catch (e) {}
    }

    const remoteLine = server 
        ? `remote ${server.ip_address} ${JSON.parse(server.ports || '[1194]')[0]}`
        : `remote 45.12.99.1 1194`;

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
-----BEGIN CERTIFICATE-----
CA_CERT_HERE
-----END CERTIFICATE-----
</ca>
<cert>
-----BEGIN CERTIFICATE-----
CLIENT_CERT_FOR_${user.username.toUpperCase()}
-----END CERTIFICATE-----
</cert>
<key>
-----BEGIN PRIVATE KEY-----
CLIENT_KEY_FOR_${user.username.toUpperCase()}
-----END PRIVATE KEY-----
</key>
<tls-auth>
-----BEGIN OpenVPN Static key V1-----
TLS_AUTH_KEY
-----END OpenVPN Static key V1-----
</tls-auth>`;

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
