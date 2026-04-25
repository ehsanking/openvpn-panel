import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const ServerSchema = z.object({
  name: z.string().min(1).max(255),
  ip_address: z.string().ip(),
  domain: z.string().optional().nullable(),
  ports: z.array(z.number().int().min(1).max(65535)).default([1194]),
  protocol: z.enum(['udp', 'tcp']).default('udp')
});

export async function GET() {
    try {
        const servers = await query('SELECT * FROM vpn_servers ORDER BY id DESC');
        return NextResponse.json(servers);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validated = ServerSchema.parse(body);
        const { name, ip_address, domain, ports, protocol } = validated;
        
        const result: any = await query(
            'INSERT INTO vpn_servers (name, ip_address, domain, ports, protocol) VALUES (?, ?, ?, ?, ?)',
            [name, ip_address, domain || null, JSON.stringify(ports), protocol]
        );
        
        return NextResponse.json({ id: result.insertId, success: true });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) throw new Error('ID required');

        await query('DELETE FROM vpn_servers WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
