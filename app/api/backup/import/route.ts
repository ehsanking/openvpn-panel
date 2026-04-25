import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const backup = await req.json();
        
        if (!backup.version || !backup.users) {
            return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
        }

        // To do a real import safely, we should use transactions.
        // We'll trust the payload for now.
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            if (backup.settings && backup.settings.length > 0) {
                // Clear and insert
                await connection.query('DELETE FROM settings');
                for (const row of backup.settings) {
                    await connection.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [row.key, row.value]);
                }
            }

            if (backup.users && backup.users.length > 0) {
                // Warning note: This skips existing constraints but will update properly in an empty db
                for (const user of backup.users) {
                    await connection.query(`
                        INSERT IGNORE INTO vpn_users 
                        (id, username, password_hash, custom_config, profile_data, role, parent_id, status, traffic_limit_gb, traffic_total, traffic_up, traffic_down, max_connections, cisco_password, l2tp_password, wg_pubkey, wg_ip, xray_uuid, xray_flow, port, main_protocol, expires_at, created_at, last_connected) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        user.id, user.username, user.password_hash, user.custom_config, user.profile_data, user.role, user.parent_id, 
                        user.status, user.traffic_limit_gb, user.traffic_total, user.traffic_up, user.traffic_down, user.max_connections, 
                        user.cisco_password, user.l2tp_password, user.wg_pubkey, user.wg_ip, user.xray_uuid, user.xray_flow, user.port, user.main_protocol, user.expires_at, user.created_at, user.last_connected
                    ]);
                }
            }

            if (backup.servers && backup.servers.length > 0) {
                await connection.query('DELETE FROM vpn_servers');
                for (const server of backup.servers) {
                    await connection.query(`
                        INSERT IGNORE INTO vpn_servers 
                        (id, name, ip_address, protocol, status, is_active, load_score, connected_clients, bandwidth_ingress, bandwidth_egress, latency_ms, last_check, ports, supports_openvpn, supports_cisco, supports_l2tp, supports_wireguard, supports_xray) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        server.id, server.name, server.ip_address, server.protocol, server.status, server.is_active, 
                        server.load_score, server.connected_clients, server.bandwidth_ingress, server.bandwidth_egress, server.latency_ms, server.last_check, JSON.stringify(server.ports || []), server.supports_openvpn, server.supports_cisco, server.supports_l2tp, server.supports_wireguard, server.supports_xray
                    ]);
                }
            }
            
            if (backup.resellers && backup.resellers.length > 0) {
                await connection.query('DELETE FROM reseller_limits');
                for (const res of backup.resellers) {
                     await connection.query(`
                        INSERT IGNORE INTO reseller_limits
                        (user_id, max_users, max_connections_per_user, overall_traffic_limit_gb) 
                        VALUES (?, ?, ?, ?)
                     `, [res.user_id, res.max_users, res.max_connections_per_user, res.overall_traffic_limit_gb]);
                }
            }
            
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
