import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import PDFDocument from 'pdfkit';

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

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') ?? 'csv').toLowerCase();

  const users: any[] = await query(`
    SELECT
      id, username, role, status,
      created_at, expires_at, last_connected,
      traffic_total, traffic_limit_gb, max_connections, main_protocol
    FROM vpn_users
    ORDER BY traffic_total DESC
  `);

  if (format === 'csv') {
    const headers = [
      'ID', 'Username', 'Role', 'Status', 'Protocol',
      'Traffic Used', 'Traffic Limit (GB)', 'Max Connections',
      'Created At', 'Expires At', 'Last Connected',
    ];
    const rows = users.map((u) => [
      u.id,
      u.username,
      u.role,
      u.status,
      u.main_protocol ?? '',
      formatBytes(u.traffic_total ?? 0),
      u.traffic_limit_gb ?? '',
      u.max_connections ?? '',
      u.created_at ? new Date(u.created_at).toISOString() : '',
      u.expires_at ? new Date(u.expires_at).toISOString() : '',
      u.last_connected ? new Date(u.last_connected).toISOString() : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const filename = `users-report-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      // Title
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Power VPN — User Report', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString()}  |  Total users: ${users.length}`, {
          align: 'center',
        });
      doc.moveDown(1);

      // Table header
      const colWidths = [30, 100, 55, 60, 65, 70, 55, 80];
      const colHeaders = ['ID', 'Username', 'Role', 'Status', 'Protocol', 'Traffic', 'Limit GB', 'Expires'];
      let x = doc.page.margins.left;
      const headerY = doc.y;

      doc.fontSize(8).font('Helvetica-Bold');
      colHeaders.forEach((h, i) => {
        doc.text(h, x, headerY, { width: colWidths[i], lineBreak: false });
        x += colWidths[i];
      });
      doc.moveDown(0.3);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown(0.2);

      // Table rows
      doc.fontSize(7).font('Helvetica');
      for (const u of users) {
        if (doc.y > doc.page.height - 80) doc.addPage();
        x = doc.page.margins.left;
        const rowY = doc.y;
        const cells = [
          String(u.id),
          u.username,
          u.role,
          u.status,
          u.main_protocol ?? '-',
          formatBytes(u.traffic_total ?? 0),
          String(u.traffic_limit_gb ?? '-'),
          u.expires_at ? new Date(u.expires_at).toLocaleDateString() : '-',
        ];
        cells.forEach((cell, i) => {
          doc.text(cell, x, rowY, { width: colWidths[i], lineBreak: false });
          x += colWidths[i];
        });
        doc.moveDown(0.4);
      }

      doc.end();
    });

    const pdf = Buffer.concat(chunks);
    const filename = `users-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format. Use ?format=csv or ?format=pdf' }, { status: 400 });
}
