import { ok, fail } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint — verifies database connectivity.
 * Used by load balancers and monitoring tools.
 *
 * Returns:
 * - 200 + { status: "ok" } if database is reachable
 * - 503 + { status: "degraded" } if database is down
 */
export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      status: "ok",
      app: "BOS Syams",
      database: "connected",
      time: new Date().toISOString(),
    });
  } catch {
    return fail({
      message: "Database tidak bisa dihubungi",
      status: 503,
      code: "database_unreachable",
    });
  }
}
