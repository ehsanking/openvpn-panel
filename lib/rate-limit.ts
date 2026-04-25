const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

export function isRateLimited(ip: string, maxAttempts: number = 5): boolean {
    const now = Date.now();
    const data = rateLimitMap.get(ip) || { count: 0, lastReset: now };
    
    if (now - data.lastReset > RATE_LIMIT_WINDOW_MS) {
        data.count = 1;
        data.lastReset = now;
    } else {
        data.count++;
    }
    
    rateLimitMap.set(ip, data);
    return data.count > maxAttempts;
}
