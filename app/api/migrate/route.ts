import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const authHeader = req.headers.get('x-migration-token');
    const migrationToken = process.env.MIGRATION_TOKEN;
    
    if (!migrationToken || !authHeader || authHeader !== migrationToken) {
        logger.warn('Unauthorized migration attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('Starting database migration...');

        const migrations = [
            "ALTER TABLE vpn_users MODIFY COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active';",
            'ALTER TABLE vpn_users ADD COLUMN password_hash VARCHAR(255) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN client_cert TEXT NULL;',
            'ALTER TABLE vpn_users ADD COLUMN client_key TEXT NULL;',
            'ALTER TABLE vpn_users ADD COLUMN custom_config JSON NULL;',
            'ALTER TABLE vpn_servers ADD COLUMN bandwidth_ingress INT DEFAULT 0;',
            'ALTER TABLE vpn_servers ADD COLUMN bandwidth_egress INT DEFAULT 0;',
            'ALTER TABLE vpn_servers ADD COLUMN latency_ms INT DEFAULT 0;',
            `
            CREATE TABLE IF NOT EXISTS server_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                server_id INT,
                status ENUM('online', 'offline'),
                load_score INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (server_id) REFERENCES vpn_servers(id) ON DELETE CASCADE
            );
            `,
            'ALTER TABLE vpn_users ADD COLUMN role ENUM("admin", "reseller", "user") DEFAULT "user";',
            'ALTER TABLE vpn_users ADD COLUMN parent_id INT NULL;',
            'ALTER TABLE vpn_users ADD COLUMN max_connections INT DEFAULT 1;',
            'ALTER TABLE vpn_users ADD COLUMN cisco_password VARCHAR(255) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN l2tp_password VARCHAR(255) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN wg_pubkey VARCHAR(255) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN wg_ip VARCHAR(50) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN xray_uuid VARCHAR(255) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN xray_flow VARCHAR(255) NULL;',
            'ALTER TABLE vpn_users ADD COLUMN port INT NULL;',
            'ALTER TABLE vpn_users ADD COLUMN main_protocol VARCHAR(50) NULL;',
            `
            CREATE TABLE IF NOT EXISTS reseller_limits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reseller_id INT NOT NULL,
                max_users INT DEFAULT 50,
                allocated_traffic_gb INT DEFAULT 500,
                FOREIGN KEY (reseller_id) REFERENCES vpn_users(id) ON DELETE CASCADE
            );
            `,
            'ALTER TABLE vpn_servers ADD COLUMN supports_openvpn BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE vpn_servers ADD COLUMN supports_cisco BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE vpn_servers ADD COLUMN supports_l2tp BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE vpn_servers ADD COLUMN supports_wireguard BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE vpn_servers ADD COLUMN supports_xray BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE vpn_users ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;'
        ];

        for (const sql of migrations) {
            try {
                await query(sql);
            } catch (e: any) {
                // We ignore "already exists" errors during migration
                if (!e.message.includes('already exists') && !e.message.includes('Duplicate column name')) {
                    logger.error({ sql, err: e.message }, 'Migration step failed');
                }
            }
        }

        logger.info('Migration finished successfully');
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
