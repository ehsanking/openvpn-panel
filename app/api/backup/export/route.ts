import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const users: any[] = await query('SELECT id, username, role, parent_id, status, traffic_limit_gb, traffic_total, traffic_up, traffic_down, max_connections, port, main_protocol, expires_at, created_at, last_connected FROM vpn_users');
        const servers: any[] = await query('SELECT id, name, ip_address, domain, protocol, status, is_active, load_score, connected_clients, bandwidth_ingress, bandwidth_egress, latency_ms, last_check, ports, supports_openvpn, supports_cisco, supports_l2tp, supports_wireguard, supports_xray FROM vpn_servers');
        const settings: any[] = await query('SELECT `key`, `value` FROM settings');
        const resellers: any[] = await query('SELECT id, reseller_id, max_users, allocated_traffic_gb FROM reseller_limits');
        
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
