import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateApiKey, requirePermission } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const perm = requirePermission(auth.record.permissions, 'read:servers');
  if (perm) return perm;

  const servers: any[] = await query(`
    SELECT id, name, ip_address, domain, ports, protocol,
           supports_openvpn, supports_cisco, supports_l2tp,
           supports_wireguard, supports_xray,
           load_score, status, bandwidth_ingress, bandwidth_egress, latency_ms
    FROM vpn_servers
    WHERE is_active = TRUE
    ORDER BY load_score ASC
  `);

  return NextResponse.json({ data: servers });
}
