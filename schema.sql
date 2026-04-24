CREATE TABLE IF NOT EXISTS vpn_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_connected TIMESTAMP NULL,
    profile_data TEXT -- Stores metadata or cached config
);

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(255),
    ip_address VARCHAR(45),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'disconnected') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES vpn_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` TEXT
);

-- Seed initial settings
INSERT IGNORE INTO settings (`key`, `value`) VALUES 
('publicIp', '45.12.99.1'),
('port', '1194'),
('protocol', 'udp'),
('cipher', 'AES-256-GCM'),
('dnsServer', '1.1.1.1');
