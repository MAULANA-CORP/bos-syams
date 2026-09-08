import { catatAudit } from "@/lib/audit";
import { toDate } from "@/lib/date";
import { DomainError, type Actor } from "@/lib/domain-types";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";

export async function listDelegations() {
  return getPrisma().delegation.findMany({
    orderBy: [{ isActive: "desc" }, { effectiveStart: "desc" }],
    include: {
      fromUser: { select: { id: true, nama: true, username: true } },
      toUser: { select: { id: true, nama: true, username: true } },
    },
  });
}

export async function createDelegation(input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "DELEGATION", "CREATE");
  const fromUserId = String(input.fromUserId);
  const toUserId = String(input.toUserId);
  const effectiveStart = toDate(String(input.effectiveStart));
  const effectiveEnd = toDate(String(input.effectiveEnd));
  if (fromUserId === toUserId) throw new DomainError("Delegasi harus diberikan ke user lain", 422, "delegation_same_user");
  if (!effectiveStart || !effectiveEnd || effectiveEnd <= effectiveStart) throw new DomainError("Tanggal akhir delegasi harus setelah tanggal mulai", 422, "delegation_date_invalid");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: fromUserId } }),
      tx.user.findUniqueOrThrow({ where: { id: toUserId } }),
    ]);
    const row = await tx.delegation.create({ data: { fromUserId, toUserId, scope: String(input.scope), effectiveStart, effectiveEnd, reason: String(input.reason), isActive: true } });
    await catatAudit({ entitasType: "Delegation", entitasId: row.id, aksi: "CREATE", newValue: row, reason: row.reason, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateDelegation(id: string, input: { version: number; isActive: boolean; reason: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "DELEGATION", "EDIT");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.delegation.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const row = await tx.delegation.update({ where: { id }, data: { isActive: input.isActive, version: { increment: 1 } } });
    await catatAudit({ entitasType: "Delegation", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.reason, actor, ipAddress }, tx);
    return row;
  });
}
