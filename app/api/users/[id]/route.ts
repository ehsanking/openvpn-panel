import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { auditLog } from '@/lib/audit-logger';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const UpdateUserSchema = z.object({
  username: z.string().min(3).max(63).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  password: z.string().min(8).optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended', 'revoked']).optional(),
  traffic_limit_gb: z.number().optional(),
  expires_at: z.string().optional().nullable(),
  role: z.enum(['user', 'admin']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = UpdateUserSchema.parse(body);
    
    let sql = 'UPDATE vpn_users SET ';
    const updates: string[] = [];
    const values: any[] = [];

    if (validated.username) {
        updates.push('username = ?');
        values.push(validated.username);
    }
    if (validated.password) {
        updates.push('password_hash = ?');
        updates.push('password_changed_at = CURRENT_TIMESTAMP');
        values.push(await bcrypt.hash(validated.password, 10));
    }
    if (validated.status) {
        updates.push('status = ?');
        values.push(validated.status);
    }
    if (validated.traffic_limit_gb !== undefined) {
        updates.push('traffic_limit_gb = ?');
        values.push(validated.traffic_limit_gb);
    }
    if (validated.expires_at !== undefined) {
        updates.push('expires_at = ?');
        values.push(validated.expires_at);
    }
    if (validated.role) {
        updates.push('role = ?');
        values.push(validated.role);
    }

    if (updates.length === 0) {
        return NextResponse.json({ message: 'No changes provided' });
    }

    sql += updates.join(', ') + ' WHERE id = ?';
    values.push(id);

    await query(sql, values);
    await auditLog('update_user', 'admin', id, validated);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const users = await query('SELECT id, username, role, status, traffic_limit_gb, traffic_total, expires_at, created_at, last_connected FROM vpn_users WHERE id = ?', [id]);
        if (users.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json(users[0]);
    } catch (error) {
        return handleApiError(error);
    }
}
