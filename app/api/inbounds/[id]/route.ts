import { NextResponse } from 'next/server';
import db, { query, queryOne } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// Columns that the PATCH endpoint may write. Anything else in the body is
// ignored. `id`, `created_at`, and `updated_at` are intentionally not editable.
const EDITABLE_COLUMNS = new Set([
  'name', 'protocol', 'port', 'server_address', 'remark', 'status',
  'ovpn_protocol', 'ovpn_cipher', 'ovpn_auth', 'ovpn_dev',
  'wg_private_key', 'wg_public_key', 'wg_address', 'wg_dns', 'wg_mtu',
  'wg_persistent_keepalive',
  'cisco_auth_method', 'cisco_max_clients', 'cisco_dpd',
  'l2tp_psk', 'l2tp_dns', 'l2tp_local_ip', 'l2tp_remote_ip_range',
  'xray_protocol', 'xray_uuid', 'xray_flow', 'xray_network', 'xray_security',
  'xray_sni', 'xray_fingerprint', 'xray_public_key', 'xray_short_id',
  'xray_path', 'xray_service_name', 'xray_encryption',
  'extra_config'
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) throw new Error('ID required');
    const inbound = await queryOne('SELECT * FROM vpn_inbounds WHERE id = ?', [id]);
    if (!inbound) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Inbound not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: inbound });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) throw new Error('ID required');
    const body = await req.json();

    const sets: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!EDITABLE_COLUMNS.has(key)) continue;
      sets.push(`${key} = ?`);
      values.push(value);
    }

    if (sets.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_CHANGES', message: 'No editable fields provided' } },
        { status: 400 }
      );
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const result: any = await query(
      `UPDATE vpn_inbounds SET ${sets.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Inbound not found' } },
        { status: 404 }
      );
    }

    const updated = await queryOne('SELECT * FROM vpn_inbounds WHERE id = ?', [id]);
    return NextResponse.json({ data: updated, message: 'Inbound updated successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) throw new Error('ID required');

    const result: any = await db.query('DELETE FROM vpn_inbounds WHERE id = ?', [id]);
    const affected = (result?.[0]?.affectedRows ?? 0);
    if (!affected) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Inbound not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
