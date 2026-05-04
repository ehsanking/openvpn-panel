import { NextResponse } from 'next/server';
import { validateConnection } from '@/lib/db';

/**
 * Schema migrations for the SQLite-backed control plane are now applied
 * automatically inside `validateConnection()` (see `lib/db.ts`). Hitting this
 * endpoint simply triggers the connection bootstrap so any pending column
 * additions land before the next request.
 */
export async function GET() {
  try {
    await validateConnection();
    return NextResponse.json({ message: 'Migrations completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
