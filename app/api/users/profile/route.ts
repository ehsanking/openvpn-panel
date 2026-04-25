import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateOvpnProfile } from '@/lib/ovpn-generator';
import { getOrGeneratePki, getOrGenerateClientCert } from '@/lib/pki-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');

        if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

        const users: any[] = await query(
            'SELECT * FROM vpn_users WHERE username = ? AND status = "active" AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
            [username]
        );
        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found, suspended, or expired' }, { status: 404 });
        }

        const servers: any[] = await query(
            'SELECT ip_address, ports FROM vpn_servers WHERE status = "online" AND is_active = TRUE'
        );

        const { caCertPem, caKeyPem, tlsAuthKey } = await getOrGeneratePki();
        const { clientCertPem, clientKeyPem } = await getOrGenerateClientCert(username, caCertPem, caKeyPem);

        const profile = generateOvpnProfile(username, servers, {
            caCertPem,
            tlsAuthKey,
            clientCertPem,
            clientKeyPem,
        });

        return NextResponse.json({ profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
