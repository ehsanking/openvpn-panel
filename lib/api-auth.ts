import crypto from 'crypto';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export type ApiPermission =
  | 'read:users'
  | 'write:users'
  | 'read:servers'
  | 'read:stats';

export interface ApiKeyRecord {
  id: number;
  name: string;
  permissions: ApiPermission[];
}

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        key_hash VARCHAR(64) NOT NULL UNIQUE,
        permissions JSON NOT NULL,
        last_used TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_key_hash (key_hash)
      )
    `);
    tableReady = true;
  } catch (_) {}
}

export function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export async function validateApiKey(
  req: Request
): Promise<
  | { ok: true; record: ApiKeyRecord }
  | { ok: false; response: NextResponse }
> {
  await ensureTable();

  const raw = req.headers.get('X-API-Key') ?? req.headers.get('x-api-key');
  if (!raw) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing X-API-Key header' },
        { status: 401 }
      ),
    };
  }

  const hash = hashKey(raw);
  const rows: any[] = await query(
    'SELECT id, name, permissions FROM api_keys WHERE key_hash = ?',
    [hash]
  );

  if (!rows.length) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      ),
    };
  }

  // Update last_used asynchronously
  query('UPDATE api_keys SET last_used = NOW() WHERE key_hash = ?', [hash]).catch(
    () => {}
  );

  const row = rows[0];
  const permissions: ApiPermission[] =
    typeof row.permissions === 'string'
      ? JSON.parse(row.permissions)
      : row.permissions;

  return { ok: true, record: { id: row.id, name: row.name, permissions } };
}

export function requirePermission(
  permissions: ApiPermission[],
  required: ApiPermission
): NextResponse | null {
  if (!permissions.includes(required)) {
    return NextResponse.json(
      { error: `Permission denied. Required: ${required}` },
      { status: 403 }
    );
  }
  return null;
}
