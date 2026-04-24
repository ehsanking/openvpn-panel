export async function generateOvpnProfile(
  username: string, 
  servers: any[] = [],
  userConfig: any = {}
): Promise<string> {
  // Config defaults
  const defaults = {
    cipher: 'AES-256-GCM',
    auth: 'SHA256',
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
        const ports = Array.isArray(s.ports) ? s.ports : JSON.parse(s.ports || '[1194]');
        return `remote ${s.ip_address} ${ports[0] || 1194}`;
      }).join('\n')
    : `remote 45.12.99.1 1194`;

  // Placeholder certs - In production, these should be fetched from the secure Cert Service
  const ca = `-----BEGIN CERTIFICATE-----\nCA_CERT_HERE\n-----END CERTIFICATE-----`;
  const cert = `-----BEGIN CERTIFICATE-----\nCLIENT_CERT_FOR_${username.toUpperCase()}\n-----END CERTIFICATE-----`;
  const key = `-----BEGIN PRIVATE KEY-----\nCLIENT_KEY_FOR_${username.toUpperCase()}\n-----END PRIVATE KEY-----`;
  const tlsAuth = `-----BEGIN OpenVPN Static key V1-----\nTLS_AUTH_KEY\n-----END OpenVPN Static key V1-----`;

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
${ca}
</ca>
<cert>
${cert}
</cert>
<key>
${key}
</key>
<tls-auth>
${tlsAuth}
</tls-auth>`;
}

export function downloadFile(filename: string, content: string) {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
