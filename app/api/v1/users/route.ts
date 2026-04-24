import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validateApiKey, requirePermission } from '@/lib/api-auth';
import { parseBody, userCreateSchema, userPatchSchema } from '@/lib/validation';

const PUBLIC_USER_FIELDS = [
  'id', 'username', 'role', 'status', 'created_at', 'expires_at',
  'traffic_total', 'traffic_limit_gb', 'max_connections', 'main_protocol',
];

function sanitize(user: any) {
  return Object.fromEntries(
    PUBLIC_USER_FIELDS.map((f) => [f, user[f] ?? null])
  );
}

export async function GET(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const perm = requirePermission(auth.record.permissions, 'read:users');
  if (perm) return perm;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const whereClause = status ? 'WHERE status = ?' : '';
  const params: any[] = status ? [status, limit, offset] : [limit, offset];

  const users: any[] = await query(
    `SELECT ${PUBLIC_USER_FIELDS.join(', ')} FROM vpn_users ${whereClause}
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    params
  );

  return NextResponse.json({ data: users, limit, offset });
}

export async function POST(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const perm = requirePermission(auth.record.permissions, 'write:users');
  if (perm) return perm;

  const body = await req.json();
  const parsed = parseBody(userCreateSchema, body);
  if (!parsed.success) return parsed.response;

  const {
    username, password, protocol, expires_at, traffic_limit_gb,
    role, cisco_password, l2tp_password, max_connections,
    xray_uuid, xray_flow, port, main_protocol,
  } = parsed.data;

  if (port && main_protocol) {
    const existing: any[] = await query(
      'SELECT main_protocol FROM vpn_users WHERE port = ? LIMIT 1', [port]
    );
    if (existing.length && existing[0].main_protocol !== main_protocol) {
      return NextResponse.json(
        { error: `Port ${port} already used by ${existing[0].main_protocol}` },
        { status: 409 }
      );
    }
  }

  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
  const customConfig = JSON.stringify({ protocol: protocol ?? 'udp' });

  const result: any = await query(
    `INSERT INTO vpn_users
      (username, password_hash, custom_config, expires_at, traffic_limit_gb, role,
       cisco_password, l2tp_password, max_connections, xray_uuid, xray_flow, port, main_protocol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username, passwordHash, customConfig, expires_at ?? null,
      traffic_limit_gb ?? 10, role ?? 'user', cisco_password ?? null,
      l2tp_password ?? null, max_connections ?? 1,
      xray_uuid ?? crypto.randomUUID(), xray_flow ?? '',
      port ?? null, main_protocol ?? protocol ?? 'openvpn',
    ]
  );

  return NextResponse.json({ id: result.insertId, username }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const perm = requirePermission(auth.record.permissions, 'write:users');
  if (perm) return perm;

  const body = await req.json();
  const parsed = parseBody(userPatchSchema, body);
  if (!parsed.success) return parsed.response;

  const { id, status } = parsed.data;
  await query('UPDATE vpn_users SET status = ? WHERE id = ?', [status, id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const perm = requirePermission(auth.record.permissions, 'write:users');
  if (perm) return perm;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Valid ID required' }, { status: 400 });
  }

  await query('DELETE FROM vpn_users WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}
