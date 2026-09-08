import { catatAudit } from "@/lib/audit";
import { toDate } from "@/lib/date";
import { DomainError, type Actor, type UserRoleCode } from "@/lib/domain-types";
import { businessNumber } from "@/lib/numbering";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";

type CreateInput = {
  orderId: string;
  jenis: "CHANGE" | "CANCELLATION";
  alasan: string;
  dampak?: unknown;
  requestedChanges?: Record<string, unknown> | null;
  disposition?: unknown;
  financialTreatment?: string;
  evidenceUrls: string[];
  reviewRoles: UserRoleCode[];
};

export async function listOrderChangeRequests() {
  return getPrisma().orderChangeRequest.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      order: { select: { id: true, nomor: true, status: true, buyer: { select: { nama: true } } } },
      requester: { select: { id: true, nama: true, username: true, roles: { select: { role: true } } } },
      reviews: { include: { reviewer: { select: { nama: true } } }, orderBy: { role: "asc" } },
    },
  });
}

export async function createOrderChangeRequest(input: CreateInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER_CHANGE", "CREATE");
  if (input.jenis === "CANCELLATION" && !textOrNull(input.disposition)) {
    throw new DomainError("Cancellation wajib memiliki disposition impact review", 422, "cancellation_disposition_required");
  }
  const roles = [...new Set(input.reviewRoles)].filter((role) => role !== "CEO");
  if (roles.length === 0) throw new DomainError("Minimal satu reviewer domain harus dipilih", 422, "reviewer_required");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    const row = await tx.orderChangeRequest.create({
      data: {
        nomor: businessNumber("OCR"),
        orderId: input.orderId,
        jenis: input.jenis,
        alasan: input.alasan,
        dampak: textOrNull(input.dampak),
        ...(input.requestedChanges ? { requestedChanges: input.requestedChanges } : {}),
        disposition: textOrNull(input.disposition),
        financialTreatment: input.financialTreatment ?? "TBD",
        evidenceUrls: input.evidenceUrls,
        requesterId: actor.id,
        status: "SUBMITTED",
        reviews: { create: roles.map((role) => ({ role })) },
      } as never,
      include: { reviews: true },
    });
    await catatAudit({ entitasType: "OrderChangeRequest", entitasId: row.id, aksi: "CREATE", newValue: row, reason: input.alasan, actor, ipAddress }, tx);
    return row;
  });
}

export async function reviewOrderChangeRequest(id: string, input: { status: "APPROVED" | "REJECTED"; notes: string; version: number }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER_CHANGE", "APPROVE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.orderChangeRequest.findUniqueOrThrow({ where: { id }, include: { reviews: true } });
    assertOptimisticVersion(current.version, input.version);
    const role = actor.roles.find((candidate) => current.reviews.some((review) => review.role === candidate)) as UserRoleCode | undefined;
    if (!role) throw new DomainError("Actor bukan reviewer domain untuk Change Request ini", 403, "change_review_role_denied");
    const review = current.reviews.find((item) => item.role === role);
    if (!review) throw new DomainError("Review domain tidak ditemukan", 404, "change_review_not_found");
    await tx.orderChangeReview.update({ where: { id: review.id }, data: { status: input.status, reviewerId: actor.id, notes: input.notes, decidedAt: new Date(), version: { increment: 1 } } });
    const reviews = await tx.orderChangeReview.findMany({ where: { requestId: id } });
    const nextStatus = input.status === "REJECTED" || reviews.some((item) => item.status === "REJECTED") ? "REJECTED" : reviews.every((item) => item.status === "APPROVED") ? "APPROVED" : "UNDER_REVIEW";
    const row = await tx.orderChangeRequest.update({ where: { id }, data: { status: nextStatus, version: { increment: 1 } }, include: { reviews: true } });
    await catatAudit({ entitasType: "OrderChangeRequest", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.notes, actor, ipAddress }, tx);
    return row;
  });
}

export async function applyOrderChangeRequest(id: string, input: { version: number; reason: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER_CHANGE", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const request = await tx.orderChangeRequest.findUniqueOrThrow({ where: { id }, include: { order: true } });
    assertOptimisticVersion(request.version, input.version);
    if (request.status !== "APPROVED") throw new DomainError("Request belum mendapat seluruh approval domain", 409, "change_request_not_approved");

    if (request.jenis === "CANCELLATION") {
      const order = await tx.order.update({ where: { id: request.orderId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: request.alasan, version: { increment: 1 } } });
      const row = await tx.orderChangeRequest.update({ where: { id }, data: { status: "APPLIED", appliedAt: new Date(), appliedById: actor.id, version: { increment: 1 } } });
      await catatAudit({ entitasType: "Order", entitasId: order.id, aksi: "UPDATE", newValue: order, reason: input.reason, actor, ipAddress }, tx);
      await catatAudit({ entitasType: "OrderChangeRequest", entitasId: id, aksi: "UPDATE", oldValue: request, newValue: row, reason: input.reason, actor, ipAddress }, tx);
      return row;
    }

    const changes = (request.requestedChanges ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if ("deadline" in changes) data.deadline = toDate(String(changes.deadline ?? ""));
    if ("currency" in changes) data.currency = String(changes.currency).toUpperCase();
    if ("commercialValue" in changes) data.commercialValue = numberOrNull(changes.commercialValue);
    if ("baseCommercialValue" in changes) data.baseCommercialValue = numberOrNull(changes.baseCommercialValue);
    if ("paymentTermId" in changes) data.paymentTermId = textOrNull(changes.paymentTermId);
    if (Object.keys(data).length === 0) throw new DomainError("Belum ada field perubahan Order yang dapat diterapkan", 422, "change_fields_empty");
    const order = await tx.order.update({ where: { id: request.orderId }, data: { ...data, version: { increment: 1 } } as never });
    const row = await tx.orderChangeRequest.update({ where: { id }, data: { status: "APPLIED", appliedAt: new Date(), appliedById: actor.id, version: { increment: 1 } } });
    await catatAudit({ entitasType: "Order", entitasId: order.id, aksi: "UPDATE", oldValue: request.order, newValue: order, reason: input.reason, actor, ipAddress }, tx);
    await catatAudit({ entitasType: "OrderChangeRequest", entitasId: id, aksi: "UPDATE", oldValue: request, newValue: row, reason: input.reason, actor, ipAddress }, tx);
    return row;
  });
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new DomainError("Nilai perubahan Order harus berupa angka", 422, "change_value_invalid");
  return number;
}
