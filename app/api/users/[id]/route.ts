import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';

const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'user', 'reseller']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
}).refine(data => data.role || data.status, {
  message: "At least one field must be provided for update"
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows]: any = await pool.execute(
      'SELECT id, username, role, status, created_at FROM vpn_users WHERE id = ?',
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

    if (validatedData.data.role) {
      updates.push('role = ?');
      values.push(validatedData.data.role);
    }
    if (validatedData.data.status) {
      updates.push('status = ?');
      values.push(validatedData.data.status);
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

    await auditLog('USER_UPDATED', 'admin', id, validatedData.data);

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

    await auditLog('USER_DELETED', 'admin', id);

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
