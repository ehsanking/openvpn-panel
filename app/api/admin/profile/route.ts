import { NextResponse } from 'next/server';
import { generateOvpnProfile } from '@/lib/ovpn-generator';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { username, config } = await req.json();
    if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

    const servers = await query('SELECT * FROM vpn_servers WHERE is_active = TRUE');
    const profile = await generateOvpnProfile(username, servers, config);

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
