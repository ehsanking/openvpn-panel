import { NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';

const UserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
});

const CreateUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6).optional().nullable(),
  role: z.enum(['admin', 'user', 'reseller']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  traffic_limit_gb: z.number().min(0).default(10),
  max_connections: z.number().min(1).default(1),
  expires_at: z.string().optional().nullable(),
  inboundIds: z.array(z.number()).optional(),
  cisco_password: z.string().optional().nullable(),
  l2tp_password: z.string().optional().nullable(),
  wg_pubkey: z.string().optional().nullable(),
  xray_uuid: z.string().optional().nullable(),
  port: z.number().optional().nullable(),
  main_protocol: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validatedQuery = UserQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!validatedQuery.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const { page, limit, search } = validatedQuery.data;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM vpn_users';
    let countSql = 'SELECT COUNT(*) as total FROM vpn_users';
    const params: any[] = [];

    if (search) {
      sql += ' WHERE username LIKE ?';
      countSql += ' WHERE username LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult]: any = await pool.execute(countSql, params.slice(0, 1));
    const total = countResult[0].total;

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error.message
      }
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CreateUserSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user data',
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { 
      username, password, role, status, traffic_limit_gb, max_connections, expires_at, inboundIds,
      cisco_password, l2tp_password, wg_pubkey, xray_uuid, port, main_protocol
    } = validatedData.data;

    // Convert empty string from date input to null
    const finalExpiresAt = expires_at ? new Date(expires_at) : null;

    // In a real app, hash password here
    const [result]: any = await pool.execute(
      `INSERT INTO vpn_users 
       (username, password_hash, role, status, traffic_limit_gb, max_connections, expires_at, created_at, cisco_password, l2tp_password, wg_pubkey, xray_uuid, port, main_protocol) 
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)`,
      [username, password || null, role, status, traffic_limit_gb, max_connections, finalExpiresAt, cisco_password || null, l2tp_password || null, wg_pubkey || null, xray_uuid || null, port || null, main_protocol || null]
    );

    const userId = result.insertId;

    if (inboundIds && inboundIds.length > 0) {
      for (const inboundId of inboundIds) {
        await pool.execute(
          'INSERT INTO user_inbounds (user_id, inbound_id) VALUES (?, ?)',
          [userId, inboundId]
        );
      }
    }

    await auditLog(null, 'USER_CREATED', `User ${username} created with role ${role}`);

    return NextResponse.json({
      data: {
        id: userId,
        username,
        role
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({
        error: {
          code: 'DUPLICATE_USER',
          message: 'Username already exists'
        }
      }, { status: 409 });
    }

    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create user',
        details: error.message
      }
    }, { status: 500 });
  }
}
