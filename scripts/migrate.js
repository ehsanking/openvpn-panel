import mysql from 'mysql2/promise';

async function migrate() {
    const poolConfig = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    };
    if (!poolConfig.host) {
        console.log("No DB connection in env. Skipping.");
        return;
    }
    const pool = mysql.createPool(poolConfig);
    try {
        console.log("Applying db migrations...");
        
        await pool.query('ALTER TABLE vpn_users ADD COLUMN password_hash VARCHAR(255) NULL;');
        console.log("Added password_hash to vpn_users");
    } catch(e) { console.log('vpn_users.password_hash might already exist', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_users ADD COLUMN custom_config JSON NULL;');
        console.log("Added custom_config to vpn_users");
    } catch(e) { console.log('vpn_users.custom_config might already exist', e.message); }

    try {
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN bandwidth_ingress INT DEFAULT 0;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN bandwidth_egress INT DEFAULT 0;');
        await pool.query('ALTER TABLE vpn_servers ADD COLUMN latency_ms INT DEFAULT 0;');
        console.log("Added stats to vpn_servers");
    } catch(e) { console.log('vpn_servers might already have those fields', e.message); }

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
        console.log("Created server_status_history");
    } catch (e) { console.log(e.message); }

    process.exit(0);
}
migrate();
