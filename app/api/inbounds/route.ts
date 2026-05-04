import { NextResponse } from 'next/server';
import db, { queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { InboundCreateSchema } from '@/lib/inbound-validation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const [inbounds] = await db.execute('SELECT * FROM vpn_inbounds ORDER BY created_at DESC');
    return NextResponse.json({ inbounds });
  } catch (error: any) {
    console.error('Error fetching inbounds:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const parsed = InboundCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid inbound payload',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Power VPN treats every TCP/UDP port as exclusive to a single inbound,
    // regardless of protocol. The DB has a UNIQUE index on (port) — this
    // pre-check just gives the API a clearer 409 + actionable message than
    // a raw SQLite constraint error.
    const conflict = await queryOne(
      'SELECT id, protocol, name FROM vpn_inbounds WHERE port = ?',
      [data.port]
    );
    if (conflict) {
      return NextResponse.json(
        {
          error: {
            code: 'PORT_IN_USE',
            message: `Port ${data.port} is already used by inbound "${conflict.name}" (${conflict.protocol}). Each port can only host a single inbound.`,
          },
        },
        { status: 409 }
      );
    }

    const columns: string[] = ['name', 'protocol', 'port', 'server_address', 'remark', 'status'];
    const values: any[] = [
      data.name,
      data.protocol,
      data.port,
      data.server_address,
      data.remark || '',
      data.status || 'active',
    ];

    const addCol = (col: string, value: unknown) => {
      if (value === undefined || value === null) return;
      columns.push(col);
      values.push(value);
    };

    switch (data.protocol) {
      case 'openvpn':
        addCol('ovpn_protocol', data.ovpn_protocol);
        addCol('ovpn_cipher', data.ovpn_cipher);
        addCol('ovpn_auth', data.ovpn_auth);
        addCol('ovpn_dev', data.ovpn_dev);
        break;

      case 'wireguard':
        addCol('wg_private_key', data.wg_private_key);
        addCol('wg_public_key', data.wg_public_key);
        addCol('wg_address', data.wg_address);
        addCol('wg_dns', data.wg_dns);
        addCol('wg_mtu', data.wg_mtu);
        addCol('wg_persistent_keepalive', data.wg_persistent_keepalive);
        break;

      case 'cisco':
        addCol('cisco_auth_method', data.cisco_auth_method);
        addCol('cisco_max_clients', data.cisco_max_clients);
        addCol('cisco_dpd', data.cisco_dpd);
        break;

      case 'l2tp':
        addCol('l2tp_psk', data.l2tp_psk);
        addCol('l2tp_dns', data.l2tp_dns);
        addCol('l2tp_local_ip', data.l2tp_local_ip);
        addCol('l2tp_remote_ip_range', data.l2tp_remote_ip_range);
        break;

      case 'vless':
      case 'vmess':
      case 'trojan':
        addCol('xray_protocol', data.protocol);
        addCol('xray_uuid', data.xray_uuid);
        if (data.protocol === 'vless') addCol('xray_flow', data.xray_flow);
        addCol('xray_network', data.xray_network);
        addCol('xray_security', data.xray_security);
        addCol('xray_sni', data.xray_sni);
        addCol('xray_fingerprint', data.xray_fingerprint);
        addCol('xray_public_key', data.xray_public_key);
        addCol('xray_short_id', data.xray_short_id);
        addCol('xray_path', data.xray_path);
        addCol('xray_service_name', data.xray_service_name);
        break;

      case 'shadowsocks':
        addCol('xray_protocol', 'shadowsocks');
        addCol('xray_encryption', data.xray_encryption);
        addCol('xray_network', data.xray_network);
        break;

      case 'ikev2':
        addCol('ike_auth_method', data.ike_auth_method);
        addCol('ike_psk', data.ike_psk);
        addCol('ike_dns', data.ike_dns);
        addCol('ike_dh_group', data.ike_dh_group);
        addCol('ike_proposals', data.ike_proposals);
        addCol('ike_remote_id', data.ike_remote_id);
        addCol('ike_local_ip_pool', data.ike_local_ip_pool);
        break;

      case 'pptp':
        addCol('pptp_dns', data.pptp_dns);
        addCol('pptp_local_ip', data.pptp_local_ip);
        addCol('pptp_remote_ip_range', data.pptp_remote_ip_range);
        break;

      case 'sstp':
        addCol('sstp_dns', data.sstp_dns);
        addCol('sstp_local_ip', data.sstp_local_ip);
        addCol('sstp_remote_ip_range', data.sstp_remote_ip_range);
        addCol('sstp_cert_path', data.sstp_cert_path);
        addCol('sstp_key_path', data.sstp_key_path);
        break;

      case 'hysteria2':
        addCol('hy2_password', data.hy2_password);
        addCol('hy2_obfs', data.hy2_obfs);
        addCol('hy2_obfs_password', data.hy2_obfs_password);
        addCol('hy2_sni', data.hy2_sni);
        addCol('hy2_alpn', data.hy2_alpn);
        addCol('hy2_up_mbps', data.hy2_up_mbps);
        addCol('hy2_down_mbps', data.hy2_down_mbps);
        addCol('hy2_insecure', data.hy2_insecure ? 1 : 0);
        break;

      case 'tuic':
        addCol('tuic_uuid', data.tuic_uuid);
        addCol('tuic_password', data.tuic_password);
        addCol('tuic_congestion_control', data.tuic_congestion_control);
        addCol('tuic_alpn', data.tuic_alpn);
        addCol('tuic_udp_relay_mode', data.tuic_udp_relay_mode);
        addCol('tuic_sni', data.tuic_sni);
        addCol('tuic_disable_sni', data.tuic_disable_sni ? 1 : 0);
        addCol('tuic_zero_rtt', data.tuic_zero_rtt ? 1 : 0);
        break;
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO vpn_inbounds (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
      const [result] = await db.execute(sql, values);
      const created = await queryOne('SELECT * FROM vpn_inbounds WHERE id = ?', [(result as any).insertId]);
      return NextResponse.json(
        {
          success: true,
          id: (result as any).insertId,
          data: created,
          message: `${data.protocol.toUpperCase()} inbound created successfully`,
        },
        { status: 201 }
      );
    } catch (err: any) {
      // Race-condition fallback: if another request grabbed the same port
      // between our pre-check and INSERT, the UNIQUE index will fire.
      if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(err?.message || '')) {
        return NextResponse.json(
          {
            error: {
              code: 'PORT_IN_USE',
              message: `Port ${data.port} is already in use by another inbound.`,
            },
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.error('Error creating inbound:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
