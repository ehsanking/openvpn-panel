import { test, expect } from '@playwright/test';

const ADMIN_USER = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? 'password';

test.describe('Admin Login', () => {
  test('shows login form when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('POWER VPN')).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill('wrong');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /authorize/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('logs in successfully with correct credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill(ADMIN_USER);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /authorize/i }).click();
    // After login dashboard should load
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10_000 });
  });

  test('shows dashboard after login', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill(ADMIN_USER);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /authorize/i }).click();
    await page.waitForURL('/');
    await expect(page.getByText('Total Users')).toBeVisible({ timeout: 10_000 });
  });

  test('logs out successfully', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill(ADMIN_USER);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /authorize/i }).click();
    await page.waitForURL('/');
    await page.getByText(/sign out/i).click();
    await expect(page.getByRole('button', { name: /authorize/i })).toBeVisible();
  });
});

test.describe('Client Portal', () => {
  test('shows login form at /client', async ({ page }) => {
    await page.goto('/client');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('returns error for invalid client credentials', async ({ page }) => {
    await page.goto('/client');
    // The client portal is a separate page — just verify it loads
    const response = await page.request.post('/api/client/login', {
      data: { username: 'nonexistent', password: 'wrong' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Rate Limiting', () => {
  test('rate limits after 10 failed login attempts', async ({ request }) => {
    // Make 10 rapid requests
    for (let i = 0; i < 10; i++) {
      await request.post('/api/auth/session', {
        data: { username: 'admin', password: 'wrongpassword' },
      });
    }
    // 11th should be rate-limited
    const response = await request.post('/api/auth/session', {
      data: { username: 'admin', password: 'wrongpassword' },
    });
    expect(response.status()).toBe(429);
  });
});
