import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const [inbounds] = await db.execute('SELECT * FROM vpn_inbounds ORDER BY created_at DESC');
    return NextResponse.json({ inbounds });
  } catch (error: any) {
    console.error('Error fetching inbounds:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, protocol, port, remark } = await req.json();
    
    if (!name || !protocol || !port) {
      return NextResponse.json({ error: 'Name, protocol, and port are required' }, { status: 400 });
    }

    const [result] = await db.execute(
      'INSERT INTO vpn_inbounds (name, protocol, port, remark) VALUES (?, ?, ?, ?)',
      [name, protocol, parseInt(port, 10), remark || '']
    );

    return NextResponse.json({ success: true, id: (result as any).insertId });
  } catch (error: any) {
    console.error('Error creating inbound:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
