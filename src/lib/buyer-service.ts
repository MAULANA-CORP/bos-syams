import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { assertBusinessAuthority } from "@/lib/rbac";
import { assertOptimisticVersion } from "@/lib/order-rules";
import type { Actor } from "@/lib/domain-types";

export async function listBuyers() {
  return getPrisma().buyer.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { cmoOwner: { select: { id: true, nama: true } }, paymentTerm: true, _count: { select: { orders: true } } },
  });
}

export async function createBuyer(input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "BUYER", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.buyer.create({ data: input as never });
    await catatAudit({ entitasType: "Buyer", entitasId: buyer.id, aksi: "CREATE", newValue: buyer, actor, ipAddress }, tx);
    return buyer;
  });
}

export async function updateBuyer(id: string, input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "BUYER", "EDIT");
  const { version, reason, ...data } = input;
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.buyer.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, Number(version));
    const buyer = await tx.buyer.update({
      where: { id },
      data: { ...(data as object), version: { increment: 1 } } as never,
    });
    await catatAudit({ entitasType: "Buyer", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: buyer, reason: String(reason ?? ""), actor, ipAddress }, tx);
    return buyer;
  });
}
