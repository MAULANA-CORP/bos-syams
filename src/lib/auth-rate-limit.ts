import { getPrisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * Rate limiter backed by PostgreSQL.
 * Survives restarts and works across multiple instances.
 * Uses the existing Prisma client — no Redis needed.
 */

export async function checkLoginRateLimit(key: string): Promise<number | undefined> {
  const prisma = getPrisma();
  const now = new Date();

  // Clean up expired entries (older than window)
  // This is done lazily on each check to avoid a separate cron job
  await prisma.$executeRaw`
    DELETE FROM rate_limits WHERE "resetAt" < ${now}
  `.catch(() => {
    // Table might not exist yet — will be created by migration
  });

  // Try to get existing record
  const existing = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    SELECT count, "resetAt" FROM rate_limits WHERE key = ${key}
  `.then((rows) => rows[0] ?? null).catch(() => null);

  if (!existing || existing.resetAt < now) {
    // New window — upsert with count = 1
    const resetAt = new Date(now.getTime() + WINDOW_MS);
    await prisma.$executeRaw`
      INSERT INTO rate_limits (key, count, "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE SET count = 1, "resetAt" = ${resetAt}
    `.catch(() => {});
    return undefined;
  }

  // Increment count
  const newCount = existing.count + 1;
  await prisma.$executeRaw`
    UPDATE rate_limits SET count = ${newCount} WHERE key = ${key}
  `.catch(() => {});

  if (newCount > MAX_ATTEMPTS) {
    const seconds = Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000);
    return seconds;
  }
  return undefined;
}

export async function clearLoginRateLimit(key: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRaw`
    DELETE FROM rate_limits WHERE key = ${key}
  `.catch(() => {});
}

// In-memory fallback for when database is unavailable
// (e.g., during startup before migrations run)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimitSync(key: string): number | undefined {
  const now = Date.now();
  const current = memoryStore.get(key);
  if (!current || current.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return undefined;
  }
  current.count += 1;
  if (current.count > MAX_ATTEMPTS) {
    return Math.ceil((current.resetAt - now) / 1000);
  }
  return undefined;
}

export function clearLoginRateLimitSync(key: string): void {
  memoryStore.delete(key);
}
