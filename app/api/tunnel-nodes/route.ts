import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-utils';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const TunnelNodeSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  country_code: z.string().max(10).optional(),
  flag_emoji: z.string().max(10).optional(),
  remote_ip: z.string().min(1),
  tunnel_port: z.number().int().min(1).max(65535).default(443),
  tunnel_type: z.enum(['wss', 'grpc', 'quic', 'h2']).default('wss'),
  local_forward_port: z.number().int().min(1).max(65535),
  sni_host: z.string().default('www.google.com'),
});

// Generate a secure random secret for tunnel authentication
function generateTunnelSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function GET() {
  try {
    const nodes = await query(`
      SELECT * FROM tunnel_nodes 
      ORDER BY created_at DESC
    `);
    return NextResponse.json(nodes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = TunnelNodeSchema.parse(body);
    
    const tunnel_secret = generateTunnelSecret();
    
    const result: any = await query(
      `INSERT INTO tunnel_nodes 
       (name, location, country_code, flag_emoji, remote_ip, tunnel_port, tunnel_type, tunnel_secret, local_forward_port, sni_host, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        validated.name,
        validated.location,
        validated.country_code || null,
        validated.flag_emoji || null,
        validated.remote_ip,
        validated.tunnel_port,
        validated.tunnel_type,
        tunnel_secret,
        validated.local_forward_port,
        validated.sni_host,
      ]
    );
    
    // Return the created node with the generated secret
    const newNode = await query('SELECT * FROM tunnel_nodes WHERE id = ?', [result.insertId]);
    
    return NextResponse.json({ 
      success: true, 
      node: (newNode as any[])[0],
      tunnel_secret 
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID required');

    await query('DELETE FROM tunnel_nodes WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID required');

    const body = await req.json();
    const { status, is_active } = body;

    if (status) {
      await query('UPDATE tunnel_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    }
    
    if (typeof is_active === 'boolean') {
      await query('UPDATE tunnel_nodes SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [is_active ? 1 : 0, id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
