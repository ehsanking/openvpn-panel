import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      userCount,
      activeUsers,
      activeSessions,
      serverCount,
      totalTraffic
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM vpn_users'),
      query('SELECT COUNT(*) as count FROM vpn_users WHERE status = "active"'),
      query('SELECT COUNT(*) as count FROM sessions WHERE status = "active"'),
      query('SELECT COUNT(*) as count FROM vpn_servers WHERE status = "online"'),
      query('SELECT SUM(traffic_total) as total FROM vpn_users')
    ]);

    const cpus = os.cpus();
    const loadAverage = os.loadavg()[0]; // 1 minute load average
    const systemLoad = Math.round((loadAverage / cpus.length) * 100);
    const uptime = os.uptime();
    const uptimeDays = Math.floor(uptime / 86400);

    return NextResponse.json({
      totalUsers: userCount[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      activeSessions: activeSessions[0]?.count || 0,
      onlineServers: serverCount[0]?.count || 0,
      totalTraffic: totalTraffic[0]?.total || 0,
      systemLoad: systemLoad > 100 ? 100 : systemLoad,
      uptimeDays: uptimeDays,
      memoryUsagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

