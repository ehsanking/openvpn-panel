export interface OvpnGeneratorConfig {
  cipher?: string;
  auth?: string;
  protocol?: string;
  keepalive?: string;
}

export interface ServerConfig {
  ip_address: string;
  ports: number[] | string;
  load_score?: number;
  active_connections?: number;
}

export interface PkiConfig {
  caCertPem: string;
  tlsAuthKey: string;
  clientCertPem: string;
  clientKeyPem: string;
}

const EMPTY_PKI: PkiConfig = { caCertPem: '', tlsAuthKey: '', clientCertPem: '', clientKeyPem: '' };

export function generateOvpnProfile(
  username: string,
  servers: ServerConfig[] = [],
  pki: PkiConfig = EMPTY_PKI,
  userConfig: OvpnGeneratorConfig = {}
): string {
  if (!pki.caCertPem) {
    throw new Error('PKI not configured. Upload CA certificate in the panel Settings first.');
  }
  // Config defaults
  const defaults = {
    cipher: userConfig.cipher || 'AES-256-GCM',
    auth: userConfig.auth || 'SHA256',
    protocol: userConfig.protocol || 'udp',
    keepalive: userConfig.keepalive || '10 60'
  };

  // Sort servers by load score and connections
  const sortedServers = [...servers].sort((a, b) => {
    return (a.load_score || 0) - (b.load_score || 0) || (a.active_connections || 0) - (b.active_connections || 0);
  });

  const bestServer = sortedServers[0];

  const remoteLines = bestServer 
    ? [bestServer].map(s => {
        const ports = Array.isArray(s.ports) ? s.ports : JSON.parse((s.ports as string) || '[1194]');
        return `remote ${s.ip_address} ${ports[0] || 1194}`;
      }).join('\n')
    : `remote 127.0.0.1 1194`;

  return `client
dev tun
proto ${defaults.protocol}
${remoteLines}
resolv-retry infinite
nobind
persist-key
persist-tun
keepalive ${defaults.keepalive}
remote-cert-tls server
auth ${defaults.auth}
cipher ${defaults.cipher}
key-direction 1
verb 3
connect-retry 1
connect-timeout 5

<ca>
${pki.caCertPem}
</ca>
<cert>
${pki.clientCertPem}
</cert>
<key>
${pki.clientKeyPem}
</key>
<tls-auth>
${pki.tlsAuthKey}
</tls-auth>`;
}
