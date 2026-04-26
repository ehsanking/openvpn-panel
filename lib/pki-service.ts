import { query, queryOne } from './db';
import { generateCA, generateClientCert, generateTlsAuthKey } from './pki';

export async function getOrGeneratePki() {
    const settingsRows: any[] = await query('SELECT `key`, `value` FROM settings WHERE `key` IN ("caCert", "caPrivateKey", "tlsAuthKey")');
    const settingsMap = new Map(settingsRows.map((r: any) => [r.key, r.value]));

    let caCertPem = '';
    let caKeyPem = '';
    let tlsAuthKey = '';

    if (settingsMap.has('caCert') && settingsMap.get('caCert') !== 'PENDING_CA_GENERATION') {
        caCertPem = settingsMap.get('caCert')!;
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

    return { caCertPem, caKeyPem, tlsAuthKey };
}

export async function getOrGenerateClientCert(username: string, caCertPem: string, caKeyPem: string) {
    const user = await queryOne('SELECT client_cert, client_key FROM vpn_users WHERE username = ?', [username]);
    if (!user) throw new Error("User not found");

    let clientCertPem = user.client_cert;
    let clientKeyPem = user.client_key;

    if (!clientCertPem || !clientKeyPem) {
        const clientPair = generateClientCert(username, caCertPem, caKeyPem);
        clientCertPem = clientPair.cert;
        clientKeyPem = clientPair.privateKey;
        await query('UPDATE vpn_users SET client_cert = ?, client_key = ? WHERE username = ?', [clientCertPem, clientKeyPem, username]);
    }

    return { clientCertPem, clientKeyPem };
}
