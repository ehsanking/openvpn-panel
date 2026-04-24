import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { getJwtSecret } from '@/lib/auth-utils';
import { ensurePaymentTables, initiatePayment } from '@/lib/payment';

export async function POST(req: Request) {
  await ensurePaymentTables();

  // Accept both admin sessions and reseller JWT tokens
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('vpn_session')?.value === 'authenticated';

  let resellerId: number | null = null;

  if (isAdmin) {
    const { reseller_id } = await req.json().catch(() => ({}));
    resellerId = reseller_id ?? null;
  } else {
    const token = cookieStore.get('client_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const secret = await getJwtSecret();
      const decoded: any = jwt.verify(token, secret);
      resellerId = decoded.id;
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const planId = Number(body.plan_id);
  if (!planId || isNaN(planId)) {
    return NextResponse.json({ error: 'plan_id required' }, { status: 400 });
  }

  const plans: any[] = await query(
    'SELECT * FROM plans WHERE id = ? AND is_active = TRUE',
    [planId]
  );
  if (!plans.length) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  const plan = plans[0];

  // Build callback URL
  const origin = req.headers.get('origin') ?? 'http://localhost:3000';
  const callbackUrl = `${origin}/api/payment/verify`;

  try {
    const { authority, paymentUrl } = await initiatePayment(
      plan.price,
      `خرید پلن ${plan.name} برای رزلر`,
      callbackUrl
    );

    // Record pending payment
    const result: any = await query(
      `INSERT INTO payments (reseller_id, plan_id, amount, authority, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [resellerId, planId, plan.price, authority]
    );

    return NextResponse.json({ payment_id: result.insertId, paymentUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
