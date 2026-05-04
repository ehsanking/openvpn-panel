import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * Aggregate counts for the admin dashboard. Cheap queries — fine to call on
 * every dashboard mount. Returns:
 *   {
 *     inbounds: { total, byProtocol: { openvpn: n, wireguard: n, ... } },
 *     users:    { total, active, disabled, expired },
 *     assignments: number   // rows in user_inbounds
 *   }
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const [inboundsTotalRow] = await query('SELECT COUNT(*) as c FROM vpn_inbounds');
    const inboundsTotal = inboundsTotalRow?.c ?? 0;

    const inboundsByProtocolRows = await query(
      'SELECT protocol, COUNT(*) as c FROM vpn_inbounds GROUP BY protocol'
    );
    const byProtocol: Record<string, number> = {};
    for (const r of inboundsByProtocolRows) byProtocol[r.protocol] = r.c;

    const [usersTotalRow] = await query('SELECT COUNT(*) as c FROM vpn_users');
    const [usersActiveRow] = await query(
      "SELECT COUNT(*) as c FROM vpn_users WHERE status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"
    );
    const [usersExpiredRow] = await query(
      "SELECT COUNT(*) as c FROM vpn_users WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP"
    );
    const [usersDisabledRow] = await query(
      "SELECT COUNT(*) as c FROM vpn_users WHERE status IN ('disabled', 'inactive', 'suspended', 'revoked')"
    );

    const [assignmentsRow] = await query('SELECT COUNT(*) as c FROM user_inbounds');

    const recentUsers = await query(
      `SELECT id, username, role, status, created_at
       FROM vpn_users ORDER BY created_at DESC LIMIT 5`
    );
    const recentInbounds = await query(
      `SELECT id, name, protocol, port, server_address, status, created_at
       FROM vpn_inbounds ORDER BY created_at DESC LIMIT 5`
    );

    return NextResponse.json({
      inbounds: {
        total: inboundsTotal,
        byProtocol,
      },
      users: {
        total: usersTotalRow?.c ?? 0,
        active: usersActiveRow?.c ?? 0,
        disabled: usersDisabledRow?.c ?? 0,
        expired: usersExpiredRow?.c ?? 0,
      },
      assignments: assignmentsRow?.c ?? 0,
      recent: {
        users: recentUsers,
        inbounds: recentInbounds,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
