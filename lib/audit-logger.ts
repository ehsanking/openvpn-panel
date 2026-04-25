import { headers } from 'next/headers';
import pool from './db';

interface AuditLogOptions {
  dbQuery?: any;
}

export async function auditLog(
  userId: number | string | null,
  action: string,
  details: string,
  options: AuditLogOptions = {}
) {
  const query = options.dbQuery || pool;
  
  let ipAddress = 'unknown';
  let userAgent = 'unknown';

  try {
    const head = await headers();
    ipAddress = head.get('x-forwarded-for') || head.get('x-real-ip') || 'unknown';
    userAgent = head.get('user-agent') || 'unknown';
  } catch (error) {
    // Headers might not be available in background tasks or certain contexts
    console.warn('Could not retrieve headers for audit log:', error);
  }

  try {
    await query.execute(
      'INSERT INTO logs (user_id, action, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, action, details, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
