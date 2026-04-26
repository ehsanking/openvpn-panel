import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-utils';
import { auditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

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
  } catch (error) {
    return handleApiError(error);
  }
}

const ALLOWED_SETTING_KEYS = new Set([
     'publicIp', 'port', 'protocol', 'cipher', 'dnsServer', 'panelName'
]);

const SettingSchema = z.record(z.string(), z.string().or(z.number()));

const ValidationRules: Record<string, z.ZodTypeAny> = {
    publicIp: z.union([z.string().ipv4(), z.string().ipv6()]),
    port: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().int().min(1).max(65535)),
    protocol: z.enum(['udp', 'tcp']),
    cipher: z.string().min(1).max(50),
    dnsServer: z.union([z.string().ipv4(), z.string().ipv6()]),
    panelName: z.string().min(1).max(100),
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedBody = SettingSchema.parse(body);
    
    const promises = Object.entries(validatedBody).map(([key, value]) => {
      if (!ALLOWED_SETTING_KEYS.has(key)) return Promise.resolve();
      
      const rule = ValidationRules[key];
      if (rule) {
          try {
              rule.parse(value);
          } catch(e) {
              throw new Error(`Invalid value for ${key}`);
          }
      }
      
      return query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, String(value), String(value)]
      );
    });
    await Promise.all(promises);
    await auditLog('update_settings', 'admin', 'global', body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
