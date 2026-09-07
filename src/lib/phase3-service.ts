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
  if (!textOrNull(input.batchId)) throw new DomainError("Handoff wajib memilih Batch", 422, "batch_required");
  if (!enumOrNull(input.fromProcess) || !enumOrNull(input.toProcess)) throw new DomainError("Handoff wajib memilih proses asal dan tujuan", 422, "process_required");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const batch = await tx.productionBatch.findUniqueOrThrow({ where: { id: textOrNull(input.batchId) ?? "" } });
    if (batch.status === "PLANNED") throw new DomainError("Batch harus Release sebelum handoff produksi", 409, "batch_not_released");
    if (Number(input.qtySent ?? 0) > batch.currentQty) throw new DomainError("Qty sent tidak boleh melebihi current qty batch", 422, "handoff_qty_too_large");
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
    if (row.batchId && row.toLocationId) {
      await tx.productionBatch.update({
        where: { id: row.batchId },
        data: { locationId: row.toLocationId, status: "IN_PROCESS", currentQty: input.qtyReceived, version: { increment: 1 } },
      });
    }
    if (status === "DISCREPANCY") {
      await tx.task.create({
        data: {
          sourceEntitas: "ProductionHandoff",
          sourceId: id,
          tipe: "WIP_DISCREPANCY",
          judul: `Selisih handoff ${row.nomor}`,
          deskripsi: `Qty sent ${current.qtySent}, received ${input.qtyReceived}, diff ${discrepancyQty}.`,
          assigneeRole: "PRODUCTION_CONTROLLER",
          prioritas: 2,
          status: "OPEN",
        },
      });
    }
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
    if (textOrNull(input.batchId)) {
      await tx.productionBatch.findUniqueOrThrow({ where: { id: textOrNull(input.batchId) ?? "" } });
    }
    if (textOrNull(input.sizeId) && textOrNull(input.articleId)) {
      const linkedSize = await tx.sizeBreakdown.count({ where: { articleId: textOrNull(input.articleId) ?? "", sizeId: textOrNull(input.sizeId) ?? "" } });
      if (linkedSize === 0) throw new DomainError("Size QC harus sesuai size breakdown article", 422, "qc_size_not_in_article");
    }
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
    if (rejectQty > 0) {
      await tx.task.create({
        data: {
          sourceEntitas: "QualityInspection",
          sourceId: row.id,
          tipe: "QC_REWORK",
          judul: `Rework QC ${row.nomor}`,
          deskripsi: `Reject ${rejectQty} pcs wajib rework/remake lalu QC recheck sebelum packing.`,
          assigneeRole: "PRODUCTION_CONTROLLER",
          prioritas: 2,
          status: "OPEN",
        },
      });
    }
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
    const target = targetWhere(input);
    const qcPass = await tx.qualityInspection.aggregate({
      where: {
        status: "PASS",
        ...target,
      },
      _sum: { passQty: true },
    });
    const alreadyPacked = await tx.packingJob.aggregate({
      where: target,
      _sum: { qtyToPack: true },
    });
    const availablePassQty = Number(qcPass._sum.passQty ?? 0) - Number(alreadyPacked._sum.qtyToPack ?? 0);
    if (availablePassQty <= 0) {
      throw new DomainError("Packing hanya boleh dibuat setelah ada QC PASS untuk batch/article terkait", 409, "qc_pass_required");
    }
    if (Number(input.qtyToPack ?? 0) > availablePassQty) {
      throw new DomainError("Qty packing melebihi sisa QC PASS yang belum dipacking", 422, "packing_exceeds_qc_pass", { availablePassQty });
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
    if (input.status === "GOODS_READY" && input.packedQty < current.qtyToPack) {
      throw new DomainError("Goods Ready wajib packed qty sama dengan qty to pack", 422, "goods_ready_qty_incomplete");
    }
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

export async function listWipByLocation() {
  const batches = await getPrisma().productionBatch.findMany({
    where: { status: { in: ["RELEASED", "IN_PROCESS", "ON_HOLD"] } },
    include: { location: true, article: { select: { kode: true, nama: true } } },
    orderBy: [{ updatedAt: "desc" }],
  });
  const grouped = new Map<string, { id: string; location: string; tipe: string; qty: number; batches: number }>();
  for (const batch of batches) {
    const key = batch.locationId ?? "NO_LOCATION";
    const current = grouped.get(key) ?? {
      id: key,
      location: batch.location?.nama ?? "Belum ada lokasi",
      tipe: batch.location?.tipe ?? "UNSET",
      qty: 0,
      batches: 0,
    };
    current.qty += batch.currentQty;
    current.batches += 1;
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).sort((a, b) => b.qty - a.qty);
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

function targetWhere(input: AnyInput) {
  return {
    ...(textOrNull(input.batchId) ? { batchId: textOrNull(input.batchId) } : {}),
    ...(textOrNull(input.articleId) ? { articleId: textOrNull(input.articleId) } : {}),
  };
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

function enumOrNull(value: unknown) {
  const text = textOrNull(value);
  return text === null ? null : text;
}
