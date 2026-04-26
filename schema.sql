CREATE TABLE IF NOT EXISTS vpn_inbounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    port INT NOT NULL,
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vpn_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    role VARCHAR(50) DEFAULT 'user',
    parent_id INT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    last_connected TIMESTAMP NULL,
    traffic_total BIGINT DEFAULT 0,
    traffic_limit_gb INT DEFAULT 10,
    max_connections INT DEFAULT 1,
    cisco_password VARCHAR(255) NULL,
    l2tp_password VARCHAR(255) NULL,
    wg_pubkey VARCHAR(255) NULL,
    wg_ip VARCHAR(50) NULL,
    xray_uuid VARCHAR(255) NULL,
    xray_flow VARCHAR(255) NULL,
    port INT NULL,
    main_protocol VARCHAR(50) NULL,
    custom_config TEXT,
    profile_data TEXT,
    FOREIGN KEY (parent_id) REFERENCES vpn_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vpn_users_port ON vpn_users (port);
CREATE INDEX IF NOT EXISTS idx_users_status_expires ON vpn_users (status, expires_at);

CREATE TABLE IF NOT EXISTS user_inbounds (
    user_id INT NOT NULL,
    inbound_id INT NOT NULL,
    PRIMARY KEY (user_id, inbound_id),
    FOREIGN KEY (user_id) REFERENCES vpn_users(id) ON DELETE CASCADE,
    FOREIGN KEY (inbound_id) REFERENCES vpn_inbounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reseller_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reseller_id INT NOT NULL,
    max_users INT DEFAULT 50,
    allocated_traffic_gb INT DEFAULT 500,
    FOREIGN KEY (reseller_id) REFERENCES vpn_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vpn_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    domain VARCHAR(255),
    ports TEXT,
    protocol VARCHAR(50) DEFAULT 'udp',
    supports_openvpn BOOLEAN DEFAULT TRUE,
    supports_cisco BOOLEAN DEFAULT FALSE,
    supports_l2tp BOOLEAN DEFAULT FALSE,
    supports_wireguard BOOLEAN DEFAULT FALSE,
    supports_xray BOOLEAN DEFAULT FALSE,
    load_score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'online',
    is_active BOOLEAN DEFAULT TRUE,
    bandwidth_ingress INT DEFAULT 0,
    bandwidth_egress INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INT,
    status VARCHAR(50),
    load_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES vpn_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(50) DEFAULT 'info',
    message TEXT,
    context TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT,
    server_id INT,
    username VARCHAR(255),
    ip_address VARCHAR(45),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    status VARCHAR(50) DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES vpn_users(id) ON DELETE SET NULL,
    FOREIGN KEY (server_id) REFERENCES vpn_servers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_server_status ON sessions (server_id, status);

INSERT OR IGNORE INTO vpn_servers (id, name, ip_address, ports, protocol) VALUES 
(1, 'Node-01-Main', '45.12.99.1', '[1194, 443]', 'udp');

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` TEXT
);

INSERT OR IGNORE INTO settings (`key`, `value`) VALUES 
('panelName', 'OpenVPN Control Plane'),
('defaultCipher', 'AES-256-GCM'),
('defaultDns', '1.1.1.1'),
('caCert', 'PENDING_CA_GENERATION');

INSERT OR IGNORE INTO vpn_users (id, username, role, status, traffic_total) VALUES
(1, 'admin', 'admin', 'active', 15200000000);

