import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseBody, settingsUpdateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const rows = await query('SELECT `key`, `value` FROM settings');
    const config: Record<string, string> = {};
    rows.forEach((row: any) => {
      config[row.key] = row.value;
    });
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseBody(settingsUpdateSchema, body);
    if (!parsed.success) return parsed.response;

    const promises = Object.entries(parsed.data).map(([key, value]) =>
      query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, value, value]
      )
    );
    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
