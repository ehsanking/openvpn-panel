import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encrypt } from '@/lib/crypto';
import { auditLog } from '@/lib/audit-logger';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const CreateUserSchema = z.object({
  username: z.string().min(3).max(63).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().optional().nullable(),
  protocol: z.string().optional(),
  expires_at: z.string().optional().nullable(),
  traffic_limit_gb: z.number().default(10),
  role: z.enum(['user', 'admin']).default('user'),
  cisco_password: z.string().optional().nullable(),
  l2tp_password: z.string().optional().nullable(),
  max_connections: z.number().default(1),
  xray_uuid: z.string().optional(),
  xray_flow: z.string().optional(),
  port: z.number().int().optional().nullable(),
  main_protocol: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) as total FROM vpn_users') as any[];
    const total = countResult[0].total;

    const users = await query('SELECT id, username, custom_config, role, parent_id, status, traffic_limit_gb, traffic_total, traffic_up, traffic_down, max_connections, wg_pubkey, wg_ip, port, main_protocol, expires_at, created_at, last_connected FROM vpn_users ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const usersToCreate = z.array(CreateUserSchema).parse(Array.isArray(body) ? body : [body]);
    const results = [];
    
    // Using transaction for atomic-like insertion or at least safer operation
    // For simplicity, sticking to loop but optimized
    for (const userData of usersToCreate) {
      const { 
        username, password, protocol, expires_at, traffic_limit_gb,
        role, cisco_password, l2tp_password, max_connections,
        xray_uuid, xray_flow, port, main_protocol
      } = userData;
      
      // Port validation
      if (port) {
        const existingPortUsers = await query('SELECT username FROM vpn_users WHERE port = ? LIMIT 1', [port]) as any[];
        if (existingPortUsers.length > 0) {
             throw new Error(`Port ${port} is already in use by user ${existingPortUsers[0].username}.`);
        }
      }

      let passwordHash = password ? bcrypt.hashSync(password, 10) : null;
      let ciscoHash = cisco_password ? bcrypt.hashSync(cisco_password, 10) : null;
      let l2tpHash = l2tp_password ? bcrypt.hashSync(l2tp_password, 10) : null;
      
      const generatedXrayUuid = xray_uuid || crypto.randomUUID();
      const customConfig = JSON.stringify({ protocol: protocol || 'udp' });

      await query(
        `INSERT INTO vpn_users 
          (username, password_hash, custom_config, expires_at, traffic_limit_gb, role, cisco_password, l2tp_password, max_connections, xray_uuid, xray_flow, port, main_protocol) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [
          username, passwordHash, customConfig, expires_at || null, 
          traffic_limit_gb, role, ciscoHash, l2tpHash,
          max_connections, generatedXrayUuid, xray_flow || '', port || null,
          main_protocol || protocol || 'openvpn'
        ]
      );
      await auditLog('create_user', 'admin', username, { username });
      results.push(username);
    }
    
    return NextResponse.json({ success: true, created: results.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await z.object({ id: z.number(), status: z.string() }).parse(await req.json());
    await query('UPDATE vpn_users SET status = ? WHERE id = ?', [body.status, body.id]);
    await auditLog('update_user_status', 'admin', String(body.id), { status: body.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error("ID required");

    await query('DELETE FROM vpn_users WHERE id = ?', [id]);
    await auditLog('delete_user', 'admin', id, { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
