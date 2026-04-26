import { NextResponse } from 'next/server';
import db from '@/lib/db';

// All supported protocols
const SUPPORTED_PROTOCOLS = [
  'openvpn', 'wireguard', 'cisco', 'l2tp',
  'vless', 'vmess', 'trojan', 'shadowsocks'
];

export async function GET() {
  try {
    const [inbounds] = await db.execute('SELECT * FROM vpn_inbounds ORDER BY created_at DESC');
    return NextResponse.json({ inbounds });
  } catch (error: any) {
    console.error('Error fetching inbounds:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, 
      protocol, 
      port, 
      server_address,
      remark,
      // OpenVPN fields
      ovpn_protocol,
      ovpn_cipher,
      ovpn_auth,
      ovpn_dev,
      // WireGuard fields
      wg_private_key,
      wg_public_key,
      wg_address,
      wg_dns,
      wg_mtu,
      // Cisco fields
      cisco_auth_method,
      cisco_max_clients,
      cisco_dpd,
      // L2TP fields
      l2tp_psk,
      l2tp_dns,
      l2tp_local_ip,
      l2tp_remote_ip_range,
      // Xray fields
      xray_uuid,
      xray_flow,
      xray_network,
      xray_security,
      xray_sni,
      xray_fingerprint,
      xray_public_key,
      xray_short_id,
      xray_path,
      xray_service_name,
      xray_encryption,
    } = body;
    
    // Validate required fields
    if (!name || !protocol || !port || !server_address) {
      return NextResponse.json({ error: 'Name, protocol, port and server address are required' }, { status: 400 });
    }

    // Validate protocol
    if (!SUPPORTED_PROTOCOLS.includes(protocol)) {
      return NextResponse.json({ 
        error: `Invalid protocol. Supported: ${SUPPORTED_PROTOCOLS.join(', ')}` 
      }, { status: 400 });
    }

    // Check for port conflicts on same protocol
    const [existingPorts] = await db.execute(
      'SELECT * FROM vpn_inbounds WHERE port = ? AND protocol = ?',
      [parseInt(port, 10), protocol]
    );
    
    if (Array.isArray(existingPorts) && existingPorts.length > 0) {
      return NextResponse.json({ 
        error: `Port ${port} is already in use for ${protocol} protocol` 
      }, { status: 400 });
    }

    // Build SQL based on protocol type
    const columns = ['name', 'protocol', 'port', 'server_address', 'remark', 'status'];
    const values: any[] = [name, protocol, parseInt(port, 10), server_address, remark || '', 'active'];
    const placeholders = ['?', '?', '?', '?', '?', '?'];

    // Add protocol-specific fields
    switch (protocol) {
      case 'openvpn':
        columns.push('ovpn_protocol', 'ovpn_cipher', 'ovpn_auth', 'ovpn_dev');
        values.push(
          ovpn_protocol || 'udp',
          ovpn_cipher || 'AES-256-GCM',
          ovpn_auth || 'SHA256',
          ovpn_dev || 'tun'
        );
        placeholders.push('?', '?', '?', '?');
        break;

      case 'wireguard':
        columns.push('wg_private_key', 'wg_public_key', 'wg_address', 'wg_dns', 'wg_mtu');
        values.push(
          wg_private_key || '',
          wg_public_key || '',
          wg_address || '10.0.0.1/24',
          wg_dns || '1.1.1.1',
          wg_mtu || 1420
        );
        placeholders.push('?', '?', '?', '?', '?');
        break;

      case 'cisco':
        columns.push('cisco_auth_method', 'cisco_max_clients', 'cisco_dpd');
        values.push(
          cisco_auth_method || 'password',
          cisco_max_clients || 100,
          cisco_dpd || 90
        );
        placeholders.push('?', '?', '?');
        break;

      case 'l2tp':
        columns.push('l2tp_psk', 'l2tp_dns', 'l2tp_local_ip', 'l2tp_remote_ip_range');
        values.push(
          l2tp_psk || '',
          l2tp_dns || '8.8.8.8',
          l2tp_local_ip || '10.10.10.1',
          l2tp_remote_ip_range || '10.10.10.2-10.10.10.254'
        );
        placeholders.push('?', '?', '?', '?');
        break;

      case 'vless':
      case 'vmess':
      case 'trojan':
        columns.push(
          'xray_protocol', 'xray_uuid', 'xray_flow', 'xray_network', 
          'xray_security', 'xray_sni', 'xray_fingerprint', 
          'xray_public_key', 'xray_short_id', 'xray_path', 'xray_service_name'
        );
        values.push(
          protocol,
          xray_uuid || '',
          xray_flow || '',
          xray_network || 'tcp',
          xray_security || 'reality',
          xray_sni || 'www.google.com',
          xray_fingerprint || 'chrome',
          xray_public_key || '',
          xray_short_id || '',
          xray_path || '/ws',
          xray_service_name || 'grpc'
        );
        placeholders.push('?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?');
        break;

      case 'shadowsocks':
        columns.push('xray_protocol', 'xray_encryption', 'xray_network');
        values.push(
          'shadowsocks',
          xray_encryption || 'chacha20-ietf-poly1305',
          xray_network || 'tcp'
        );
        placeholders.push('?', '?', '?');
        break;
    }

    const sql = `INSERT INTO vpn_inbounds (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await db.execute(sql, values);

    return NextResponse.json({ 
      success: true, 
      id: (result as any).insertId,
      message: `${protocol.toUpperCase()} inbound created successfully`
    });
  } catch (error: any) {
    console.error('Error creating inbound:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
