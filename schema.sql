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
    -- IKEv2/IPsec
    ike_auth_method VARCHAR(20) DEFAULT 'eap',
    ike_psk VARCHAR(255),
    ike_dns VARCHAR(100),
    ike_dh_group VARCHAR(10) DEFAULT '14',
    ike_proposals VARCHAR(255),
    ike_remote_id VARCHAR(255),
    ike_local_ip_pool VARCHAR(100),
    -- PPTP (deprecated)
    pptp_dns VARCHAR(100),
    pptp_local_ip VARCHAR(100),
    pptp_remote_ip_range VARCHAR(100),
    -- SSTP
    sstp_dns VARCHAR(100),
    sstp_local_ip VARCHAR(100),
    sstp_remote_ip_range VARCHAR(100),
    sstp_cert_path VARCHAR(255),
    sstp_key_path VARCHAR(255),
    -- Hysteria2
    hy2_password VARCHAR(255),
    hy2_obfs VARCHAR(20) DEFAULT 'none',
    hy2_obfs_password VARCHAR(255),
    hy2_sni VARCHAR(255),
    hy2_alpn VARCHAR(50),
    hy2_up_mbps INT DEFAULT 0,
    hy2_down_mbps INT DEFAULT 0,
    hy2_insecure BOOLEAN DEFAULT 0,
    -- TUIC v5
    tuic_uuid VARCHAR(255),
    tuic_password VARCHAR(255),
    tuic_congestion_control VARCHAR(20) DEFAULT 'bbr',
    tuic_alpn VARCHAR(50),
    tuic_udp_relay_mode VARCHAR(20) DEFAULT 'native',
    tuic_sni VARCHAR(255),
    tuic_disable_sni BOOLEAN DEFAULT 0,
    tuic_zero_rtt BOOLEAN DEFAULT 0,
    -- Common config as JSON for extensibility
    extra_config TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One inbound per TCP/UDP port. Two inbounds can never share a port even
-- if they speak different protocols.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vpn_inbounds_port ON vpn_inbounds (port);

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
    client_cert TEXT,
    client_key TEXT,
    wg_privkey TEXT,
    FOREIGN KEY (parent_id) REFERENCES vpn_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_status_expires ON vpn_users (status, expires_at);

CREATE TABLE IF NOT EXISTS user_inbounds (
    user_id INT NOT NULL,
    inbound_id INT NOT NULL,
    PRIMARY KEY (user_id, inbound_id),
    FOREIGN KEY (user_id) REFERENCES vpn_users(id) ON DELETE CASCADE,
    FOREIGN KEY (inbound_id) REFERENCES vpn_inbounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(50) DEFAULT 'info',
    message TEXT,
    context TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` TEXT
);

INSERT OR IGNORE INTO settings (`key`, `value`) VALUES
('panelName', 'Power VPN'),
('defaultCipher', 'AES-256-GCM'),
('defaultDns', '1.1.1.1'),
('caCert', 'PENDING_CA_GENERATION');

INSERT OR IGNORE INTO vpn_users (id, username, role, status, traffic_total) VALUES
(1, 'admin', 'admin', 'active', 0);
