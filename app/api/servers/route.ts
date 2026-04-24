import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseBody, serverCreateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const servers = await query('SELECT * FROM vpn_servers ORDER BY id DESC');
    return NextResponse.json(servers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseBody(serverCreateSchema, body);
    if (!parsed.success) return parsed.response;

    const { name, ip_address, domain, ports, protocol } = parsed.data;

    const result: any = await query(
      'INSERT INTO vpn_servers (name, ip_address, domain, ports, protocol) VALUES (?, ?, ?, ?, ?)',
      [name, ip_address, domain ?? null, JSON.stringify(ports ?? [1194]), protocol ?? 'udp']
    );

    return NextResponse.json({ id: result.insertId, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'Valid ID required' }, { status: 400 });
    }
    await query('DELETE FROM vpn_servers WHERE id = ?', [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
