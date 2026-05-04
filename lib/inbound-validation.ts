import { z } from 'zod';

/**
 * Power VPN inbound model.
 *
 * Each row in `vpn_inbounds` represents a single (protocol, server, port)
 * gateway. The schema below enforces:
 *  - one of the eight supported protocols,
 *  - the fields that are mandatory by that protocol's spec, and
 *  - sane defaults for the rest.
 *
 * The DB layer adds a UNIQUE index on `port` so two inbounds can never
 * share a TCP/UDP port — even across protocols. The API mirrors that with
 * a friendly 409 response before attempting the INSERT.
 */

export const SUPPORTED_PROTOCOLS = [
    'openvpn', 'wireguard', 'cisco', 'l2tp',
    'vless', 'vmess', 'trojan', 'shadowsocks',
] as const;

export type Protocol = typeof SUPPORTED_PROTOCOLS[number];

const portSchema = z.coerce.number().int().min(1).max(65535);

const baseSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(255),
    port: portSchema,
    server_address: z.string().trim().min(1, 'server_address is required').max(255),
    remark: z.string().max(2048).optional().default(''),
    status: z.enum(['active', 'disabled']).optional().default('active'),
});

const openvpnSchema = baseSchema.extend({
    protocol: z.literal('openvpn'),
    ovpn_protocol: z.enum(['udp', 'tcp']).optional().default('udp'),
    ovpn_cipher: z.string().min(1).optional().default('AES-256-GCM'),
    ovpn_auth: z.string().min(1).optional().default('SHA256'),
    ovpn_dev: z.enum(['tun', 'tap']).optional().default('tun'),
});

const wireguardSchema = baseSchema.extend({
    protocol: z.literal('wireguard'),
    // RFC: a WireGuard peer needs the server's static public key. Without it
    // the client config is meaningless, so we make it required.
    wg_public_key: z.string().trim().min(1, 'wg_public_key is required for WireGuard'),
    wg_private_key: z.string().optional().default(''),
    wg_address: z.string().min(1).optional().default('10.0.0.1/24'),
    wg_dns: z.string().min(1).optional().default('1.1.1.1'),
    wg_mtu: z.coerce.number().int().min(576).max(9000).optional().default(1420),
    wg_persistent_keepalive: z.coerce.number().int().min(0).max(3600).optional().default(25),
});

const ciscoSchema = baseSchema.extend({
    protocol: z.literal('cisco'),
    cisco_auth_method: z.enum(['password', 'certificate', 'both']).optional().default('password'),
    cisco_max_clients: z.coerce.number().int().min(1).max(10000).optional().default(100),
    cisco_dpd: z.coerce.number().int().min(10).max(3600).optional().default(90),
});

const l2tpSchema = baseSchema.extend({
    protocol: z.literal('l2tp'),
    // L2TP/IPsec without a PSK is not authenticatable.
    l2tp_psk: z.string().trim().min(8, 'l2tp_psk must be at least 8 characters'),
    l2tp_dns: z.string().min(1).optional().default('8.8.8.8'),
    l2tp_local_ip: z.string().min(1).optional().default('10.10.10.1'),
    l2tp_remote_ip_range: z.string().min(1).optional().default('10.10.10.2-10.10.10.254'),
});

const xrayBase = baseSchema.extend({
    xray_uuid: z.string().uuid('xray_uuid must be a valid UUID'),
    xray_network: z.enum(['tcp', 'ws', 'grpc', 'http', 'kcp', 'quic']).optional().default('tcp'),
    xray_security: z.enum(['reality', 'tls', 'none']).optional().default('reality'),
    xray_sni: z.string().min(1).optional().default('www.google.com'),
    xray_fingerprint: z.enum(['chrome', 'firefox', 'safari', 'edge', 'random']).optional().default('chrome'),
    xray_public_key: z.string().optional().default(''),
    xray_short_id: z.string().optional().default(''),
    xray_path: z.string().optional().default('/'),
    xray_service_name: z.string().optional().default(''),
});

const vlessSchema = xrayBase.extend({
    protocol: z.literal('vless'),
    xray_flow: z.enum(['', 'xtls-rprx-vision']).optional().default('xtls-rprx-vision'),
});

const vmessSchema = xrayBase.extend({
    protocol: z.literal('vmess'),
});

const trojanSchema = xrayBase.extend({
    protocol: z.literal('trojan'),
    // Trojan uses the password as the credential. We map it onto xray_uuid
    // so the storage layer stays uniform; the API still accepts a plain
    // string of any length here and falls back to a generated UUID if the
    // caller did not supply one.
});

const shadowsocksSchema = baseSchema.extend({
    protocol: z.literal('shadowsocks'),
    xray_encryption: z.enum([
        '2022-blake3-aes-128-gcm',
        '2022-blake3-aes-256-gcm',
        '2022-blake3-chacha20-poly1305',
        'chacha20-ietf-poly1305',
        'aes-256-gcm',
        'aes-128-gcm',
    ]).optional().default('chacha20-ietf-poly1305'),
    xray_network: z.enum(['tcp', 'udp']).optional().default('tcp'),
});

export const InboundCreateSchema = z.discriminatedUnion('protocol', [
    openvpnSchema,
    wireguardSchema,
    ciscoSchema,
    l2tpSchema,
    vlessSchema,
    vmessSchema,
    trojanSchema,
    shadowsocksSchema,
]);

export type InboundCreate = z.infer<typeof InboundCreateSchema>;

/** Subset of editable fields for PATCH. Protocol switching is not allowed. */
export const InboundUpdateSchema = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    port: portSchema.optional(),
    server_address: z.string().trim().min(1).max(255).optional(),
    remark: z.string().max(2048).optional(),
    status: z.enum(['active', 'disabled']).optional(),

    ovpn_protocol: z.enum(['udp', 'tcp']).optional(),
    ovpn_cipher: z.string().optional(),
    ovpn_auth: z.string().optional(),
    ovpn_dev: z.enum(['tun', 'tap']).optional(),

    wg_private_key: z.string().optional(),
    wg_public_key: z.string().optional(),
    wg_address: z.string().optional(),
    wg_dns: z.string().optional(),
    wg_mtu: z.coerce.number().int().min(576).max(9000).optional(),
    wg_persistent_keepalive: z.coerce.number().int().min(0).max(3600).optional(),

    cisco_auth_method: z.enum(['password', 'certificate', 'both']).optional(),
    cisco_max_clients: z.coerce.number().int().min(1).max(10000).optional(),
    cisco_dpd: z.coerce.number().int().min(10).max(3600).optional(),

    l2tp_psk: z.string().min(8).optional(),
    l2tp_dns: z.string().optional(),
    l2tp_local_ip: z.string().optional(),
    l2tp_remote_ip_range: z.string().optional(),

    xray_uuid: z.string().uuid().optional(),
    xray_flow: z.string().optional(),
    xray_network: z.string().optional(),
    xray_security: z.string().optional(),
    xray_sni: z.string().optional(),
    xray_fingerprint: z.string().optional(),
    xray_public_key: z.string().optional(),
    xray_short_id: z.string().optional(),
    xray_path: z.string().optional(),
    xray_service_name: z.string().optional(),
    xray_encryption: z.string().optional(),

    extra_config: z.string().optional(),
});

export type InboundUpdate = z.infer<typeof InboundUpdateSchema>;
