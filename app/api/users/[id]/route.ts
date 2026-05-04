import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';

const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'user', 'reseller']).optional().nullable(),
  status: z.enum(['active', 'inactive', 'disabled', 'suspended', 'revoked']).optional().nullable(),
  traffic_limit_gb: z.number().optional().nullable(),
  max_connections: z.number().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  cisco_password: z.string().optional().nullable(),
  l2tp_password: z.string().optional().nullable(),
  wg_pubkey: z.string().optional().nullable(),
  xray_uuid: z.string().optional().nullable(),
  port: z.number().optional().nullable(),
  main_protocol: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows]: any = await pool.execute(
      'SELECT * FROM vpn_users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user',
        details: error.message
      }
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateUserSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    const fields = [
      'role', 'status', 'traffic_limit_gb', 'max_connections',
      'cisco_password', 'l2tp_password', 'wg_pubkey', 'xray_uuid',
      'port', 'main_protocol'
    ];

    for (const field of fields) {
      if ((validatedData.data as any)[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push((validatedData.data as any)[field]);
      }
    }

    if (validatedData.data.expires_at !== undefined) {
      updates.push('expires_at = ?');
      values.push(validatedData.data.expires_at ? new Date(validatedData.data.expires_at) : null);
    }
    
    if (validatedData.data.password) {
      updates.push('password_hash = ?');
      values.push(validatedData.data.password);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No updates provided' });
    }

    values.push(id);

    const [result]: any = await pool.execute(
      `UPDATE vpn_users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      }, { status: 404 });
    }

    await auditLog(null, 'USER_UPDATED', `User ${id} updated with ${JSON.stringify(validatedData.data)}`);

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user',
        details: error.message
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [result]: any = await pool.execute(
      'DELETE FROM vpn_users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      }, { status: 404 });
    }

    await auditLog(null, 'USER_DELETED', `User ${id} deleted`);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete user',
        details: error.message
      }
    }, { status: 500 });
  }
}
