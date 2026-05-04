/**
 * Multi-Protocol VPN Configuration Generators
 *
 * Supports the 13 protocols Power VPN ships:
 *   Traditional VPN: OpenVPN, WireGuard, Cisco AnyConnect, L2TP/IPsec,
 *                    IKEv2/IPsec, PPTP, SSTP
 *   Xray family:     VLESS, VMess, Trojan, Shadowsocks
 *   QUIC-based:      Hysteria2, TUIC v5
 */

import { v4 as uuidv4 } from 'uuid';

// Types
export interface ServerInfo {
  ip_address: string;
  domain?: string;
  ports?: number[] | string;
}

export interface UserCredentials {
  username: string;
  password?: string;
  uuid?: string;
  wg_pubkey?: string;
  wg_ip?: string;
}

export interface InboundConfig {
  id: number;
  name: string;
  protocol: string;
  port: number;
  server_address?: string;
  status?: string;
  // OpenVPN
  ovpn_protocol?: string;
  ovpn_cipher?: string;
  ovpn_auth?: string;
  ovpn_dev?: string;
  // WireGuard
  wg_private_key?: string;
  wg_public_key?: string;
  wg_address?: string;
  wg_dns?: string;
  wg_mtu?: number;
  wg_persistent_keepalive?: number;
  // Cisco
  cisco_auth_method?: string;
  // L2TP
  l2tp_psk?: string;
  l2tp_dns?: string;
  // IKEv2/IPsec
  ike_auth_method?: string;
  ike_psk?: string;
  ike_dns?: string;
  ike_dh_group?: string;
  ike_proposals?: string;
  ike_remote_id?: string;
  // PPTP
  pptp_dns?: string;
  // SSTP
  sstp_dns?: string;
  // Xray
  xray_uuid?: string;
  xray_flow?: string;
  xray_network?: string;
  xray_security?: string;
  xray_sni?: string;
  xray_fingerprint?: string;
  xray_public_key?: string;
  xray_short_id?: string;
  xray_path?: string;
  xray_service_name?: string;
  xray_encryption?: string;
  // Hysteria2
  hy2_password?: string;
  hy2_obfs?: string;
  hy2_obfs_password?: string;
  hy2_sni?: string;
  hy2_alpn?: string;
  hy2_up_mbps?: number;
  hy2_down_mbps?: number;
  hy2_insecure?: number | boolean;
  // TUIC v5
  tuic_uuid?: string;
  tuic_password?: string;
  tuic_congestion_control?: string;
  tuic_alpn?: string;
  tuic_udp_relay_mode?: string;
  tuic_sni?: string;
  tuic_disable_sni?: number | boolean;
  tuic_zero_rtt?: number | boolean;
}

export interface PkiConfig {
  caCertPem: string;
  tlsAuthKey?: string;
  clientCertPem?: string;
  clientKeyPem?: string;
}

// ============================================
// OpenVPN Config Generator
// ============================================
export function generateOpenVPNConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  pki: PkiConfig
): string {
  const protocol = inbound.ovpn_protocol || 'udp';
  const cipher = inbound.ovpn_cipher || 'AES-256-GCM';
  const auth = inbound.ovpn_auth || 'SHA256';
  const dev = inbound.ovpn_dev || 'tun';

  return `client
dev ${dev}
proto ${protocol}
remote ${server.domain || server.ip_address} ${inbound.port}
resolv-retry infinite
nobind
persist-key
persist-tun
keepalive 10 60
remote-cert-tls server
auth ${auth}
cipher ${cipher}
key-direction 1
verb 3
connect-retry 1
connect-timeout 5

<ca>
${pki.caCertPem}
</ca>
${pki.clientCertPem ? `<cert>\n${pki.clientCertPem}\n</cert>` : ''}
${pki.clientKeyPem ? `<key>\n${pki.clientKeyPem}\n</key>` : ''}
${pki.tlsAuthKey ? `<tls-auth>\n${pki.tlsAuthKey}\n</tls-auth>` : ''}`;
}

// ============================================
// WireGuard Config Generator
// ============================================
export function generateWireGuardConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials,
  clientPrivateKey: string
): string {
  const mtu = inbound.wg_mtu || 1420;
  const dns = inbound.wg_dns || '1.1.1.1';
  const keepalive = inbound.wg_persistent_keepalive || 25;

  return `[Interface]
# ${user.username}
PrivateKey = ${clientPrivateKey}
Address = ${user.wg_ip || '10.0.0.2/32'}
DNS = ${dns}
MTU = ${mtu}

[Peer]
PublicKey = ${inbound.wg_public_key || ''}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${server.domain || server.ip_address}:${inbound.port}
PersistentKeepalive = ${keepalive}`;
}

// ============================================
// Cisco AnyConnect (ocserv) Config Generator
// ============================================
export function generateCiscoAnyConnectConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): { connectionUrl: string; username: string; authMethod: string } {
  return {
    connectionUrl: `https://${server.domain || server.ip_address}:${inbound.port}`,
    username: user.username,
    authMethod: inbound.cisco_auth_method || 'password'
  };
}

// ============================================
// L2TP/IPsec Config Generator (Windows/macOS/iOS/Android)
// ============================================
export function generateL2TPConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): { 
  serverAddress: string; 
  psk: string; 
  username: string;
  instructions: {
    windows: string;
    macos: string;
    ios: string;
    android: string;
  }
} {
  const serverAddr = server.domain || server.ip_address;
  const psk = inbound.l2tp_psk || '';
  
  return {
    serverAddress: serverAddr,
    psk: psk,
    username: user.username,
    instructions: {
      windows: `
1. Settings > Network & Internet > VPN > Add VPN
2. VPN Provider: Windows (built-in)
3. Connection name: ${inbound.name}
4. Server: ${serverAddr}
5. VPN type: L2TP/IPsec with pre-shared key
6. Pre-shared key: ${psk}
7. Username: ${user.username}
8. Password: [Your password]`,
      macos: `
1. System Preferences > Network > + (Add)
2. Interface: VPN, VPN Type: L2TP over IPsec
3. Service Name: ${inbound.name}
4. Server Address: ${serverAddr}
5. Account Name: ${user.username}
6. Authentication Settings > Shared Secret: ${psk}`,
      ios: `
1. Settings > General > VPN > Add VPN Configuration
2. Type: L2TP
3. Description: ${inbound.name}
4. Server: ${serverAddr}
5. Account: ${user.username}
6. Secret: ${psk}`,
      android: `
1. Settings > Network > VPN > Add VPN
2. Name: ${inbound.name}
3. Type: L2TP/IPSec PSK
4. Server address: ${serverAddr}
5. IPSec pre-shared key: ${psk}
6. Username: ${user.username}`
    }
  };
}

// ============================================
// VLESS Config Generator (Xray Core)
// ============================================
export function generateVLESSConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): { url: string; qrData: string; config: object } {
  const uuid = user.uuid || inbound.xray_uuid || uuidv4();
  const serverAddr = server.domain || server.ip_address;
  const network = inbound.xray_network || 'tcp';
  const security = inbound.xray_security || 'reality';
  const sni = inbound.xray_sni || 'www.google.com';
  const fp = inbound.xray_fingerprint || 'chrome';
  const pbk = inbound.xray_public_key || '';
  const sid = inbound.xray_short_id || '';
  const flow = inbound.xray_flow || 'xtls-rprx-vision';

  let url = `vless://${uuid}@${serverAddr}:${inbound.port}?`;
  const params: string[] = [];
  
  params.push(`type=${network}`);
  params.push(`security=${security}`);
  
  if (security === 'reality') {
    params.push(`sni=${sni}`);
    params.push(`fp=${fp}`);
    params.push(`pbk=${pbk}`);
    params.push(`sid=${sid}`);
    if (flow) params.push(`flow=${flow}`);
  } else if (security === 'tls') {
    params.push(`sni=${sni}`);
    params.push(`fp=${fp}`);
  }

  if (network === 'ws' && inbound.xray_path) {
    params.push(`path=${encodeURIComponent(inbound.xray_path)}`);
  }
  if (network === 'grpc' && inbound.xray_service_name) {
    params.push(`serviceName=${inbound.xray_service_name}`);
  }

  url += params.join('&');
  url += `#${encodeURIComponent(inbound.name)}`;

  const config = {
    outbounds: [{
      protocol: 'vless',
      settings: {
        vnext: [{
          address: serverAddr,
          port: inbound.port,
          users: [{
            id: uuid,
            encryption: 'none',
            flow: flow
          }]
        }]
      },
      streamSettings: {
        network: network,
        security: security,
        ...(security === 'reality' ? {
          realitySettings: {
            serverName: sni,
            fingerprint: fp,
            publicKey: pbk,
            shortId: sid
          }
        } : {}),
        ...(security === 'tls' ? {
          tlsSettings: { serverName: sni, fingerprint: fp }
        } : {})
      }
    }]
  };

  return { url, qrData: url, config };
}

// ============================================
// VMess Config Generator (Xray Core)
// ============================================
export function generateVMessConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): { url: string; qrData: string; config: object } {
  const uuid = user.uuid || inbound.xray_uuid || uuidv4();
  const serverAddr = server.domain || server.ip_address;
  const network = inbound.xray_network || 'ws';
  const security = inbound.xray_security === 'none' ? '' : (inbound.xray_security || 'tls');

  const vmessJson = {
    v: '2',
    ps: inbound.name,
    add: serverAddr,
    port: String(inbound.port),
    id: uuid,
    aid: '0',
    scy: 'auto',
    net: network,
    type: 'none',
    host: inbound.xray_sni || '',
    path: inbound.xray_path || '',
    tls: security,
    sni: inbound.xray_sni || '',
    fp: inbound.xray_fingerprint || 'chrome'
  };

  const url = `vmess://${Buffer.from(JSON.stringify(vmessJson)).toString('base64')}`;

  const config = {
    outbounds: [{
      protocol: 'vmess',
      settings: {
        vnext: [{
          address: serverAddr,
          port: inbound.port,
          users: [{
            id: uuid,
            alterId: 0,
            security: 'auto'
          }]
        }]
      },
      streamSettings: {
        network: network,
        security: security || 'none',
        ...(network === 'ws' ? {
          wsSettings: { path: inbound.xray_path || '/ws' }
        } : {}),
        ...(security === 'tls' ? {
          tlsSettings: { serverName: inbound.xray_sni || '' }
        } : {})
      }
    }]
  };

  return { url, qrData: url, config };
}

// ============================================
// Trojan Config Generator (Xray Core)
// ============================================
export function generateTrojanConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): { url: string; qrData: string; config: object } {
  const password = user.password || user.uuid || inbound.xray_uuid || '';
  const serverAddr = server.domain || server.ip_address;
  const network = inbound.xray_network || 'tcp';
  const security = inbound.xray_security || 'tls';
  const sni = inbound.xray_sni || serverAddr;
  const fp = inbound.xray_fingerprint || 'chrome';

  let url = `trojan://${encodeURIComponent(password)}@${serverAddr}:${inbound.port}?`;
  const params: string[] = [];
  
  params.push(`type=${network}`);
  params.push(`security=${security}`);
  params.push(`sni=${sni}`);
  params.push(`fp=${fp}`);

  if (network === 'ws' && inbound.xray_path) {
    params.push(`path=${encodeURIComponent(inbound.xray_path)}`);
  }
  if (network === 'grpc' && inbound.xray_service_name) {
    params.push(`serviceName=${inbound.xray_service_name}`);
  }

  url += params.join('&');
  url += `#${encodeURIComponent(inbound.name)}`;

  const config = {
    outbounds: [{
      protocol: 'trojan',
      settings: {
        servers: [{
          address: serverAddr,
          port: inbound.port,
          password: password
        }]
      },
      streamSettings: {
        network: network,
        security: security,
        tlsSettings: {
          serverName: sni,
          fingerprint: fp
        }
      }
    }]
  };

  return { url, qrData: url, config };
}

// ============================================
// Shadowsocks Config Generator
// ============================================
export function generateShadowsocksConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): { url: string; qrData: string; config: object } {
  const password = user.password || '';
  const serverAddr = server.domain || server.ip_address;
  const method = inbound.xray_encryption || 'chacha20-ietf-poly1305';

  // SS URL format: ss://BASE64(method:password)@server:port#name
  const credentials = Buffer.from(`${method}:${password}`).toString('base64');
  const url = `ss://${credentials}@${serverAddr}:${inbound.port}#${encodeURIComponent(inbound.name)}`;

  const config = {
    outbounds: [{
      protocol: 'shadowsocks',
      settings: {
        servers: [{
          address: serverAddr,
          port: inbound.port,
          method: method,
          password: password
        }]
      }
    }]
  };

  return { url, qrData: url, config };
}

// ============================================
// IKEv2 / IPsec Config Generator
// ============================================
// Most clients (iOS / macOS / Windows / Android) configure IKEv2 manually
// or via a downloadable .mobileconfig. We return both the connection
// summary and a minimal Apple-style profile snippet that the operator can
// adapt or sign.
export function generateIKEv2Config(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): {
  serverAddress: string;
  remoteId: string;
  authMethod: string;
  username: string;
  psk?: string;
  instructions: { ios: string; android: string; windows: string; macos: string };
} {
  const serverAddr = server.domain || server.ip_address;
  const authMethod = inbound.ike_auth_method || 'eap';
  const remoteId = inbound.ike_remote_id || serverAddr;
  const psk = authMethod === 'psk' ? (inbound.ike_psk || '') : undefined;

  return {
    serverAddress: serverAddr,
    remoteId,
    authMethod,
    username: user.username,
    psk,
    instructions: {
      ios: `Settings → VPN → Add VPN Configuration
Type: IKEv2
Description: ${inbound.name}
Server: ${serverAddr}
Remote ID: ${remoteId}
Local ID: ${user.username}
User Authentication: ${authMethod === 'psk' ? 'None (PSK)' : 'Username'}
Username: ${user.username}
Password: <your password>${psk ? `\nShared Secret: ${psk}` : ''}`,
      android: `Settings → Network → VPN → Add VPN
Type: IKEv2 / IPsec ${authMethod === 'psk' ? 'PSK' : 'MSCHAPv2'}
Server: ${serverAddr}
IPsec identifier: ${remoteId}
${psk ? `Pre-shared key: ${psk}` : ''}
Username: ${user.username}
Password: <your password>`,
      windows: `Settings → Network & Internet → VPN → Add a VPN
VPN provider: Windows (built-in)
Connection name: ${inbound.name}
Server name: ${serverAddr}
VPN type: IKEv2
Type of sign-in info: ${authMethod === 'psk' ? 'Pre-shared key' : 'User name and password'}
Username: ${user.username}${psk ? `\nPre-shared key: ${psk}` : ''}`,
      macos: `System Settings → Network → + → Interface: VPN → VPN Type: IKEv2
Server Address: ${serverAddr}
Remote ID: ${remoteId}
Local ID: ${user.username}
Authentication Settings → ${authMethod === 'psk' ? `Shared Secret: ${psk}` : 'Username + password'}`,
    },
  };
}

// ============================================
// PPTP Config Generator (legacy, deprecated)
// ============================================
export function generatePPTPConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): {
  serverAddress: string;
  username: string;
  authMethod: string;
  warning: string;
  instructions: { windows: string; android: string };
} {
  const serverAddr = server.domain || server.ip_address;
  return {
    serverAddress: serverAddr,
    username: user.username,
    authMethod: 'MS-CHAPv2 + MPPE-128',
    warning:
      'PPTP is considered insecure (MS-CHAPv2 / MPPE has known weaknesses). ' +
      'Prefer IKEv2 or WireGuard whenever possible.',
    instructions: {
      windows: `Settings → Network & Internet → VPN → Add a VPN
Connection name: ${inbound.name}
Server name: ${serverAddr}
VPN type: PPTP
Type of sign-in info: User name and password
Username: ${user.username}
Password: <your password>`,
      android: `Settings → Network → VPN → Add VPN
Name: ${inbound.name}
Type: PPTP
Server address: ${serverAddr}
Username: ${user.username}
Password: <your password>`,
    },
  };
}

// ============================================
// SSTP Config Generator (Windows-native, TLS:443)
// ============================================
export function generateSSTPConfig(
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials
): {
  serverAddress: string;
  port: number;
  username: string;
  authMethod: string;
  instructions: { windows: string };
} {
  const serverAddr = server.domain || server.ip_address;
  return {
    serverAddress: serverAddr,
    port: inbound.port,
    username: user.username,
    authMethod: 'EAP-MSCHAPv2',
    instructions: {
      windows: `Settings → Network & Internet → VPN → Add a VPN
Connection name: ${inbound.name}
Server name: ${serverAddr}${inbound.port !== 443 ? `:${inbound.port}` : ''}
VPN type: Secure Socket Tunneling Protocol (SSTP)
Type of sign-in info: User name and password
Username: ${user.username}
Password: <your password>

Note: the panel must serve a publicly trusted TLS certificate on
${serverAddr}:${inbound.port} for the Windows client to connect.`,
    },
  };
}

// ============================================
// Hysteria2 Config Generator
// ============================================
// URL format (sing-box / NekoBox / FlClash):
//   hysteria2://<password>@<host>:<port>?obfs=salamander&obfs-password=...&sni=...&insecure=0&alpn=h3#<name>
export function generateHysteria2Config(
  server: ServerInfo,
  inbound: InboundConfig
): { url: string; qrData: string; config: object } {
  const password = inbound.hy2_password || '';
  const serverAddr = server.domain || server.ip_address;
  const sni = inbound.hy2_sni || serverAddr;
  const obfs = inbound.hy2_obfs || 'none';
  const obfsPwd = inbound.hy2_obfs_password || '';
  const alpn = inbound.hy2_alpn || 'h3';
  const insecure = inbound.hy2_insecure ? '1' : '0';

  const params: string[] = [];
  if (obfs !== 'none') {
    params.push(`obfs=${encodeURIComponent(obfs)}`);
    if (obfsPwd) params.push(`obfs-password=${encodeURIComponent(obfsPwd)}`);
  }
  if (sni) params.push(`sni=${encodeURIComponent(sni)}`);
  if (alpn) params.push(`alpn=${encodeURIComponent(alpn)}`);
  params.push(`insecure=${insecure}`);

  const url =
    `hysteria2://${encodeURIComponent(password)}@${serverAddr}:${inbound.port}` +
    `?${params.join('&')}#${encodeURIComponent(inbound.name)}`;

  const config = {
    type: 'hysteria2',
    server: serverAddr,
    server_port: inbound.port,
    password,
    obfs: obfs === 'none' ? undefined : { type: obfs, password: obfsPwd || undefined },
    tls: {
      enabled: true,
      server_name: sni,
      alpn: [alpn],
      insecure: !!inbound.hy2_insecure,
    },
    up_mbps: inbound.hy2_up_mbps || undefined,
    down_mbps: inbound.hy2_down_mbps || undefined,
  };

  return { url, qrData: url, config };
}

// ============================================
// TUIC v5 Config Generator
// ============================================
// URL format used by sing-box / NekoBox:
//   tuic://<uuid>:<password>@<host>:<port>?congestion_control=bbr&alpn=h3&sni=...&udp_relay_mode=native#<name>
export function generateTUICConfig(
  server: ServerInfo,
  inbound: InboundConfig
): { url: string; qrData: string; config: object } {
  const uuid = inbound.tuic_uuid || uuidv4();
  const password = inbound.tuic_password || '';
  const serverAddr = server.domain || server.ip_address;
  const sni = inbound.tuic_sni || serverAddr;
  const cc = inbound.tuic_congestion_control || 'bbr';
  const alpn = inbound.tuic_alpn || 'h3';
  const relayMode = inbound.tuic_udp_relay_mode || 'native';
  const disableSni = inbound.tuic_disable_sni ? '1' : '0';
  const zeroRtt = inbound.tuic_zero_rtt ? '1' : '0';

  const params = [
    `congestion_control=${encodeURIComponent(cc)}`,
    `alpn=${encodeURIComponent(alpn)}`,
    `udp_relay_mode=${encodeURIComponent(relayMode)}`,
    `disable_sni=${disableSni}`,
    `reduce_rtt=${zeroRtt}`,
  ];
  if (sni) params.push(`sni=${encodeURIComponent(sni)}`);

  const url =
    `tuic://${uuid}:${encodeURIComponent(password)}@${serverAddr}:${inbound.port}` +
    `?${params.join('&')}#${encodeURIComponent(inbound.name)}`;

  const config = {
    type: 'tuic',
    server: serverAddr,
    server_port: inbound.port,
    uuid,
    password,
    congestion_control: cc,
    udp_relay_mode: relayMode,
    zero_rtt_handshake: !!inbound.tuic_zero_rtt,
    tls: {
      enabled: true,
      server_name: sni,
      alpn: [alpn],
      disable_sni: !!inbound.tuic_disable_sni,
    },
  };

  return { url, qrData: url, config };
}

// ============================================
// Universal Config Generator
// ============================================
export function generateClientConfig(
  protocol: string,
  server: ServerInfo,
  inbound: InboundConfig,
  user: UserCredentials,
  pki?: PkiConfig,
  clientPrivateKey?: string
): any {
  switch (protocol) {
    case 'openvpn':
      if (!pki) throw new Error('PKI config required for OpenVPN');
      return { 
        type: 'file', 
        content: generateOpenVPNConfig(server, inbound, pki),
        filename: `${user.username}-${inbound.name}.ovpn`,
        mimeType: 'application/x-openvpn-profile'
      };

    case 'wireguard':
      if (!clientPrivateKey) throw new Error('Client private key required for WireGuard');
      return {
        type: 'file',
        content: generateWireGuardConfig(server, inbound, user, clientPrivateKey),
        filename: `${user.username}-${inbound.name}.conf`,
        mimeType: 'application/x-wireguard-profile'
      };

    case 'cisco':
      return {
        type: 'instructions',
        ...generateCiscoAnyConnectConfig(server, inbound, user)
      };

    case 'l2tp':
      return {
        type: 'instructions',
        ...generateL2TPConfig(server, inbound, user)
      };

    case 'vless':
      return {
        type: 'url',
        ...generateVLESSConfig(server, inbound, user)
      };

    case 'vmess':
      return {
        type: 'url',
        ...generateVMessConfig(server, inbound, user)
      };

    case 'trojan':
      return {
        type: 'url',
        ...generateTrojanConfig(server, inbound, user)
      };

    case 'shadowsocks':
      return {
        type: 'url',
        ...generateShadowsocksConfig(server, inbound, user)
      };

    case 'ikev2':
      return {
        type: 'instructions',
        ...generateIKEv2Config(server, inbound, user),
      };

    case 'pptp':
      return {
        type: 'instructions',
        ...generatePPTPConfig(server, inbound, user),
      };

    case 'sstp':
      return {
        type: 'instructions',
        ...generateSSTPConfig(server, inbound, user),
      };

    case 'hysteria2':
      return {
        type: 'url',
        ...generateHysteria2Config(server, inbound),
      };

    case 'tuic':
      return {
        type: 'url',
        ...generateTUICConfig(server, inbound),
      };

    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

// ============================================
// Subscription Link Generator (Multi-protocol)
// ============================================
export function generateSubscriptionContent(
  configs: Array<{ protocol: string; url?: string; content?: string }>
): string {
  const urls = configs
    .filter(c => c.url)
    .map(c => c.url);
  
  return Buffer.from(urls.join('\n')).toString('base64');
}
