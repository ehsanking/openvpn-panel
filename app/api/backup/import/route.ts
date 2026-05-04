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
                    await connection.query(
                        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.`value`',
                        [row.key, row.value]
                    );
                }
            }

            if (backup.users && backup.users.length > 0) {
                for (const user of backup.users) {
                    await connection.query(
                        `INSERT INTO vpn_users
                         (id, username, role, parent_id, status, traffic_limit_gb, traffic_total, max_connections, port, main_protocol, expires_at, created_at, last_connected)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET
                            username = excluded.username,
                            role = excluded.role,
                            parent_id = excluded.parent_id,
                            status = excluded.status,
                            traffic_limit_gb = excluded.traffic_limit_gb,
                            traffic_total = excluded.traffic_total,
                            max_connections = excluded.max_connections,
                            port = excluded.port,
                            main_protocol = excluded.main_protocol,
                            expires_at = excluded.expires_at,
                            last_connected = excluded.last_connected`,
                        [
                            user.id, user.username, user.role, user.parent_id ?? null,
                            user.status, user.traffic_limit_gb ?? 0, user.traffic_total ?? 0,
                            user.max_connections ?? 1, user.port ?? null, user.main_protocol ?? null,
                            user.expires_at ?? null, user.created_at ?? null, user.last_connected ?? null
                        ]
                    );
                }
            }

            if (backup.servers && backup.servers.length > 0) {
                for (const server of backup.servers) {
                    await connection.query(
                        `INSERT INTO vpn_servers
                         (id, name, ip_address, domain, protocol, status, is_active, load_score, bandwidth_ingress, bandwidth_egress, latency_ms, ports, supports_openvpn, supports_cisco, supports_l2tp, supports_wireguard, supports_xray)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET
                            name = excluded.name,
                            ip_address = excluded.ip_address,
                            domain = excluded.domain,
                            protocol = excluded.protocol,
                            status = excluded.status,
                            is_active = excluded.is_active,
                            load_score = excluded.load_score,
                            bandwidth_ingress = excluded.bandwidth_ingress,
                            bandwidth_egress = excluded.bandwidth_egress,
                            latency_ms = excluded.latency_ms,
                            ports = excluded.ports,
                            supports_openvpn = excluded.supports_openvpn,
                            supports_cisco = excluded.supports_cisco,
                            supports_l2tp = excluded.supports_l2tp,
                            supports_wireguard = excluded.supports_wireguard,
                            supports_xray = excluded.supports_xray`,
                        [
                            server.id, server.name, server.ip_address, server.domain || null,
                            server.protocol, server.status, server.is_active ? 1 : 0, server.load_score ?? 0,
                            server.bandwidth_ingress ?? 0, server.bandwidth_egress ?? 0, server.latency_ms ?? 0,
                            JSON.stringify(server.ports || []),
                            server.supports_openvpn ? 1 : 0, server.supports_cisco ? 1 : 0,
                            server.supports_l2tp ? 1 : 0, server.supports_wireguard ? 1 : 0,
                            server.supports_xray ? 1 : 0
                        ]
                    );
                }
            }

            if (backup.resellers && backup.resellers.length > 0) {
                for (const res of backup.resellers) {
                     await connection.query(
                        `INSERT INTO reseller_limits
                         (id, reseller_id, max_users, allocated_traffic_gb)
                         VALUES (?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET
                            max_users = excluded.max_users,
                            allocated_traffic_gb = excluded.allocated_traffic_gb`,
                        [res.id, res.reseller_id, res.max_users, res.allocated_traffic_gb]
                    );
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
