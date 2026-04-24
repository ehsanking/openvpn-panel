import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { hashKey } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { z } from 'zod';

function requireAdmin(cookieStore: any) {
  return cookieStore.get('vpn_session')?.value === 'authenticated';
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z
    .array(z.enum(['read:users', 'write:users', 'read:servers', 'read:stats']))
    .min(1),
});

export async function GET() {
  const cookieStore = await cookies();
  if (!requireAdmin(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await query(
    'SELECT id, name, permissions, last_used, created_at FROM api_keys ORDER BY id DESC'
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!requireAdmin(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((e: any) => e.message).join(', ') },
      { status: 400 }
    );
  }

  const { name, permissions } = parsed.data;
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = hashKey(rawKey);

  await query(
    'INSERT INTO api_keys (name, key_hash, permissions) VALUES (?, ?, ?)',
    [name, keyHash, JSON.stringify(permissions)]
  );

  await auditLog('agent.registered', `API key "${name}" created`, { name, permissions });

  // Return raw key only once — not stored in DB
  return NextResponse.json({ name, key: rawKey, permissions });
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  if (!requireAdmin(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Valid ID required' }, { status: 400 });
  }

  await query('DELETE FROM api_keys WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}
