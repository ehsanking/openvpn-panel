import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';
import { handleApiError } from '@/lib/api-utils';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Revocation logic
    await query('UPDATE vpn_users SET status = ? WHERE id = ?', ['revoked', id]);
    await auditLog('revoke_user', 'admin', id, { id });
    
    // Stub for CRL broadcast/trigger
    console.log(`CRITICAL: CRL update triggered for user ${id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
