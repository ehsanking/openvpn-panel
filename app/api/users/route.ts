import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Migration: Add traffic_limit_gb if not exists (Lazy migration)
    try {
      await query('ALTER TABLE vpn_users ADD COLUMN traffic_limit_gb INT DEFAULT 10');
    } catch (e) {
      // Column likely already exists
    }

    // Auto-suspend expired users
    await query('UPDATE vpn_users SET status = "suspended" WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP AND status = "active"');
    
    // Auto-suspend users who exceeded traffic limit
    // 1 GB = 1073741824 bytes
    await query(`
      UPDATE vpn_users 
      SET status = 'suspended' 
      WHERE status = 'active' 
      AND traffic_limit_gb IS NOT NULL 
      AND traffic_total >= (traffic_limit_gb * 1073741824)
    `);

    const users = await query('SELECT * FROM vpn_users ORDER BY id DESC');
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { username, password, protocol, expires_at, traffic_limit_gb } = await req.json();
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });
    
    let passwordHash = null;
    if (password) {
      passwordHash = bcrypt.hashSync(password, 10);
    }
    const customConfig = JSON.stringify({ protocol: protocol || 'udp' });

    await query(
      'INSERT INTO vpn_users (username, password_hash, custom_config, expires_at, traffic_limit_gb) VALUES (?, ?, ?, ?, ?)', 
      [username, passwordHash, customConfig, expires_at || null, traffic_limit_gb || 10]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    await query('UPDATE vpn_users SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await query('DELETE FROM vpn_users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
