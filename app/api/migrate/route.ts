import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        await pool.query("ALTER TABLE vpn_users MODIFY COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active';");
    } catch(e: any) { console.log('user status mod fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN password_hash VARCHAR(255) NULL;');
    } catch(e: any) { console.log('user password_hash mod fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN client_cert TEXT NULL;');
    } catch(e: any) { console.log('user client_cert mod fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN client_key TEXT NULL;');
    } catch(e: any) { console.log('user client_key mod fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN custom_config JSON NULL;');
    } catch(e: any) { console.log('user custom_config mod fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN bandwidth_ingress INT DEFAULT 0;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN bandwidth_egress INT DEFAULT 0;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN latency_ms INT DEFAULT 0;');
    } catch(e: any) { console.log('server columns mod fail: ', e.message); }

    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS server_status_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            server_id INT,
            status ENUM('online', 'offline'),
            load_score INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES vpn_servers(id) ON DELETE CASCADE
        );
        `);
    } catch (e: any) { console.log('history create fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN role ENUM("admin", "reseller", "user") DEFAULT "user";');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN parent_id INT NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN max_connections INT DEFAULT 1;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN cisco_password VARCHAR(255) NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN l2tp_password VARCHAR(255) NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN wg_pubkey VARCHAR(255) NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN wg_ip VARCHAR(50) NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN xray_uuid VARCHAR(255) NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN xray_flow VARCHAR(255) NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN port INT NULL;');
        await pool.query('ALTER TABLE vpn_users ADD COLUMN main_protocol VARCHAR(50) NULL;');
    } catch(e: any) { console.log('user new columns mod fail: ', e.message); }

    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS reseller_limits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reseller_id INT NOT NULL,
            max_users INT DEFAULT 50,
            allocated_traffic_gb INT DEFAULT 500,
            FOREIGN KEY (reseller_id) REFERENCES vpn_users(id) ON DELETE CASCADE
        );
        `);
    } catch (e: any) { console.log('reseller_limits create fail: ', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN supports_openvpn BOOLEAN DEFAULT TRUE;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN supports_cisco BOOLEAN DEFAULT FALSE;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN supports_l2tp BOOLEAN DEFAULT FALSE;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN supports_wireguard BOOLEAN DEFAULT FALSE;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN supports_xray BOOLEAN DEFAULT FALSE;');
    } catch(e: any) { console.log('server features mod fail: ', e.message); }

    return NextResponse.json({ success: true });
}
