import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  generateClientConfig,
  InboundConfig,
  ServerInfo,
  UserCredentials
} from '@/lib/config-generators';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const users = await query(
      'SELECT * FROM vpn_users WHERE username = ? OR xray_uuid = ? LIMIT 1',
      [token, token]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
    }

    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Account has expired' }, { status: 403 });
    }

    const assignedInbounds = await query(
      `SELECT i.* FROM vpn_inbounds i
       INNER JOIN user_inbounds ui ON i.id = ui.inbound_id
       WHERE ui.user_id = ? AND i.status = 'active'
       ORDER BY i.created_at DESC`,
      [user.id]
    ) as InboundConfig[];

    const userCreds: UserCredentials = {
      username: user.username,
      password: user.password_hash ? undefined : user.password,
      uuid: user.xray_uuid,
      wg_pubkey: user.wg_pubkey,
      wg_ip: user.wg_ip
    };

    const configs: Array<{
      protocol: string;
      name: string;
      url?: string;
      content?: string;
      type: string;
      server: string;
    }> = [];

    for (const inbound of assignedInbounds) {
      const server: ServerInfo = {
        ip_address: inbound.server_address || '127.0.0.1',
        domain: inbound.server_address,
      };
      try {
        const config = generateClientConfig(
          inbound.protocol,
          server,
          inbound,
          userCreds
        );

        configs.push({
          protocol: inbound.protocol,
          name: inbound.name,
          server: inbound.server_address || '',
          ...config
        });
      } catch (err) {
        // Some protocols (openvpn, wireguard) need extra material; skip in
        // the multi-protocol subscription view rather than failing the whole
        // request. Users can still grab those configs via /api/client/download.
        console.warn(`Skipping ${inbound.protocol} config:`, err);
      }
    }

    if (format === 'base64') {
      const urls = configs
        .filter(c => c.url)
        .map(c => c.url);

      return new Response(Buffer.from(urls.join('\n')).toString('base64'), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Subscription-Userinfo': `upload=0; download=${user.traffic_total || 0}; total=${(user.traffic_limit_gb || 0) * 1073741824}; expire=${user.expires_at ? new Date(user.expires_at).getTime() / 1000 : 0}`,
          'Profile-Title': `Power VPN - ${user.username}`,
          'Profile-Update-Interval': '12'
        }
      });
    }

    return NextResponse.json({
      user: {
        username: user.username,
        status: user.status,
        trafficUsed: user.traffic_total,
        trafficLimit: user.traffic_limit_gb,
        trafficLimitBytes: (user.traffic_limit_gb || 0) * 1073741824,
        expiresAt: user.expires_at,
        maxConnections: user.max_connections
      },
      configs: configs.map(c => ({
        protocol: c.protocol,
        name: c.name,
        type: c.type,
        url: c.url,
        qrData: c.url,
        server: c.server,
        ...(format === 'full' && c.content ? { content: c.content } : {})
      })),
      subscriptionUrl: `/api/subscription/${token}?format=base64`,
    });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
