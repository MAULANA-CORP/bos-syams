import { getPrisma } from "@/lib/prisma";
import { ok, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("AUDIT", "VIEW", async () => {
  const rows = await getPrisma().auditTrail.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { id: true, nama: true, username: true } } },
  });
  return ok(rows);
});
