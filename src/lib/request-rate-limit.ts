const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const requests = new Map<string, { count: number; resetAt: number }>();

export function checkRequestRateLimit(key: string, limit = MAX_REQUESTS) {
  const now = Date.now();
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > limit) return Math.ceil((current.resetAt - now) / 1000);
}
