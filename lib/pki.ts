import forge from 'node-forge';
import { query } from '@/lib/db';

interface CABundle {
  cert: forge.pki.Certificate;
  key: forge.pki.rsa.PrivateKey;
}

function generateKeyPair(bits: number): Promise<forge.pki.rsa.KeyPair> {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits, workers: -1 }, (err, keypair) => {
      if (err) reject(err);
      else resolve(keypair);
    });
  });
}

async function getOrCreateCA(): Promise<CABundle> {
  const rows: any[] = await query(
    'SELECT `key`, `value` FROM settings WHERE `key` IN ("caCert", "caKey")'
  );

  let caCertPem: string | null = null;
  let caKeyPem: string | null = null;

  for (const row of rows) {
    if (row.key === 'caCert') caCertPem = row.value;
    if (row.key === 'caKey') caKeyPem = row.value;
  }

  if (caCertPem && caKeyPem) {
    return {
      cert: forge.pki.certificateFromPem(caCertPem),
      key: forge.pki.privateKeyFromPem(caKeyPem) as forge.pki.rsa.PrivateKey,
    };
  }

  // Generate new self-signed CA
  const keypair = await generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10);

  const caAttrs = [
    { name: 'commonName', value: 'PowerVPN Root CA' },
    { name: 'organizationName', value: 'PowerVPN' },
    { shortName: 'OU', value: 'Certificate Authority' },
  ];

  cert.setSubject(caAttrs);
  cert.setIssuer(caAttrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  await query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=?',
    ['caCert', certPem, certPem]
  );
  await query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=?',
    ['caKey', keyPem, keyPem]
  );

  return { cert, key: keypair.privateKey };
}

export async function getCACertPem(): Promise<string> {
  const { cert } = await getOrCreateCA();
  return forge.pki.certificateToPem(cert);
}

export async function generateClientCert(
  username: string
): Promise<{ certPem: string; keyPem: string }> {
  const ca = await getOrCreateCA();
  const keypair = await generateKeyPair(2048);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 2);

  cert.setSubject([
    { name: 'commonName', value: username },
    { name: 'organizationName', value: 'PowerVPN' },
  ]);
  cert.setIssuer(ca.cert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
      critical: true,
    },
    { name: 'extKeyUsage', clientAuth: true },
    { name: 'authorityKeyIdentifier' },
  ]);
  cert.sign(ca.key, forge.md.sha256.create());

  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

export async function getOrCreateTlsAuthKey(): Promise<string> {
  const rows: any[] = await query(
    'SELECT `value` FROM settings WHERE `key` = "tlsAuthKey"'
  );
  if (rows.length > 0 && rows[0].value) return rows[0].value;

  // 2048-bit random static key formatted for OpenVPN
  const bytes = forge.random.getBytesSync(256);
  const hex = forge.util.bytesToHex(bytes);
  const lines: string[] = [];
  for (let i = 0; i < hex.length; i += 64) {
    lines.push(hex.slice(i, i + 64));
  }
  const key = `-----BEGIN OpenVPN Static key V1-----\n${lines.join('\n')}\n-----END OpenVPN Static key V1-----`;

  await query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=?',
    ['tlsAuthKey', key, key]
  );
  return key;
}

export async function getOrCreateUserCert(
  userId: number,
  username: string
): Promise<{ certPem: string; keyPem: string }> {
  // Lazy-add columns if needed
  try {
    await query('ALTER TABLE vpn_users ADD COLUMN client_cert TEXT');
  } catch (_) {}
  try {
    await query('ALTER TABLE vpn_users ADD COLUMN client_key TEXT');
  } catch (_) {}

  const rows: any[] = await query(
    'SELECT client_cert, client_key FROM vpn_users WHERE id = ?',
    [userId]
  );

  const user = rows[0];
  if (user?.client_cert && user?.client_key) {
    return { certPem: user.client_cert, keyPem: user.client_key };
  }

  const { certPem, keyPem } = await generateClientCert(username);

  await query(
    'UPDATE vpn_users SET client_cert = ?, client_key = ? WHERE id = ?',
    [certPem, keyPem, userId]
  );

  return { certPem, keyPem };
}
