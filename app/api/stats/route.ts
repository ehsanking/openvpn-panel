import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      userCount,
      activeSessions,
      serverCount,
      totalTraffic
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM vpn_users'),
      query('SELECT COUNT(*) as count FROM sessions WHERE status = "active"'),
      query('SELECT COUNT(*) as count FROM vpn_servers WHERE status = "online"'),
      query('SELECT SUM(traffic_total) as total FROM vpn_users')
    ]);

    // Real system stats
    const cpus = os.cpus().length;
    const load1m = os.loadavg()[0];
    const systemLoad = Math.min(100, Math.round((load1m / cpus) * 100));
    const uptimeDays = Math.floor(os.uptime() / 86400);

    return NextResponse.json({
      activeUsers:    userCount[0]?.count    || 0,
      activeSessions: activeSessions[0]?.count || 0,
      onlineServers:  serverCount[0]?.count   || 0,
      totalTraffic:   totalTraffic[0]?.total  || 0,
      systemLoad,
      uptimeDays,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
