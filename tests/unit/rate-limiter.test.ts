import { checkRateLimit } from '../../lib/rate-limiter';

describe('checkRateLimit', () => {
  it('allows first request', () => {
    const key = `test-${Date.now()}-a`;
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('counts requests correctly', () => {
    const key = `test-${Date.now()}-b`;
    checkRateLimit(key, 3, 60_000);
    checkRateLimit(key, 3, 60_000);
    const third = checkRateLimit(key, 3, 60_000);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it('blocks when limit exceeded', () => {
    const key = `test-${Date.now()}-c`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const key = `test-${Date.now()}-d`;
    // Use very short window (already expired)
    checkRateLimit(key, 1, -1000); // resetAt in the past
    const result = checkRateLimit(key, 1, 60_000);
    expect(result.allowed).toBe(true);
  });

  it('returns resetAt timestamp in the future', () => {
    const key = `test-${Date.now()}-e`;
    const before = Date.now();
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.resetAt).toBeGreaterThan(before);
  });

  it('different keys are isolated', () => {
    const keyA = `test-${Date.now()}-isolated-a`;
    const keyB = `test-${Date.now()}-isolated-b`;
    checkRateLimit(keyA, 1, 60_000);
    checkRateLimit(keyA, 1, 60_000); // now blocked

    const resultB = checkRateLimit(keyB, 1, 60_000);
    expect(resultB.allowed).toBe(true);
  });
});
