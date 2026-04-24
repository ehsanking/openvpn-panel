CREATE TABLE IF NOT EXISTS vpn_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL, -- Added for client portal
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    last_connected TIMESTAMP NULL,
    traffic_total BIGINT DEFAULT 0,
    traffic_limit_gb INT DEFAULT 10,
    custom_config JSON, -- Store per-user config details (tcp/udp, keepalive)
    profile_data TEXT 
);

CREATE TABLE IF NOT EXISTS vpn_servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    domain VARCHAR(255),
    ports JSON, -- Array of ports [1194, 443, etc]
    protocol ENUM('udp', 'tcp') DEFAULT 'udp',
    load_score INT DEFAULT 0,
    status ENUM('online', 'offline') DEFAULT 'online',
    is_active BOOLEAN DEFAULT TRUE,
    bandwidth_ingress INT DEFAULT 0, -- in Mbps or similar
    bandwidth_egress INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    server_id INT,
    status ENUM('online', 'offline'),
    load_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES vpn_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('info', 'warn', 'error') DEFAULT 'info',
    message TEXT,
    context JSON, -- Additional metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    server_id INT,
    username VARCHAR(255),
    ip_address VARCHAR(45),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    status ENUM('active', 'disconnected') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES vpn_users(id) ON DELETE SET NULL,
    FOREIGN KEY (server_id) REFERENCES vpn_servers(id) ON DELETE SET NULL
);

-- Seed initial server
INSERT IGNORE INTO vpn_servers (name, ip_address, ports, protocol) VALUES 
('Node-01-Main', '45.12.99.1', '[1194, 443]', 'udp');

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` TEXT
);

-- Seed initial settings
INSERT IGNORE INTO settings (`key`, `value`) VALUES 
('panelName', 'OpenVPN Control Plane'),
('defaultCipher', 'AES-256-GCM'),
('defaultDns', '1.1.1.1'),
('caCert', 'PENDING_CA_GENERATION');
