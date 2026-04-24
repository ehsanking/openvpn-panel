import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

function requireAdmin(cookieStore: any) {
  return cookieStore.get('vpn_session')?.value === 'authenticated';
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(2) + ' KB';
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (!requireAdmin(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users: any[] = await query(`
    SELECT
      username, role, status, main_protocol,
      traffic_total, traffic_limit_gb,
      ROUND(traffic_total / (traffic_limit_gb * 1073741824) * 100, 1) AS usage_pct
    FROM vpn_users
    WHERE traffic_limit_gb > 0
    ORDER BY traffic_total DESC
  `);

  const headers = ['Username', 'Role', 'Status', 'Protocol', 'Traffic Used', 'Limit (GB)', 'Usage %'];
  const rows = users.map((u) =>
    [
      u.username,
      u.role,
      u.status,
      u.main_protocol ?? '',
      formatBytes(u.traffic_total ?? 0),
      u.traffic_limit_gb ?? '',
      u.usage_pct !== null ? `${u.usage_pct}%` : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
  );

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filename = `traffic-report-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
