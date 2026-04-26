CREATE TABLE IF NOT EXISTS vpn_inbounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    port INT NOT NULL,
    server_address VARCHAR(255) NOT NULL,
    remark TEXT,
    status VARCHAR(50) DEFAULT 'active',
    -- OpenVPN specific
    ovpn_protocol VARCHAR(10) DEFAULT 'udp',
    ovpn_cipher VARCHAR(50) DEFAULT 'AES-256-GCM',
    ovpn_auth VARCHAR(50) DEFAULT 'SHA256',
    ovpn_dev VARCHAR(10) DEFAULT 'tun',
    -- WireGuard specific
    wg_private_key VARCHAR(255),
    wg_public_key VARCHAR(255),
    wg_address VARCHAR(50),
    wg_dns VARCHAR(100),
    wg_mtu INT DEFAULT 1420,
    wg_persistent_keepalive INT DEFAULT 25,
    -- Cisco AnyConnect (ocserv) specific
    cisco_auth_method VARCHAR(50) DEFAULT 'password',
    cisco_max_clients INT DEFAULT 100,
    cisco_dpd INT DEFAULT 90,
    -- L2TP/IPsec specific
    l2tp_psk VARCHAR(255),
    l2tp_dns VARCHAR(100),
    l2tp_local_ip VARCHAR(50),
    l2tp_remote_ip_range VARCHAR(100),
    -- Xray specific (VLESS/VMess/Trojan/Shadowsocks)
    xray_protocol VARCHAR(50),
    xray_uuid VARCHAR(255),
    xray_flow VARCHAR(50),
    xray_network VARCHAR(50) DEFAULT 'tcp',
    xray_security VARCHAR(50) DEFAULT 'reality',
    xray_sni VARCHAR(255),
    xray_fingerprint VARCHAR(50) DEFAULT 'chrome',
    xray_public_key VARCHAR(255),
    xray_short_id VARCHAR(50),
    xray_path VARCHAR(255),
    xray_service_name VARCHAR(255),
    xray_encryption VARCHAR(50),
    -- Common config as JSON for extensibility
    extra_config TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    disk_io INT DEFAULT 0,
    packet_loss FLOAT DEFAULT 0.0,
    error_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tunnel Nodes for DPI-resistant connections
CREATE TABLE IF NOT EXISTS tunnel_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    country_code VARCHAR(10),
    flag_emoji VARCHAR(10),
    remote_ip VARCHAR(45) NOT NULL,
    tunnel_port INT NOT NULL DEFAULT 443,
    tunnel_type VARCHAR(50) DEFAULT 'wss',
    tunnel_secret VARCHAR(255) NOT NULL,
    local_forward_port INT NOT NULL,
    sni_host VARCHAR(255) DEFAULT 'www.google.com',
    status VARCHAR(50) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP,
    active_connections INT DEFAULT 0,
    total_traffic_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tunnel_nodes_status ON tunnel_nodes (status, is_active);

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

