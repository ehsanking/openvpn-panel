import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const BackupSchema = z.object({
    version: z.string(),
    users: z.array(z.any()).optional(),
    servers: z.array(z.any()).optional(),
    settings: z.array(z.any()).optional(),
    resellers: z.array(z.any()).optional()
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validated = BackupSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json({ error: 'Invalid backup format', details: validated.error.format() }, { status: 400 });
        }

        const backup = validated.data;
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            if (backup.settings && backup.settings.length > 0) {
                for (const row of backup.settings) {
                    await connection.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [row.key, row.value]);
                }
            }

            if (backup.users && backup.users.length > 0) {
                for (const user of backup.users) {
                    // Update only specific safe fields to avoid breaking sensitive data if it exists
                    await connection.query(`
                        INSERT INTO vpn_users 
                        (id, username, role, parent_id, status, traffic_limit_gb, traffic_total, traffic_up, traffic_down, max_connections, port, main_protocol, expires_at, created_at, last_connected) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        username = VALUES(username), role = VALUES(role), parent_id = VALUES(parent_id), status = VALUES(status), 
                        traffic_limit_gb = VALUES(traffic_limit_gb), traffic_total = VALUES(traffic_total), traffic_up = VALUES(traffic_up), 
                        traffic_down = VALUES(traffic_down), max_connections = VALUES(max_connections), port = VALUES(port), 
                        main_protocol = VALUES(main_protocol), expires_at = VALUES(expires_at)
                    `, [
                        user.id, user.username, user.role, user.parent_id, 
                        user.status, user.traffic_limit_gb, user.traffic_total, user.traffic_up, user.traffic_down, user.max_connections, 
                        user.port, user.main_protocol, user.expires_at, user.created_at, user.last_connected
                    ]);
                }
            }

            if (backup.servers && backup.servers.length > 0) {
                for (const server of backup.servers) {
                    await connection.query(`
                        INSERT INTO vpn_servers 
                        (id, name, ip_address, domain, protocol, status, is_active, load_score, connected_clients, bandwidth_ingress, bandwidth_egress, latency_ms, last_check, ports, supports_openvpn, supports_cisco, supports_l2tp, supports_wireguard, supports_xray) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        name = VALUES(name), ip_address = VALUES(ip_address), domain = VALUES(domain), protocol = VALUES(protocol), 
                        status = VALUES(status), is_active = VALUES(is_active), load_score = VALUES(load_score), 
                        connected_clients = VALUES(connected_clients), bandwidth_ingress = VALUES(bandwidth_ingress), 
                        bandwidth_egress = VALUES(bandwidth_egress), latency_ms = VALUES(latency_ms), last_check = VALUES(last_check), 
                        ports = VALUES(ports), supports_openvpn = VALUES(supports_openvpn), supports_cisco = VALUES(supports_cisco), 
                        supports_l2tp = VALUES(supports_l2tp), supports_wireguard = VALUES(supports_wireguard), supports_xray = VALUES(supports_xray)
                    `, [
                        server.id, server.name, server.ip_address, server.domain || null, server.protocol, server.status, server.is_active, 
                        server.load_score, server.connected_clients, server.bandwidth_ingress, server.bandwidth_egress, server.latency_ms, server.last_check, JSON.stringify(server.ports || []), 
                        server.supports_openvpn, server.supports_cisco, server.supports_l2tp, server.supports_wireguard, server.supports_xray
                    ]);
                }
            }
            
            if (backup.resellers && backup.resellers.length > 0) {
                for (const res of backup.resellers) {
                     await connection.query(`
                        INSERT INTO reseller_limits
                        (id, reseller_id, max_users, allocated_traffic_gb) 
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        max_users = VALUES(max_users), allocated_traffic_gb = VALUES(allocated_traffic_gb)
                     `, [res.id, res.reseller_id, res.max_users, res.allocated_traffic_gb]);
                }
            }
            
            await connection.commit();
            logger.info('Backup imported successfully');
        } catch (err) {
            await connection.rollback();
            logger.error({ err }, 'Backup import failed');
            throw err;
        } finally {
            connection.release();
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
