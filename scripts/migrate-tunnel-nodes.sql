-- Migration: Add Tunnel Nodes Table for DPI-Resistant Connections
-- Version: 1.0
-- Description: Creates table for managing multi-location tunnel nodes

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
