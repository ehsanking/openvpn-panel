import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { ensurePaymentTables } from '@/lib/payment';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().int().positive(),
  user_limit: z.number().int().positive().default(10),
  traffic_gb: z.number().int().positive().default(50),
  duration_days: z.number().int().positive().default(30),
});

export async function GET() {
  await ensurePaymentTables();
  const plans = await query(
    'SELECT * FROM plans WHERE is_active = TRUE ORDER BY price ASC'
  );
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('vpn_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensurePaymentTables();

  const body = await req.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((e: any) => e.message).join(', ') },
      { status: 400 }
    );
  }

  const { name, price, user_limit, traffic_gb, duration_days } = parsed.data;
  const result: any = await query(
    'INSERT INTO plans (name, price, user_limit, traffic_gb, duration_days) VALUES (?, ?, ?, ?, ?)',
    [name, price, user_limit, traffic_gb, duration_days]
  );

  return NextResponse.json({ id: result.insertId, success: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('vpn_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Valid ID required' }, { status: 400 });
  }

  await query('UPDATE plans SET is_active = FALSE WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}
