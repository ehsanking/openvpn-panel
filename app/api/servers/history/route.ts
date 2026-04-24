import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const history = await query(`
      SELECT 
        h.id, h.status, h.load_score, h.created_at,
        s.name as server_name, s.ip_address
      FROM server_status_history h
      JOIN vpn_servers s ON h.server_id = s.id
      ORDER BY h.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
