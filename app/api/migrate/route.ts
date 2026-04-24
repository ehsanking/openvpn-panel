import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN password_hash VARCHAR(255) NULL;');
    } catch(e: any) { console.log('user password_hash mod fail: ', e.message); }

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

    return NextResponse.json({ success: true });
}
