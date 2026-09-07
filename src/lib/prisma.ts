// Target: src/lib/prisma.ts — Prisma 7 + driver adapter
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DomainError } from "@/lib/domain-types";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.startsWith("postgres")) {
    throw new DomainError(
      "Database belum dikonfigurasi. Isi DATABASE_URL lalu jalankan migrate dan seed.",
      503,
      "database_not_configured",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * Singleton yang malas (lazy) — client baru dibuat saat pertama dipakai,
 * supaya `next build` tidak gagal ketika DATABASE_URL belum tersedia.
 * Pakai fungsi biasa, bukan Proxy, supaya tidak mengganggu akses properti
 * internal Next.js.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}
