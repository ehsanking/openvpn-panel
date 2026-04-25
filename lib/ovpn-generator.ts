import { query } from './db';
import { generateCA, generateClientCert, generateTlsAuthKey } from './pki';

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

  // Fetch CA and TLS Auth from settings
  let caCertPem = '';
  let caKeyPem = '';
  let tlsAuthKey = '';
  const settingsRows: any[] = await query('SELECT `key`, `value` FROM settings WHERE `key` IN ("caCert", "caPrivateKey", "tlsAuthKey")');
  const settingsMap = new Map(settingsRows.map(r => [r.key, r.value]));

  if (settingsMap.has('caCert') && settingsMap.get('caCert') !== 'PENDING_CA_GENERATION') {
      caCertPem = settingsMap.get('caCert');
      caKeyPem = settingsMap.get('caPrivateKey') || '';
      tlsAuthKey = settingsMap.get('tlsAuthKey') || '';
  } else {
      const newCa = generateCA();
      caCertPem = newCa.cert;
      caKeyPem = newCa.privateKey;
      tlsAuthKey = generateTlsAuthKey();
      
      await query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', ['caCert', caCertPem, caCertPem]);
      await query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', ['caPrivateKey', caKeyPem, caKeyPem]);
      await query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', ['tlsAuthKey', tlsAuthKey, tlsAuthKey]);
  }

  const userRows: any[] = await query('SELECT client_cert, client_key FROM vpn_users WHERE username = ?', [username]);
  if (userRows.length === 0) {
      throw new Error("User not found in DB to generate certificate");
  }

  let clientCertPem = userRows[0].client_cert;
  let clientKeyPem = userRows[0].client_key;

  if (!clientCertPem || !clientKeyPem) {
      const clientPair = generateClientCert(username, caCertPem, caKeyPem);
      clientCertPem = clientPair.cert;
      clientKeyPem = clientPair.privateKey;
      await query('UPDATE vpn_users SET client_cert = ?, client_key = ? WHERE username = ?', [clientCertPem, clientKeyPem, username]);
  }

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
${caCertPem}
</ca>
<cert>
${clientCertPem}
</cert>
<key>
${clientKeyPem}
</key>
<tls-auth>
${tlsAuthKey}
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
