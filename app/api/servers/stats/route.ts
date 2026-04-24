import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Simulate data: update random servers with bandwidth/latency to make the dashboard look alive
    await pool.query(`
        UPDATE vpn_servers 
        SET bandwidth_ingress = FLOOR(RAND() * 500), 
            bandwidth_egress = FLOOR(RAND() * 500), 
            latency_ms = FLOOR(RAND() * 100) + 10
        WHERE is_active = TRUE
    `);
    
    // Simulate history logging occasionally (10% chance)
    if (Math.random() < 0.1) {
        await pool.query(`
            INSERT INTO server_status_history (server_id, status, load_score)
            SELECT id, status, load_score FROM vpn_servers WHERE is_active = TRUE;
        `);
    }

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
