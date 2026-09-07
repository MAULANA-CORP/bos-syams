import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { businessNumber } from "@/lib/numbering";
import { assertBusinessAuthority, hasAnyRole } from "@/lib/rbac";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { DomainError, type Actor, type UserRoleCode } from "@/lib/domain-types";

const evidenceRequired = new Set(["SHIPMENT_OUTSTANDING", "MAJOR_INVENTORY_ADJUSTMENT"]);

export async function listExceptions() {
  return getPrisma().exceptionCase.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { requester: { select: { id: true, nama: true } }, decidedBy: { select: { id: true, nama: true } } },
  });
}

export async function createException(input: Record<string, unknown> & { evidenceUrls?: string[]; tipe: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "EXCEPTION", "CREATE");
  if (evidenceRequired.has(input.tipe) && (!input.evidenceUrls || input.evidenceUrls.length === 0)) {
    throw new DomainError("Evidence wajib untuk tipe exception ini", 422, "evidence_required");
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const exception = await tx.exceptionCase.create({
      data: { ...(input as object), nomor: businessNumber("EXC"), requesterId: actor.id, status: "SUBMITTED" } as never,
    });
    await catatAudit({ entitasType: "ExceptionCase", entitasId: exception.id, aksi: "CREATE", newValue: exception, actor, ipAddress }, tx);
    return exception;
  });
}

export async function decideException(id: string, input: { status: "APPROVED" | "REJECTED"; keputusan: string; alasan: string; version: number }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "EXCEPTION", "APPROVE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.exceptionCase.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (!hasAnyRole(actor, [current.decisionOwnerRole as UserRoleCode])) {
      throw new DomainError("Role actor bukan decision owner untuk exception ini", 403, "wrong_decision_owner");
    }
    const exception = await tx.exceptionCase.update({
      where: { id },
      data: {
        status: input.status,
        keputusan: input.keputusan,
        alasan: input.alasan,
        decidedById: actor.id,
        decidedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await catatAudit({ entitasType: "ExceptionCase", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: exception, reason: input.alasan, actor, ipAddress }, tx);
    return exception;
  });
}
