const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > MAX_ATTEMPTS) {
    const seconds = Math.ceil((current.resetAt - now) / 1000);
    return seconds;
  }
}

export function clearLoginRateLimit(key: string) {
  attempts.delete(key);
}
