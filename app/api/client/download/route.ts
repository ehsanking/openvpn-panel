import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  generateClientConfig,
  InboundConfig,
  ServerInfo,
  UserCredentials 
} from '@/lib/config-generators';
import { getPkiService } from '@/lib/pki-service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const inboundId = searchParams.get('inbound');
  const protocol = searchParams.get('protocol');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    // Get user
    const users = await query(
      'SELECT * FROM vpn_users WHERE username = ? LIMIT 1',
      [username]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Get inbound config
    let inbound: InboundConfig | null = null;

    if (inboundId) {
      const inbounds = await query(
        'SELECT * FROM vpn_inbounds WHERE id = ? LIMIT 1',
        [parseInt(inboundId)]
      );
      inbound = inbounds[0] || null;
    } else if (protocol) {
      const inbounds = await query(
        'SELECT * FROM vpn_inbounds WHERE protocol = ? AND status = ? LIMIT 1',
        [protocol, 'active']
      );
      inbound = inbounds[0] || null;
    }

    if (!inbound) {
      return NextResponse.json({ error: 'Inbound not found' }, { status: 404 });
    }

    // Get server info
    const servers = await query(
      'SELECT * FROM vpn_servers WHERE is_active = 1 ORDER BY load_score ASC LIMIT 1'
    );
    
    const server: ServerInfo = servers[0] || {
      ip_address: '127.0.0.1',
      domain: null,
      ports: [443]
    };

    const userCreds: UserCredentials = {
      username: user.username,
      password: user.password_hash ? undefined : user.password,
      uuid: user.xray_uuid,
      wg_pubkey: user.wg_pubkey,
      wg_ip: user.wg_ip
    };

    // Generate config based on protocol
    let config: any;
    
    if (inbound.protocol === 'openvpn') {
      // Get PKI certs for OpenVPN
      const pkiService = getPkiService();
      const pki = await pkiService.generateClientCertificate(user.username);
      config = generateClientConfig(inbound.protocol, server, inbound, userCreds, pki);
    } else if (inbound.protocol === 'wireguard') {
      // For WireGuard, we need to generate a client private key
      // In production, this would be stored per-user
      const clientPrivateKey = user.wg_privkey || generateWireGuardPrivateKey();
      config = generateClientConfig(inbound.protocol, server, inbound, userCreds, undefined, clientPrivateKey);
    } else {
      config = generateClientConfig(inbound.protocol, server, inbound, userCreds);
    }

    // Return based on config type
    if (config.type === 'file' && config.content) {
      return new Response(config.content, {
        headers: {
          'Content-Type': config.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${config.filename}"`,
        },
      });
    }

    // For URL-based configs (Xray protocols)
    if (config.type === 'url' && config.url) {
      return NextResponse.json({
        success: true,
        protocol: inbound.protocol,
        url: config.url,
        qrData: config.qrData,
        config: config.config
      });
    }

    // For instruction-based configs (Cisco, L2TP)
    if (config.type === 'instructions') {
      return NextResponse.json({
        success: true,
        protocol: inbound.protocol,
        ...config
      });
    }

    return NextResponse.json({ error: 'Unable to generate config' }, { status: 500 });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({
      error: {
        code: 'DOWNLOAD_FAILED',
        message: 'Failed to generate download',
        details: error.message
      }
    }, { status: 500 });
  }
}

// Helper function to generate WireGuard private key
function generateWireGuardPrivateKey(): string {
  // In production, use proper crypto
  // This is a placeholder that generates a base64-like string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let key = '';
  for (let i = 0; i < 43; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key + '=';
}
