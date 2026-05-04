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
