import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateOvpnProfile } from '@/lib/ovpn-generator';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');
        
        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

        // verify user exists, is active, and not expired
        const users: any = await query('SELECT * FROM vpn_users WHERE username = ? AND status = "active" AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)', [username]);
        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found, suspended, or expired' }, { status: 404 });
        }

        // Fetch active servers for multi-node support
        const servers: any = await query('SELECT ip_address, ports FROM vpn_servers WHERE status = "online" AND is_active = TRUE');

        const profile = await generateOvpnProfile(username, servers);
        
        return NextResponse.json({ profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
