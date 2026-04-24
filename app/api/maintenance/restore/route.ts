import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { data } = await req.json();
    if (!data) throw new Error("Invalid backup data");

    // Clear existing data (caution!)
    await query('SET FOREIGN_KEY_CHECKS = 0');
    await query('TRUNCATE sessions');
    await query('TRUNCATE vpn_users');
    await query('DELETE FROM settings');
    await query('SET FOREIGN_KEY_CHECKS = 1');

    // Restore Settings
    if (data.settings) {
      for (const s of data.settings) {
        await query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [s.key, s.value]);
      }
    }

    // Restore Users
    if (data.users) {
      for (const u of data.users) {
        await query('INSERT INTO vpn_users (id, username, status, created_at, last_connected) VALUES (?, ?, ?, ?, ?)', 
          [u.id, u.username, u.status, u.created_at, u.last_connected]);
      }
    }

    // Restore Sessions
    if (data.sessions) {
      for (const s of data.sessions) {
        await query('INSERT INTO sessions (id, user_id, username, ip_address, start_time, status) VALUES (?, ?, ?, ?, ?, ?)',
          [s.id, s.user_id, s.username, s.ip_address, s.start_time, s.status]);
      }
    }

    return NextResponse.json({ success: true, message: "Data restored successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
