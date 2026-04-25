import forge from 'node-forge';

export interface CertPair {
  cert: string;
  privateKey: string;
}

export function generateCA(): CertPair {
  const pki = forge.pki;
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: 'PowerVPN CA' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'State' },
    { name: 'localityName', value: 'City' },
    { name: 'organizationName', value: 'PowerVPN' },
    { shortName: 'OU', value: 'CA' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    cert: pki.certificateToPem(cert),
    privateKey: pki.privateKeyToPem(keys.privateKey)
  };
}

export function generateClientCert(
  username: string, 
  caCertPem: string, 
  caKeyPem: string
): CertPair {
  const pki = forge.pki;
  const caCert = pki.certificateFromPem(caCertPem);
  const caKey = pki.privateKeyFromPem(caKeyPem);

  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  // Use a random serial number or unique string based on timestamp
  cert.serialNumber = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1); // 1 year validity

  const attrs = [
    { name: 'commonName', value: username },
    { name: 'organizationName', value: 'PowerVPN Clients' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(caCert.subject.attributes); // Issuer is the CA's subject

  cert.setExtensions([{
    name: 'basicConstraints',
    cA: false
  }, {
    name: 'keyUsage',
    digitalSignature: true,
    keyEncipherment: true
  }, {
    name: 'extKeyUsage',
    clientAuth: true
  }]);

  cert.sign(caKey, forge.md.sha256.create());

  return {
    cert: pki.certificateToPem(cert),
    privateKey: pki.privateKeyToPem(keys.privateKey)
  };
}

export function generateTlsAuthKey(): string {
  // Generate a random string matching OpenVPN's static key V1 format
  const bytes = forge.random.getBytesSync(2048/8);
  const hex = forge.util.bytesToHex(bytes);
  let formattedHex = '';
  // Format as 16 hex chars per line
  for (let i = 0; i < hex.length; i += 32) {
    formattedHex += hex.slice(i, i + 32) + '\n';
  }
  
  return `-----BEGIN OpenVPN Static key V1-----\n${formattedHex}-----END OpenVPN Static key V1-----`;
}
