import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPayment } from '@/lib/payment';

// ZarinPal redirects to this endpoint after payment
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');

  if (!authority) {
    return NextResponse.redirect(new URL('/payment/failed', req.url));
  }

  // Find the pending payment
  const payments: any[] = await query(
    `SELECT p.*, pl.price, pl.user_limit, pl.traffic_gb, pl.duration_days
     FROM payments p
     JOIN plans pl ON p.plan_id = pl.id
     WHERE p.authority = ? AND p.status = 'pending'
     LIMIT 1`,
    [authority]
  );

  if (!payments.length) {
    return NextResponse.redirect(new URL('/payment/failed', req.url));
  }

  const payment = payments[0];

  // ZarinPal sends Status=NOK on cancel
  if (status === 'NOK') {
    await query("UPDATE payments SET status = 'failed' WHERE id = ?", [payment.id]);
    return NextResponse.redirect(new URL('/payment/cancelled', req.url));
  }

  try {
    const { refId } = await verifyPayment(authority, payment.amount);

    await query(
      "UPDATE payments SET status = 'paid', ref_id = ?, paid_at = NOW() WHERE id = ?",
      [refId, payment.id]
    );

    // Apply plan benefits: update reseller_limits
    await query(`
      INSERT INTO reseller_limits (reseller_id, max_users, allocated_traffic_gb)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        max_users = max_users + VALUES(max_users),
        allocated_traffic_gb = allocated_traffic_gb + VALUES(allocated_traffic_gb)
    `, [payment.reseller_id, payment.user_limit, payment.traffic_gb]);

    // Redirect to success page with ref_id
    const successUrl = new URL('/payment/success', req.url);
    successUrl.searchParams.set('ref', refId);
    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    await query("UPDATE payments SET status = 'failed' WHERE id = ?", [payment.id]);
    return NextResponse.redirect(new URL('/payment/failed', req.url));
  }
}
