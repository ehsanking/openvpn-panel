import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateApiKey, requirePermission } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const perm = requirePermission(auth.record.permissions, 'read:stats');
  if (perm) return perm;

  const [users, sessions, servers, traffic, avgLoad] = await Promise.all([
    query('SELECT COUNT(*) as count FROM vpn_users'),
    query('SELECT COUNT(*) as count FROM sessions WHERE status = "active"'),
    query('SELECT COUNT(*) as count FROM vpn_servers WHERE status = "online"'),
    query('SELECT SUM(traffic_total) as total FROM vpn_users'),
    query('SELECT AVG(load_score) as avg FROM vpn_servers WHERE is_active = TRUE'),
  ]);

  return NextResponse.json({
    totalUsers: users[0]?.count ?? 0,
    activeSessions: sessions[0]?.count ?? 0,
    onlineServers: servers[0]?.count ?? 0,
    totalTrafficBytes: traffic[0]?.total ?? 0,
    avgServerLoad: Math.round(avgLoad[0]?.avg ?? 0),
    generatedAt: new Date().toISOString(),
  });
}
