-- Migration: Add multi-protocol support to vpn_inbounds table
-- Version: 2.0
-- Date: 2024

-- Add new columns for protocol-specific configurations
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, 
-- so these will error if columns already exist (which is fine)

-- OpenVPN specific columns
ALTER TABLE vpn_inbounds ADD COLUMN status VARCHAR(50) DEFAULT 'active';
ALTER TABLE vpn_inbounds ADD COLUMN ovpn_protocol VARCHAR(10) DEFAULT 'udp';
ALTER TABLE vpn_inbounds ADD COLUMN ovpn_cipher VARCHAR(50) DEFAULT 'AES-256-GCM';
ALTER TABLE vpn_inbounds ADD COLUMN ovpn_auth VARCHAR(50) DEFAULT 'SHA256';
ALTER TABLE vpn_inbounds ADD COLUMN ovpn_dev VARCHAR(10) DEFAULT 'tun';

-- WireGuard specific columns
ALTER TABLE vpn_inbounds ADD COLUMN wg_private_key VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN wg_public_key VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN wg_address VARCHAR(50);
ALTER TABLE vpn_inbounds ADD COLUMN wg_dns VARCHAR(100);
ALTER TABLE vpn_inbounds ADD COLUMN wg_mtu INT DEFAULT 1420;
ALTER TABLE vpn_inbounds ADD COLUMN wg_persistent_keepalive INT DEFAULT 25;

-- Cisco AnyConnect (ocserv) specific columns
ALTER TABLE vpn_inbounds ADD COLUMN cisco_auth_method VARCHAR(50) DEFAULT 'password';
ALTER TABLE vpn_inbounds ADD COLUMN cisco_max_clients INT DEFAULT 100;
ALTER TABLE vpn_inbounds ADD COLUMN cisco_dpd INT DEFAULT 90;

-- L2TP/IPsec specific columns
ALTER TABLE vpn_inbounds ADD COLUMN l2tp_psk VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN l2tp_dns VARCHAR(100);
ALTER TABLE vpn_inbounds ADD COLUMN l2tp_local_ip VARCHAR(50);
ALTER TABLE vpn_inbounds ADD COLUMN l2tp_remote_ip_range VARCHAR(100);

-- Xray specific columns (VLESS/VMess/Trojan/Shadowsocks)
ALTER TABLE vpn_inbounds ADD COLUMN xray_protocol VARCHAR(50);
ALTER TABLE vpn_inbounds ADD COLUMN xray_uuid VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN xray_flow VARCHAR(50);
ALTER TABLE vpn_inbounds ADD COLUMN xray_network VARCHAR(50) DEFAULT 'tcp';
ALTER TABLE vpn_inbounds ADD COLUMN xray_security VARCHAR(50) DEFAULT 'reality';
ALTER TABLE vpn_inbounds ADD COLUMN xray_sni VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN xray_fingerprint VARCHAR(50) DEFAULT 'chrome';
ALTER TABLE vpn_inbounds ADD COLUMN xray_public_key VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN xray_short_id VARCHAR(50);
ALTER TABLE vpn_inbounds ADD COLUMN xray_path VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN xray_service_name VARCHAR(255);
ALTER TABLE vpn_inbounds ADD COLUMN xray_encryption VARCHAR(50);

-- Common config as JSON for extensibility
ALTER TABLE vpn_inbounds ADD COLUMN extra_config TEXT;
ALTER TABLE vpn_inbounds ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
