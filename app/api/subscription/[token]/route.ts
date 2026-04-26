import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  generateClientConfig, 
  generateSubscriptionContent,
  InboundConfig,
  ServerInfo,
  UserCredentials
} from '@/lib/config-generators';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json'; // json, base64, clash, singbox

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // Find user by token (username or xray_uuid)
    const users = await query(
      'SELECT * FROM vpn_users WHERE username = ? OR xray_uuid = ? LIMIT 1',
      [token, token]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
    }

    // Check expiration
    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Account has expired' }, { status: 403 });
    }

    // Get user's assigned inbounds
    const inbounds = await query(`
      SELECT i.* FROM vpn_inbounds i
      INNER JOIN user_inbounds ui ON i.id = ui.inbound_id
      WHERE ui.user_id = ? AND i.status = 'active'
    `, [user.id]) as InboundConfig[];

    // If no specific inbounds assigned, get all active inbounds
    const activeInbounds = inbounds.length > 0 ? inbounds : await query(
      'SELECT * FROM vpn_inbounds WHERE status = ? ORDER BY created_at DESC',
      ['active']
    ) as InboundConfig[];

    // Get server info
    const servers = await query(
      'SELECT * FROM vpn_servers WHERE is_active = 1 ORDER BY load_score ASC LIMIT 1'
    );
    
    const server: ServerInfo = servers[0] || {
      ip_address: '127.0.0.1',
      domain: null,
      ports: [443]
    };

    // Generate configs for each inbound
    const configs: Array<{ 
      protocol: string; 
      name: string; 
      url?: string; 
      content?: string;
      type: string;
    }> = [];

    const userCreds: UserCredentials = {
      username: user.username,
      password: user.password_hash ? undefined : user.password,
      uuid: user.xray_uuid,
      wg_pubkey: user.wg_pubkey,
      wg_ip: user.wg_ip
    };

    for (const inbound of activeInbounds) {
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
          ...config
        });
      } catch (err) {
        // Skip protocols that can't be generated (missing required data)
        console.warn(`Skipping ${inbound.protocol} config:`, err);
      }
    }

    // Return based on format
    if (format === 'base64') {
      // Return base64 encoded subscription URLs (for v2ray/xray clients)
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

    // Return JSON with all config data
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
      server: {
        address: server.domain || server.ip_address,
        ip: server.ip_address
      },
      configs: configs.map(c => ({
        protocol: c.protocol,
        name: c.name,
        type: c.type,
        url: c.url,
        qrData: c.url, // For QR code generation
        // Only include content for file-based configs if explicitly requested
        ...(format === 'full' && c.content ? { content: c.content } : {})
      })),
      subscriptionUrl: `/api/subscription/${token}?format=base64`,
      protocols: {
        vpn: configs.filter(c => ['openvpn', 'wireguard', 'cisco', 'l2tp'].includes(c.protocol)),
        xray: configs.filter(c => ['vless', 'vmess', 'trojan', 'shadowsocks'].includes(c.protocol))
      }
    });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
