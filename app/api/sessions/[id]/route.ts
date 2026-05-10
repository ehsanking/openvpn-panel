import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
        const { id } = await params;
        if (!id) throw new Error('ID required');
        
        await query('UPDATE sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?', ['disconnected', id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
