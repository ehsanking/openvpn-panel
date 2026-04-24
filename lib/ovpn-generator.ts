export async function generateOvpnProfile(username: string): Promise<string> {
  // Fetch current server config from SQL API
  const res = await fetch('/api/settings');
  const data = await res.json();
  const config = data.error ? {
    publicIp: '45.12.99.1',
    port: 1194,
    protocol: 'udp',
    cipher: 'AES-256-GCM',
    dnsServer: '1.1.1.1'
  } : data;

  const ca = `-----BEGIN CERTIFICATE-----
MIIB9TCCAV+gAwIBAgIJAJ8aZzqYyY6TMA0GCSqGSIb3DQEBCwUAMBAxDjAMBgNV
BAMMBUNBLUFSMCAXDTI0MDUwODEwMDcwM1onGA8yMTI0MDQxNDEwMDcwM1owEDEO
MAwGA1UEAwwFQ0EtQVIwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAK7r8X/R
... (REDACTED CA) ...
-----END CERTIFICATE-----`;

  const cert = `-----BEGIN CERTIFICATE-----
MIIB9TCCAV+gAwIBAgIJAJ8aZzqYyY6TMA0GCSqGSIb3DQEBCwUAMBAxDjAMBgNV
BAMMBUNBLUFSMCAXDTI0MDUwODEwMDcwM1onGA8yMTI0MDQxNDEwMDcwM1owEDEO
MAwGA1UEAwwFQ0EtQVIwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAK7r8X/R
... (REDACTED CERT FOR ${username}) ...
-----END CERTIFICATE-----`;

  const key = `-----BEGIN PRIVATE KEY-----
MIICXAIBAAKBgQCu6/F/0N... (REDACTED PRIVATE KEY FOR ${username}) ...
-----END PRIVATE KEY-----`;

  const tlsAuth = `-----BEGIN OpenVPN Static key V1-----
e8c8a8d8... (REDACTED TLS-AUTH) ...
-----END OpenVPN Static key V1-----`;

  return `client
dev tun
proto ${config.protocol || 'udp'}
remote ${config.publicIp || '45.12.99.1'} ${config.port || 1194}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
auth SHA256
cipher ${config.cipher || 'AES-256-GCM'}
setenv opt block-outside-dns
key-direction 1
verb 3

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
