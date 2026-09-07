import { catatAudit } from "@/lib/audit";
import { businessNumber } from "@/lib/numbering";
import { DomainError, type Actor } from "@/lib/domain-types";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";
import { assertOptimisticVersion } from "@/lib/order-rules";

type AnyInput = Record<string, unknown>;

export async function listProductionHandoffs() {
  return getPrisma().productionHandoff.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createProductionHandoff(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PRODUCTION", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const row = await tx.productionHandoff.create({
      data: {
        nomor: businessNumber("HO"),
        batchId: textOrNull(input.batchId),
        fromProcess: enumOrNull(input.fromProcess),
        toProcess: enumOrNull(input.toProcess),
        fromLocationId: textOrNull(input.fromLocationId),
        toLocationId: textOrNull(input.toLocationId),
        qtySent: Number(input.qtySent ?? 0),
        sentById: actor.id,
        notes: textOrNull(input.notes),
        status: "SENT",
      } as never,
    });
    await catatAudit({ entitasType: "ProductionHandoff", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function receiveProductionHandoff(id: string, input: { qtyReceived: number; version: number; notes?: unknown }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PRODUCTION", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.productionHandoff.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const discrepancyQty = input.qtyReceived - current.qtySent;
    const status = discrepancyQty === 0 ? "RECEIVED" : "DISCREPANCY";
    const row = await tx.productionHandoff.update({
      where: { id },
      data: {
        qtyReceived: input.qtyReceived,
        discrepancyQty,
        receivedById: actor.id,
        status,
        notes: textOrNull(input.notes) ?? current.notes,
        version: { increment: 1 },
      } as never,
    });
    await catatAudit({ entitasType: "ProductionHandoff", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: textOrNull(input.notes) ?? "Receive handoff", actor, ipAddress }, tx);
    return row;
  });
}

export async function listQualityInspections() {
  return getPrisma().qualityInspection.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createQualityInspection(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "QC", "CREATE");
  assertHasTarget(input, "QC wajib memilih Batch atau Article");
  validateQcQty(Number(input.inspectedQty ?? 0), Number(input.passQty ?? 0), Number(input.rejectQty ?? 0));
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const rejectQty = Number(input.rejectQty ?? 0);
    const row = await tx.qualityInspection.create({
      data: {
        nomor: businessNumber("QC"),
        batchId: textOrNull(input.batchId),
        articleId: textOrNull(input.articleId),
        sizeId: textOrNull(input.sizeId),
        inspectedQty: Number(input.inspectedQty ?? 0),
        passQty: Number(input.passQty ?? 0),
        rejectQty,
        rejectCategoryId: textOrNull(input.rejectCategoryId),
        status: rejectQty === 0 ? "PASS" : "REJECT",
        inspectorId: actor.id,
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "QualityInspection", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateQualityDecision(id: string, input: { status: string; version: number; notes?: unknown }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "QC", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.qualityInspection.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const row = await tx.qualityInspection.update({
      where: { id },
      data: { status: input.status as never, notes: textOrNull(input.notes) ?? current.notes, version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "QualityInspection", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: textOrNull(input.notes) ?? input.status, actor, ipAddress }, tx);
    return row;
  });
}

export async function listPackingJobs() {
  return getPrisma().packingJob.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createPackingJob(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PACKING", "CREATE");
  assertHasTarget(input, "Packing wajib memilih Batch atau Article");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const qcPass = await tx.qualityInspection.count({
      where: {
        status: "PASS",
        ...(textOrNull(input.batchId) ? { batchId: textOrNull(input.batchId) } : {}),
        ...(textOrNull(input.articleId) ? { articleId: textOrNull(input.articleId) } : {}),
      },
    });
    if (qcPass === 0) {
      throw new DomainError("Packing hanya boleh dibuat setelah ada QC PASS untuk batch/article terkait", 409, "qc_pass_required");
    }
    const row = await tx.packingJob.create({
      data: {
        nomor: businessNumber("PKG"),
        batchId: textOrNull(input.batchId),
        articleId: textOrNull(input.articleId),
        qtyToPack: Number(input.qtyToPack ?? 0),
        labelCode: textOrNull(input.labelCode),
        notes: textOrNull(input.notes),
        status: "OPEN",
      } as never,
    });
    await catatAudit({ entitasType: "PackingJob", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updatePackingStatus(id: string, input: { status: string; packedQty: number; version: number; notes?: unknown }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PACKING", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.packingJob.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (input.packedQty > current.qtyToPack) throw new DomainError("Packed qty tidak boleh melebihi qty to pack", 422, "packing_qty_too_large");
    const row = await tx.packingJob.update({
      where: { id },
      data: {
        status: input.status as never,
        packedQty: input.packedQty,
        goodsReadyAt: input.status === "GOODS_READY" ? new Date() : current.goodsReadyAt,
        notes: textOrNull(input.notes) ?? current.notes,
        version: { increment: 1 },
      } as never,
    });
    await catatAudit({ entitasType: "PackingJob", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: textOrNull(input.notes) ?? input.status, actor, ipAddress }, tx);
    return row;
  });
}

function validateQcQty(inspectedQty: number, passQty: number, rejectQty: number) {
  if (inspectedQty !== passQty + rejectQty) {
    throw new DomainError("Qty QC tidak balance: inspected wajib sama dengan pass + reject", 422, "qc_qty_mismatch", { inspectedQty, passQty, rejectQty });
  }
}

function assertHasTarget(input: AnyInput, message: string) {
  if (!textOrNull(input.batchId) && !textOrNull(input.articleId)) {
    throw new DomainError(message, 422, "target_required");
  }
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

function enumOrNull(value: unknown) {
  const text = textOrNull(value);
  return text === null ? null : text;
}
