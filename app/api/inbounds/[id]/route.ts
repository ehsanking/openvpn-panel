import { NextResponse } from 'next/server';
import db, { query, queryOne } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/auth-utils';
import { InboundUpdateSchema } from '@/lib/inbound-validation';

export const dynamic = 'force-dynamic';

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
    const parsed = InboundUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update payload',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // If the caller is changing the port, make sure no other inbound owns it.
    if (parsed.data.port !== undefined) {
      const conflict = await queryOne(
        'SELECT id, name, protocol FROM vpn_inbounds WHERE port = ? AND id != ?',
        [parsed.data.port, id]
      );
      if (conflict) {
        return NextResponse.json(
          {
            error: {
              code: 'PORT_IN_USE',
              message: `Port ${parsed.data.port} is already used by inbound "${conflict.name}" (${conflict.protocol}).`,
            },
          },
          { status: 409 }
        );
      }
    }

    const sets: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(parsed.data)) {
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

    try {
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
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(err?.message || '')) {
        return NextResponse.json(
          { error: { code: 'PORT_IN_USE', message: 'Port already in use by another inbound.' } },
          { status: 409 }
        );
      }
      throw err;
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
