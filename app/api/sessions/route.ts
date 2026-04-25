import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) as total FROM sessions') as any[];
    const total = countResult[0].total;

    const sessions = await query('SELECT * FROM sessions ORDER BY start_time DESC LIMIT ? OFFSET ?', [limit, offset]);
    return NextResponse.json({ sessions, total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
