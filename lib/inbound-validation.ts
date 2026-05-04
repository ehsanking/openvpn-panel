import { z } from 'zod';

/**
 * Power VPN inbound model.
 *
 * Each row in `vpn_inbounds` represents a single (protocol, server, port)
 * gateway. The schema below enforces:
 *  - one of the 13 supported protocols,
 *  - the fields that are mandatory by that protocol's spec, and
 *  - sane defaults for the rest.
 *
 * The DB layer adds a UNIQUE index on `port` so two inbounds can never
 * share a TCP/UDP port — even across protocols. The API mirrors that with
 * a friendly 409 response before attempting the INSERT.
 */

export const SUPPORTED_PROTOCOLS = [
    // Traditional VPN
    'openvpn', 'wireguard', 'cisco', 'l2tp', 'ikev2', 'pptp', 'sstp',
    // Xray / V2Ray family
    'vless', 'vmess', 'trojan', 'shadowsocks',
    // Modern QUIC-based
    'hysteria2', 'tuic',
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

// ---------------------------------------------------------------------------
// Traditional VPN protocols
// ---------------------------------------------------------------------------

const openvpnSchema = baseSchema.extend({
    protocol: z.literal('openvpn'),
    ovpn_protocol: z.enum(['udp', 'tcp']).optional().default('udp'),
    ovpn_cipher: z.string().min(1).optional().default('AES-256-GCM'),
    ovpn_auth: z.string().min(1).optional().default('SHA256'),
    ovpn_dev: z.enum(['tun', 'tap']).optional().default('tun'),
});

const wireguardSchema = baseSchema.extend({
    protocol: z.literal('wireguard'),
    // RFC: a WireGuard peer needs the server's static public key.
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

// IKEv2/IPsec — strongSwan-style. Native client on iOS/macOS/Windows.
const ikev2Schema = baseSchema.extend({
    protocol: z.literal('ikev2'),
    ike_auth_method: z.enum(['psk', 'cert', 'eap']).optional().default('eap'),
    // Required when auth_method is 'psk', optional otherwise. We keep it as a
    // free-form string and let the runtime check the combination at use-site
    // (the storage layer accepts a NULL).
    ike_psk: z.string().min(8).optional(),
    ike_dns: z.string().min(1).optional().default('1.1.1.1'),
    ike_dh_group: z.enum(['14', '15', '16', '19', '20', '21']).optional().default('14'),
    ike_proposals: z.string().optional().default('aes256-sha256-modp2048'),
    ike_remote_id: z.string().optional().default(''),
    ike_local_ip_pool: z.string().min(1).optional().default('10.20.30.0/24'),
}).superRefine((data, ctx) => {
    if (data.ike_auth_method === 'psk' && (!data.ike_psk || data.ike_psk.length < 8)) {
        ctx.addIssue({
            code: 'custom',
            path: ['ike_psk'],
            message: 'ike_psk (≥ 8 chars) is required when ike_auth_method is "psk"',
        });
    }
});

// PPTP — deprecated (MS-CHAPv2/MPPE has known weaknesses) but kept for
// compatibility with legacy networks. The form surfaces a warning.
const pptpSchema = baseSchema.extend({
    protocol: z.literal('pptp'),
    pptp_dns: z.string().min(1).optional().default('8.8.8.8'),
    pptp_local_ip: z.string().min(1).optional().default('192.168.99.1'),
    pptp_remote_ip_range: z.string().min(1).optional().default('192.168.99.10-192.168.99.99'),
});

// SSTP — Microsoft Secure Socket Tunneling Protocol over TLS:443. Native on
// Windows, requires a working TLS cert/key pair (managed at the OS level).
const sstpSchema = baseSchema.extend({
    protocol: z.literal('sstp'),
    sstp_dns: z.string().min(1).optional().default('8.8.8.8'),
    sstp_local_ip: z.string().min(1).optional().default('10.50.60.1'),
    sstp_remote_ip_range: z.string().min(1).optional().default('10.50.60.10-10.50.60.99'),
    // PEM-encoded cert + key paths, set on the host. Stored here purely as a
    // hint for the operator; the panel never reads from disk.
    sstp_cert_path: z.string().optional().default('/etc/ssl/certs/sstp.crt'),
    sstp_key_path: z.string().optional().default('/etc/ssl/private/sstp.key'),
});

// ---------------------------------------------------------------------------
// Xray / V2Ray family
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Modern QUIC-based
// ---------------------------------------------------------------------------

// Hysteria2 — QUIC-based, designed for high-loss / high-RTT links. Reference:
// https://v2.hysteria.network/docs/advanced/Full-Server-Config/
const hysteria2Schema = baseSchema.extend({
    protocol: z.literal('hysteria2'),
    hy2_password: z.string().trim().min(1, 'hy2_password is required'),
    hy2_obfs: z.enum(['none', 'salamander']).optional().default('none'),
    hy2_obfs_password: z.string().optional().default(''),
    hy2_sni: z.string().min(1).optional().default('www.bing.com'),
    hy2_alpn: z.string().optional().default('h3'),
    hy2_up_mbps: z.coerce.number().int().min(0).max(100000).optional().default(0),
    hy2_down_mbps: z.coerce.number().int().min(0).max(100000).optional().default(0),
    hy2_insecure: z.coerce.boolean().optional().default(false),
}).superRefine((data, ctx) => {
    if (data.hy2_obfs === 'salamander' && !data.hy2_obfs_password) {
        ctx.addIssue({
            code: 'custom',
            path: ['hy2_obfs_password'],
            message: 'hy2_obfs_password is required when hy2_obfs is "salamander"',
        });
    }
});

// TUIC v5 — QUIC over UDP, popular with sing-box / Clash.Meta.
// Reference: https://github.com/EAimTY/tuic/blob/dev/tuic-server/README.md
const tuicSchema = baseSchema.extend({
    protocol: z.literal('tuic'),
    tuic_uuid: z.string().uuid('tuic_uuid must be a valid UUID'),
    tuic_password: z.string().trim().min(1, 'tuic_password is required'),
    tuic_congestion_control: z.enum(['cubic', 'new_reno', 'bbr']).optional().default('bbr'),
    tuic_alpn: z.string().optional().default('h3'),
    tuic_udp_relay_mode: z.enum(['native', 'quic']).optional().default('native'),
    tuic_sni: z.string().min(1).optional().default('www.bing.com'),
    tuic_disable_sni: z.coerce.boolean().optional().default(false),
    tuic_zero_rtt: z.coerce.boolean().optional().default(false),
});

export const InboundCreateSchema = z.discriminatedUnion('protocol', [
    openvpnSchema,
    wireguardSchema,
    ciscoSchema,
    l2tpSchema,
    ikev2Schema,
    pptpSchema,
    sstpSchema,
    vlessSchema,
    vmessSchema,
    trojanSchema,
    shadowsocksSchema,
    hysteria2Schema,
    tuicSchema,
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

    ike_auth_method: z.enum(['psk', 'cert', 'eap']).optional(),
    ike_psk: z.string().min(8).optional(),
    ike_dns: z.string().optional(),
    ike_dh_group: z.enum(['14', '15', '16', '19', '20', '21']).optional(),
    ike_proposals: z.string().optional(),
    ike_remote_id: z.string().optional(),
    ike_local_ip_pool: z.string().optional(),

    pptp_dns: z.string().optional(),
    pptp_local_ip: z.string().optional(),
    pptp_remote_ip_range: z.string().optional(),

    sstp_dns: z.string().optional(),
    sstp_local_ip: z.string().optional(),
    sstp_remote_ip_range: z.string().optional(),
    sstp_cert_path: z.string().optional(),
    sstp_key_path: z.string().optional(),

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

    hy2_password: z.string().optional(),
    hy2_obfs: z.enum(['none', 'salamander']).optional(),
    hy2_obfs_password: z.string().optional(),
    hy2_sni: z.string().optional(),
    hy2_alpn: z.string().optional(),
    hy2_up_mbps: z.coerce.number().int().min(0).max(100000).optional(),
    hy2_down_mbps: z.coerce.number().int().min(0).max(100000).optional(),
    hy2_insecure: z.coerce.boolean().optional(),

    tuic_uuid: z.string().uuid().optional(),
    tuic_password: z.string().optional(),
    tuic_congestion_control: z.enum(['cubic', 'new_reno', 'bbr']).optional(),
    tuic_alpn: z.string().optional(),
    tuic_udp_relay_mode: z.enum(['native', 'quic']).optional(),
    tuic_sni: z.string().optional(),
    tuic_disable_sni: z.coerce.boolean().optional(),
    tuic_zero_rtt: z.coerce.boolean().optional(),

    extra_config: z.string().optional(),
});

export type InboundUpdate = z.infer<typeof InboundUpdateSchema>;
