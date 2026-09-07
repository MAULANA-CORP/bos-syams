import { catatAudit } from "@/lib/audit";
import { toDate } from "@/lib/date";
import { DomainError, type Actor } from "@/lib/domain-types";
import { businessNumber } from "@/lib/numbering";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority, hasAnyRole, maskSensitiveList } from "@/lib/rbac";

type AnyInput = Record<string, unknown>;

export async function listCrmPipelines() {
  return getPrisma().crmPipeline.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createCrmPipeline(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "CRM", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const buyerId = textOrNull(input.buyerId);
    if (buyerId) await tx.buyer.findUniqueOrThrow({ where: { id: buyerId } });
    const row = await tx.crmPipeline.create({
      data: {
        nomor: businessNumber("CRM"),
        buyerId,
        title: String(input.title),
        stage: String(input.stage ?? "LEAD"),
        nextFollowUp: toDate(input.nextFollowUp as string | null | undefined),
        ownerId: textOrNull(input.ownerId) ?? actor.id,
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "CrmPipeline", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateCrmPipeline(id: string, input: AnyInput & { version: number; reason?: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "CRM", "EDIT");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.crmPipeline.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const row = await tx.crmPipeline.update({
      where: { id },
      data: {
        buyerId: textOrNull(input.buyerId) ?? current.buyerId,
        title: textOrNull(input.title) ?? current.title,
        stage: textOrNull(input.stage) ?? current.stage,
        nextFollowUp: toDate(input.nextFollowUp as string | null | undefined) ?? current.nextFollowUp,
        ownerId: textOrNull(input.ownerId) ?? current.ownerId,
        notes: textOrNull(input.notes) ?? current.notes,
        version: { increment: 1 },
      } as never,
    });
    await catatAudit({ entitasType: "CrmPipeline", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.reason ?? "Update CRM pipeline", actor, ipAddress }, tx);
    return row;
  });
}

export async function listSampleApprovals() {
  return getPrisma().sampleApproval.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createSampleApproval(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SAMPLE", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const articleId = textOrNull(input.articleId);
    let buyerId = textOrNull(input.buyerId);
    if (articleId) {
      const article = await tx.article.findUniqueOrThrow({ where: { id: articleId }, include: { order: true } as never } as never) as any;
      buyerId = buyerId ?? article.order?.buyerId ?? null;
    }
    if (!articleId && !buyerId) throw new DomainError("Sample approval wajib memilih Article atau Buyer", 422, "sample_target_required");
    const status = toDate(input.sentAt as string | null | undefined) ? "SENT" : "REQUESTED";
    const row = await tx.sampleApproval.create({
      data: {
        nomor: businessNumber("SMP"),
        articleId,
        buyerId,
        sentAt: toDate(input.sentAt as string | null | undefined),
        status,
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "SampleApproval", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateSampleApprovalStatus(id: string, input: { status: string; version: number; notes?: unknown }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SAMPLE", input.status === "SENT" ? "EXECUTE" : "APPROVE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.sampleApproval.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const row = await tx.sampleApproval.update({
      where: { id },
      data: {
        status: input.status as never,
        sentAt: input.status === "SENT" ? new Date() : current.sentAt,
        decidedAt: ["APPROVED", "REJECTED"].includes(input.status) ? new Date() : current.decidedAt,
        notes: textOrNull(input.notes) ?? current.notes,
        version: { increment: 1 },
      } as never,
    });
    await catatAudit({ entitasType: "SampleApproval", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: textOrNull(input.notes) ?? input.status, actor, ipAddress }, tx);
    return row;
  });
}

export async function listMakloonJobs(actor: Actor) {
  await assertBusinessAuthority(actor, "MAKLOON", "VIEW");
  const rows = await getPrisma().makloonJob.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return maskSensitiveList(actor, rows as unknown as Record<string, unknown>[]);
}

export async function createMakloonJob(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "MAKLOON", "CREATE");
  if ((input.unitPrice || input.total) && !hasAnyRole(actor, ["CFO", "CEO"])) {
    throw new DomainError("Harga makloon hanya boleh diisi CFO/CEO", 403, "makloon_cost_denied");
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.productionBatch.findUniqueOrThrow({ where: { id: String(input.batchId) } });
    await tx.supplier.findUniqueOrThrow({ where: { id: String(input.supplierId) } });
    const processId = textOrNull(input.processId);
    if (processId) await tx.processCatalog.findUniqueOrThrow({ where: { id: processId } });
    const row = await tx.makloonJob.create({
      data: {
        nomor: businessNumber("MKL"),
        batchId: String(input.batchId),
        supplierId: String(input.supplierId),
        processId,
        unitPrice: money(input.unitPrice),
        total: money(input.total),
        qtySent: Number(input.qtySent ?? 0),
        dueDate: toDate(input.dueDate as string | null | undefined),
        status: "PLANNED",
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "MakloonJob", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateMakloonStatus(id: string, input: { status: string; qtyReceived?: number; version: number; notes?: unknown }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "MAKLOON", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.makloonJob.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (input.status === "RECEIVED" && Number(input.qtyReceived ?? 0) > current.qtySent) {
      throw new DomainError("Qty receive makloon tidak boleh melebihi qty sent", 422, "makloon_qty_too_large");
    }
    const row = await tx.makloonJob.update({
      where: { id },
      data: {
        status: input.status as never,
        qtyReceived: input.status === "RECEIVED" ? Number(input.qtyReceived ?? current.qtyReceived) : current.qtyReceived,
        notes: textOrNull(input.notes) ?? current.notes,
        version: { increment: 1 },
      } as never,
    });
    await catatAudit({ entitasType: "MakloonJob", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: textOrNull(input.notes) ?? input.status, actor, ipAddress }, tx);
    return row;
  });
}

export async function listEmployees(actor: Actor) {
  await assertBusinessAuthority(actor, "EMPLOYEE", "VIEW");
  const rows = await getPrisma().employee.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return maskSensitiveList(actor, rows as unknown as Record<string, unknown>[]);
}

export async function createEmployee(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "EMPLOYEE", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const row = await tx.employee.create({
      data: {
        userId: textOrNull(input.userId),
        nik: textOrNull(input.nik),
        nama: String(input.nama),
        departemen: textOrNull(input.departemen),
        roleTitle: textOrNull(input.roleTitle),
        salaryLevel: textOrNull(input.salaryLevel),
        status: String(input.status ?? "ACTIVE") as never,
      } as never,
    });
    await catatAudit({ entitasType: "Employee", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function listManpowerPlans() {
  return getPrisma().manpowerPlan.findMany({ orderBy: [{ tanggal: "desc" }, { departemen: "asc" }] });
}

export async function createManpowerPlan(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "MANPOWER", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const row = await tx.manpowerPlan.create({
      data: {
        tanggal: toDate(input.tanggal as string | null | undefined) ?? new Date(),
        departemen: String(input.departemen),
        plannedPeople: Number(input.plannedPeople ?? 0),
        actualPeople: input.actualPeople === null || input.actualPeople === undefined || input.actualPeople === "" ? null : Number(input.actualPeople),
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "ManpowerPlan", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function getControlTower(actor: Actor) {
  await assertBusinessAuthority(actor, "CONTROL_TOWER", "VIEW");
  if (!hasAnyRole(actor, ["CEO"])) throw new DomainError("Control tower hanya untuk CEO", 403, "control_tower_ceo_only");
  const prisma = getPrisma();
  const [ordersByStatus, openTasks, exceptions, invoices, shipments, crm, manpower] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } } as never),
    prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED", "OVERDUE"] } } }),
    prisma.exceptionCase.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, orderBy: [{ updatedAt: "desc" }], take: 8 }),
    prisma.invoice.findMany({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "OUTSTANDING"] } }, select: { amount: true, currency: true, status: true } }),
    prisma.shipment.groupBy({ by: ["status"], _count: { _all: true } } as never),
    prisma.crmPipeline.findMany({ where: { stage: { not: "WON" } }, orderBy: [{ nextFollowUp: "asc" }], take: 8 }),
    prisma.manpowerPlan.findMany({ orderBy: [{ tanggal: "desc" }], take: 8 }),
  ]);
  return {
    ordersByStatus,
    openTasks,
    exceptions,
    openAr: invoices.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    invoiceCount: invoices.length,
    shipmentsByStatus: shipments,
    crmFollowUps: crm,
    manpower,
  };
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}
