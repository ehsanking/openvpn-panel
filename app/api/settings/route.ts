import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT `key`, `value` FROM settings');
    const config: Record<string, string> = {};
    rows.forEach((row: any) => {
      if (row.key !== 'jwtSecret' && row.key !== 'caPrivateKey') {
        config[row.key] = row.value;
      }
    });
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const ALLOWED_SETTING_KEYS = new Set([
     'publicIp', 'port', 'protocol', 'cipher', 'dnsServer', 'panelName'
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const promises = Object.entries(body).map(([key, value]) => {
      if (!ALLOWED_SETTING_KEYS.has(key)) return Promise.resolve();
      
      return query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, String(value), String(value)]
      );
    });
    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
