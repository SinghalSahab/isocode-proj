/**
 * In-memory sliding-window rate limiter for AI capture endpoint.
 * Default limit: 10 requests per minute per retailer.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const CAPTURE_RATE_LIMIT = 10;
export const CAPTURE_WINDOW_MS = 60 * 1000; // 1 minute

export function checkCaptureRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < CAPTURE_WINDOW_MS);

  if (record.timestamps.length >= CAPTURE_RATE_LIMIT) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, CAPTURE_WINDOW_MS - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  const remaining = CAPTURE_RATE_LIMIT - record.timestamps.length;

  return {
    allowed: true,
    remaining,
    resetMs: CAPTURE_WINDOW_MS,
  };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

