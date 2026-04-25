import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Simulate data: update random servers with bandwidth/latency to make the dashboard look alive
    // Removed direct pool.query with string manipulation here for security. In a real-world scenario, 
    // a backend task / cron job will gather these stats and insert them via parameterized queries.
    
    // Fetch server info and join with active session counts
    const servers = await query(`
      SELECT 
        s.id,
        s.name,
        s.ip_address,
        s.load_score,
        s.status,
        s.bandwidth_ingress,
        s.bandwidth_egress,
        s.latency_ms,
        (SELECT COUNT(*) FROM sessions WHERE server_id = s.id AND status = 'active') as active_connections
      FROM vpn_servers s
      WHERE s.is_active = TRUE
      ORDER BY s.load_score ASC
    `);

    return NextResponse.json(servers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
