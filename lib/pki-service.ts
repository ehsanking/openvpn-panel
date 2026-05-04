import { query, queryOne } from './db';
import { generateCA, generateClientCert, generateTlsAuthKey } from './pki';

const UPSERT_SETTING = 'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.`value`';

export async function getOrGeneratePki() {
    const settingsRows: any[] = await query(
        'SELECT `key`, `value` FROM settings WHERE `key` IN (?, ?, ?)',
        ['caCert', 'caPrivateKey', 'tlsAuthKey']
    );
    const settingsMap = new Map(settingsRows.map((r: any) => [r.key, r.value]));

    let caCertPem = '';
    let caKeyPem = '';
    let tlsAuthKey = '';

    const existingCa = settingsMap.get('caCert');
    if (existingCa && existingCa !== 'PENDING_CA_GENERATION') {
        caCertPem = existingCa;
        caKeyPem = settingsMap.get('caPrivateKey') || '';
        tlsAuthKey = settingsMap.get('tlsAuthKey') || '';
    }

    if (!caCertPem || !caKeyPem) {
        const newCa = generateCA();
        caCertPem = newCa.cert;
        caKeyPem = newCa.privateKey;
        await query(UPSERT_SETTING, ['caCert', caCertPem]);
        await query(UPSERT_SETTING, ['caPrivateKey', caKeyPem]);
    }

    if (!tlsAuthKey) {
        tlsAuthKey = generateTlsAuthKey();
        await query(UPSERT_SETTING, ['tlsAuthKey', tlsAuthKey]);
    }

    return { caCertPem, caKeyPem, tlsAuthKey };
}

export async function getOrGenerateClientCert(username: string, caCertPem: string, caKeyPem: string) {
    const user = await queryOne('SELECT client_cert, client_key FROM vpn_users WHERE username = ?', [username]);
    if (!user) throw new Error('User not found');

    let clientCertPem = user.client_cert;
    let clientKeyPem = user.client_key;

    if (!clientCertPem || !clientKeyPem) {
        const clientPair = generateClientCert(username, caCertPem, caKeyPem);
        clientCertPem = clientPair.cert;
        clientKeyPem = clientPair.privateKey;
        await query(
            'UPDATE vpn_users SET client_cert = ?, client_key = ? WHERE username = ?',
            [clientCertPem, clientKeyPem, username]
        );
    }

    return { clientCertPem, clientKeyPem };
}

/**
 * Convenience facade so callers can grab a single object and request a
 * fully-materialised PKI bundle for a given user (CA, TLS auth key, and
 * client cert/key) without juggling two helpers.
 */
export function getPkiService() {
    return {
        async generateClientCertificate(username: string) {
            const { caCertPem, caKeyPem, tlsAuthKey } = await getOrGeneratePki();
            const { clientCertPem, clientKeyPem } = await getOrGenerateClientCert(username, caCertPem, caKeyPem);
            return { caCertPem, tlsAuthKey, clientCertPem, clientKeyPem };
        },
    };
}
