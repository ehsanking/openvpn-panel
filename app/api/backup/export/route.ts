import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const users: any[] = await query('SELECT * FROM vpn_users');
        const servers: any[] = await query('SELECT * FROM vpn_servers');
        const settings: any[] = await query('SELECT * FROM settings');
        const resellers: any[] = await query('SELECT * FROM reseller_limits');
        
        const backup = {
            version: '2.0',
            exported_at: new Date().toISOString(),
            users,
            servers,
            settings,
            resellers
        };

        return new NextResponse(JSON.stringify(backup, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="backup.json"'
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
