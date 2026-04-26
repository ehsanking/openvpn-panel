import { headers } from 'next/headers';
import pool from './db';

interface AuditLogOptions {
  dbQuery?: any;
  [key: string]: any;
}

export async function auditLog(
  userId: number | string | null,
  action: string,
  details: string,
  options: AuditLogOptions = {}
) {
  const query = options.dbQuery || pool;
  const { dbQuery, ...contextParams } = options;
  
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

  const context = {
    userId,
    action,
    details,
    ipAddress,
    userAgent,
    ...contextParams
  };

  try {
    await query.execute(
      'INSERT INTO logs (level, message, context, created_at) VALUES (?, ?, ?, NOW())',
      [
        action.includes('error') || action.includes('failed') ? 'error' : 'info',
        `${action} - ${details}`,
        JSON.stringify(context)
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
