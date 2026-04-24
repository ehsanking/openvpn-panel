import { query } from '@/lib/db';

// ──────────────────────────────────────────────
// Schema lazy-init
// ──────────────────────────────────────────────

let tablesReady = false;

export async function ensurePaymentTables() {
  if (tablesReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INT NOT NULL COMMENT 'Price in Tomans',
        user_limit INT NOT NULL DEFAULT 10,
        traffic_gb INT NOT NULL DEFAULT 50,
        duration_days INT NOT NULL DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reseller_id INT NOT NULL,
        plan_id INT NOT NULL,
        amount INT NOT NULL COMMENT 'Amount in Tomans',
        authority VARCHAR(100) NULL COMMENT 'ZarinPal authority token',
        ref_id VARCHAR(100) NULL COMMENT 'ZarinPal reference ID after success',
        status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
        gateway VARCHAR(50) DEFAULT 'zarinpal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        FOREIGN KEY (reseller_id) REFERENCES vpn_users(id) ON DELETE CASCADE
      )
    `);
    tablesReady = true;
  } catch (_) {}
}

// ──────────────────────────────────────────────
// ZarinPal gateway
// ──────────────────────────────────────────────

const ZARINPAL_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api.zarinpal.com/pg/v4/payment'
    : 'https://sandbox.zarinpal.com/pg/v4/payment';

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID ?? 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';

interface PaymentRequestResult {
  authority: string;
  paymentUrl: string;
}

export async function initiatePayment(
  amount: number,        // In Tomans
  description: string,
  callbackUrl: string
): Promise<PaymentRequestResult> {
  const res = await fetch(`${ZARINPAL_BASE}/request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount: amount * 10, // ZarinPal uses Rials (×10)
      description,
      callback_url: callbackUrl,
      currency: 'IRT',
    }),
  });

  const data = await res.json();

  if (data.errors?.length || data.data?.code !== 100) {
    throw new Error(
      data.errors?.[0]?.message ?? `ZarinPal error code: ${data.data?.code}`
    );
  }

  const authority: string = data.data.authority;
  const paymentUrl =
    process.env.NODE_ENV === 'production'
      ? `https://www.zarinpal.com/pg/StartPay/${authority}`
      : `https://sandbox.zarinpal.com/pg/StartPay/${authority}`;

  return { authority, paymentUrl };
}

interface VerifyResult {
  refId: string;
  cardPan?: string;
}

export async function verifyPayment(
  authority: string,
  amount: number  // In Tomans
): Promise<VerifyResult> {
  const res = await fetch(`${ZARINPAL_BASE}/verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount: amount * 10,
      authority,
    }),
  });

  const data = await res.json();

  // Codes 100 (success) and 101 (already verified) are both acceptable
  if (![100, 101].includes(data.data?.code)) {
    throw new Error(
      data.errors?.[0]?.message ?? `ZarinPal verify error: ${data.data?.code}`
    );
  }

  return {
    refId: String(data.data.ref_id),
    cardPan: data.data.card_pan,
  };
}
