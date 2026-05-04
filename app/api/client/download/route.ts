import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import {
  generateClientConfig,
  InboundConfig,
  ServerInfo,
  UserCredentials
} from '@/lib/config-generators';
import { getPkiService } from '@/lib/pki-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const inboundId = searchParams.get('inbound');
  const protocol = searchParams.get('protocol');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const user = await queryOne(
      'SELECT * FROM vpn_users WHERE username = ? LIMIT 1',
      [username]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let inbound: InboundConfig | null = null;

    if (inboundId) {
      inbound = await queryOne(
        `SELECT i.* FROM vpn_inbounds i
         INNER JOIN user_inbounds ui ON ui.inbound_id = i.id
         WHERE i.id = ? AND ui.user_id = ?
         LIMIT 1`,
        [parseInt(inboundId, 10), user.id]
      );
    } else if (protocol) {
      inbound = await queryOne(
        `SELECT i.* FROM vpn_inbounds i
         INNER JOIN user_inbounds ui ON ui.inbound_id = i.id
         WHERE i.protocol = ? AND i.status = 'active' AND ui.user_id = ?
         ORDER BY i.created_at DESC
         LIMIT 1`,
        [protocol, user.id]
      );
    }

    if (!inbound) {
      return NextResponse.json({ error: 'Inbound not found or not assigned to user' }, { status: 404 });
    }

    const server: ServerInfo = {
      ip_address: inbound.server_address || '127.0.0.1',
      domain: inbound.server_address,
    };

    const userCreds: UserCredentials = {
      username: user.username,
      password: user.password_hash ? undefined : user.password,
      uuid: user.xray_uuid,
      wg_pubkey: user.wg_pubkey,
      wg_ip: user.wg_ip
    };

    let config: any;

    if (inbound.protocol === 'openvpn') {
      const pkiService = getPkiService();
      const pki = await pkiService.generateClientCertificate(user.username);
      config = generateClientConfig(inbound.protocol, server, inbound, userCreds, pki);
    } else if (inbound.protocol === 'wireguard') {
      let clientPrivateKey: string | undefined = user.wg_privkey;
      if (!clientPrivateKey) {
        clientPrivateKey = generateWireGuardPrivateKey();
        await query(
          'UPDATE vpn_users SET wg_privkey = ? WHERE id = ?',
          [clientPrivateKey, user.id]
        );
      }
      config = generateClientConfig(inbound.protocol, server, inbound, userCreds, undefined, clientPrivateKey);
    } else {
      config = generateClientConfig(inbound.protocol, server, inbound, userCreds);
    }

    if (config.type === 'file' && config.content) {
      return new Response(config.content, {
        headers: {
          'Content-Type': config.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${config.filename}"`,
        },
      });
    }

    if (config.type === 'url' && config.url) {
      return NextResponse.json({
        success: true,
        protocol: inbound.protocol,
        url: config.url,
        qrData: config.qrData,
        config: config.config
      });
    }

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

function generateWireGuardPrivateKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
