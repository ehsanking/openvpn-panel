import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    const body = await req.json();
    
    // Bulk create support
    const usersToCreate = Array.isArray(body) ? body : [body];
    const results = [];
    
    for (const userData of usersToCreate) {
      const { 
        username, 
        password, 
        protocol, 
        expires_at, 
        traffic_limit_gb,
        role,
        cisco_password,
        l2tp_password,
        max_connections,
        xray_uuid,
        xray_flow,
        port,
        main_protocol
      } = userData;
      
      if (!username) continue;
      
      // Port and Protocol validation
      if (port && main_protocol) {
        const existingPortUsers = await query('SELECT main_protocol FROM vpn_users WHERE port = ? LIMIT 1', [port]) as any[];
        if (existingPortUsers.length > 0) {
          if (existingPortUsers[0].main_protocol !== main_protocol) {
            return NextResponse.json({ 
              error: `Port ${port} is already in use by protocol ${existingPortUsers[0].main_protocol}. Each port can only run one protocol.` 
            }, { status: 400 });
          }
        }
      }

      let passwordHash = null;
      if (password) {
        passwordHash = bcrypt.hashSync(password, 10);
      }
      
      // Auto-generate UUID if not provided so they are ready for Xray
      const generatedXrayUuid = xray_uuid || crypto.randomUUID();
      const customConfig = JSON.stringify({ protocol: protocol || 'udp' });

      try {
        await query(
          `INSERT INTO vpn_users 
            (username, password_hash, custom_config, expires_at, traffic_limit_gb, role, cisco_password, l2tp_password, max_connections, xray_uuid, xray_flow, port, main_protocol) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            username, 
            passwordHash, 
            customConfig, 
            expires_at || null, 
            traffic_limit_gb || 10,
            role || 'user',
            cisco_password || null,
            l2tp_password || null,
            max_connections || 1,
            generatedXrayUuid,
            xray_flow || '',
            port || null,
            main_protocol || protocol || 'openvpn'
          ]
        );
        results.push(username);
      } catch (insertError: any) {
        console.error("Failed to insert user", username, insertError.message);
      }
    }
    
    return NextResponse.json({ success: true, created: results.length });
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
