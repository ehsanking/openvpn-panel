import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    return NextResponse.json({
      activeUsers: userCount[0]?.count || 0,
      activeSessions: activeSessions[0]?.count || 0,
      onlineServers: serverCount[0]?.count || 0,
      totalTraffic: totalTraffic[0]?.total || 0,
      systemLoad: 0,
      uptimeDays: 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
