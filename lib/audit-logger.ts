import { headers } from 'next/headers';
import pool from './db';

// Two call patterns exist in the codebase:
//   1. auditLog(null, 'USER_UPDATED', 'User 5 updated ...')       — userId callers
//   2. auditLog('admin_login', 'admin', username, { meta })        — action callers
// Both map cleanly to: action | null, userType, details, meta?
// DB schema: logs(level, message, context)
export async function auditLog(
  action: string | null,
  userType: string,
  details: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  let ipAddress = 'unknown';
  let userAgent = 'unknown';

  try {
    const head = await headers();
    ipAddress = head.get('x-forwarded-for') || head.get('x-real-ip') || 'unknown';
    userAgent = head.get('user-agent') || 'unknown';
  } catch {
    // headers() unavailable in background tasks
  }

  const resolvedAction = action ?? 'system';
  const message = `${resolvedAction}: ${details}`;
  const context = JSON.stringify({ userType, details, ipAddress, userAgent, ...meta });

  try {
    await pool.execute(
      'INSERT INTO logs (level, message, context, created_at) VALUES (?, ?, ?, NOW())',
      ['info', message, context]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
