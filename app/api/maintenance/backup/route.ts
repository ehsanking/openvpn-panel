import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const users = await query('SELECT * FROM vpn_users');
    const settings = await query('SELECT * FROM settings');
    const activeSessions = await query('SELECT * FROM sessions');
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        users,
        settings,
        sessions: activeSessions
      }
    };
    
    return NextResponse.json(backup);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
