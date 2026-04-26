/**
 * Multi-Protocol VPN Configuration Generators
 * Supports: OpenVPN, WireGuard, Cisco AnyConnect, L2TP/IPsec, Xray (VLESS/VMess/Trojan/Shadowsocks)
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
