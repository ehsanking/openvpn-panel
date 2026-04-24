import { getCACertPem, getOrCreateTlsAuthKey, generateClientCert } from '@/lib/pki';

export async function generateOvpnProfile(
  username: string,
  servers: any[] = [],
  userConfig: any = {}
): Promise<string> {
  const defaults = {
    cipher: 'AES-256-GCM',
    auth: 'SHA256',
    protocol: userConfig.protocol || 'udp',
    keepalive: userConfig.keepalive || '10 60',
  };

  const sortedServers = [...servers].sort(
    (a, b) =>
      (a.load_score || 0) - (b.load_score || 0) ||
      (a.active_connections || 0) - (b.active_connections || 0)
  );

  const bestServer = sortedServers[0];
  const remoteLines = bestServer
    ? (() => {
        const ports = Array.isArray(bestServer.ports)
          ? bestServer.ports
          : JSON.parse(bestServer.ports || '[1194]');
        return `remote ${bestServer.ip_address} ${ports[0] || 1194}`;
      })()
    : `remote 45.12.99.1 1194`;

  const [caCert, tlsAuthKey, clientCert] = await Promise.all([
    getCACertPem(),
    getOrCreateTlsAuthKey(),
    generateClientCert(username),
  ]);

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
${caCert.trim()}
</ca>
<cert>
${clientCert.certPem.trim()}
</cert>
<key>
${clientCert.keyPem.trim()}
</key>
<tls-auth>
${tlsAuthKey.trim()}
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
