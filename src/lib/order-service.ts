import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { businessNumber } from "@/lib/numbering";
import { assertBusinessAuthority } from "@/lib/rbac";
import {
  assertBuyerCanReceiveOrder,
  assertCanReleaseBatch,
  assertCanReleaseSpk,
  assertOptimisticVersion,
  assertPriorityChangeAllowed,
  validateSizeBreakdown,
} from "@/lib/order-rules";
import { DomainError, type Actor } from "@/lib/domain-types";
import { toDate } from "@/lib/date";

export async function listOrders(actor: Actor) {
  const rows = await getPrisma().order.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      buyer: true,
      cmoPic: { select: { id: true, nama: true } },
      articles: { include: { sizes: { include: { size: true } }, batches: true, garmentType: true, color: true } },
    },
  });
  const { maskSensitiveList } = await import("@/lib/rbac");
  return maskSensitiveList(actor, rows as unknown as Record<string, unknown>[]);
}

export async function createOrder(input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.buyer.findUniqueOrThrow({ where: { id: String(input.buyerId) } });
    assertBuyerCanReceiveOrder(buyer.status);

    const order = await tx.order.create({
      data: {
        ...moneyDates(input),
        nomor: businessNumber("ORD"),
        status: "DRAFT",
      } as never,
    });
    await catatAudit({ entitasType: "Order", entitasId: order.id, aksi: "CREATE", newValue: order, actor, ipAddress }, tx);
    return order;
  });
}

export async function updateOrder(id: string, input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER", "EDIT");
  const { version, reason, ...data } = input;
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, Number(version));
    const order = await tx.order.update({
      where: { id },
      data: { ...(moneyDates(data) as object), version: { increment: 1 } } as never,
    });
    await catatAudit({ entitasType: "Order", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: order, reason: String(reason ?? ""), actor, ipAddress }, tx);
    return order;
  });
}

export async function createArticle(input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ARTICLE", "CREATE");
  const { sizes, ...articleInput } = input as Record<string, unknown> & { sizes: { sizeId: string; qty: number }[] };
  validateSizeBreakdown(Number(articleInput.qty), sizes);
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: String(articleInput.orderId) }, include: { buyer: true } });
    assertBuyerCanReceiveOrder(order.buyer.status);
    const article = await tx.article.create({
      data: {
        ...dateFields(articleInput),
        kode: businessNumber("ART"),
        sizes: { create: sizes },
      } as never,
      include: { sizes: { include: { size: true } }, garmentType: true, color: true },
    });
    await catatAudit({ entitasType: "Article", entitasId: article.id, aksi: "CREATE", newValue: article, actor, ipAddress }, tx);
    return article;
  });
}

export async function updateArticlePriority(id: string, input: { businessPriority: number; version: number; reason?: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ARTICLE", "EDIT");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.article.findUniqueOrThrow({ where: { id }, include: { order: true } });
    assertOptimisticVersion(current.version, input.version);
    assertPriorityChangeAllowed(current.order.status, input.reason);
    const article = await tx.article.update({
      where: { id },
      data: { businessPriority: input.businessPriority, version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "Article", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: article, reason: input.reason ?? "", actor, ipAddress }, tx);
    return article;
  });
}

export async function confirmOrder(id: string, input: { version: number }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { articles: true } });
    assertOptimisticVersion(order.version, input.version);
    if (order.articles.length === 0) throw new DomainError("Order belum punya Article", 409, "order_without_article");
    const orderQuotation = await tx.quotation.count({ where: { orderId: id, status: "APPROVED" } });
    const articlesWithQuotation = await tx.quotation.findMany({
      where: { articleId: { in: order.articles.map((article) => article.id) }, status: "APPROVED" },
      select: { articleId: true },
    });
    const approvedArticleIds = new Set(articlesWithQuotation.map((quotation) => quotation.articleId).filter(Boolean));
    const everyArticleApproved = order.articles.every((article) => approvedArticleIds.has(article.id));
    if (orderQuotation === 0 && !everyArticleApproved) {
      throw new DomainError(
        "Gate pricing aktif. Order baru bisa Confirm setelah quotation approved oleh CFO/CEO.",
        409,
        "pricing_gate_blocked",
      );
    }

    const updated = await tx.order.update({
      where: { id },
      data: { status: "CONFIRMED", version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "Order", entitasId: id, aksi: "UPDATE", oldValue: order, newValue: updated, reason: "Confirm Order setelah quotation approved", actor, ipAddress }, tx);
    return updated;
  }).catch(async (error) => {
    if (error instanceof DomainError && error.code === "pricing_gate_blocked") {
      await catatAudit({ entitasType: "Order", entitasId: id, aksi: "UPDATE", reason: error.message, oldValue: null, newValue: { attemptedStatus: "CONFIRMED" }, actor, ipAddress });
    }
    throw error;
  });
}

export async function releaseSpk(id: string, input: { version: number; reason?: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "ORDER", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    assertCanReleaseSpk(actor, current.status);
    const order = await tx.order.update({
      where: { id },
      data: { status: "SPK_RELEASED", spkReleasedAt: new Date(), spkReleasedById: actor.id, version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "Order", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: order, reason: input.reason ?? "SPK Release", actor, ipAddress }, tx);
    return order;
  });
}

export async function listBatches() {
  return getPrisma().productionBatch.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { article: { include: { order: { include: { buyer: true } } } }, location: true, releasedBy: { select: { id: true, nama: true } } },
  });
}

export async function createBatch(input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "BATCH", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const article = await tx.article.findUniqueOrThrow({ where: { id: String(input.articleId) }, include: { order: { include: { buyer: true } } } });
    assertBuyerCanReceiveOrder(article.order.buyer.status);
    if (Number(input.plannedQty) > article.qty) throw new DomainError("Planned qty batch tidak boleh melebihi qty Article", 422, "batch_qty_too_large");
    const batch = await tx.productionBatch.create({
      data: { ...(input as object), nomor: businessNumber("BAT"), currentQty: Number(input.plannedQty), releasedQty: 0, status: "PLANNED" } as never,
    });
    await catatAudit({ entitasType: "ProductionBatch", entitasId: batch.id, aksi: "CREATE", newValue: batch, actor, ipAddress }, tx);
    return batch;
  });
}

export async function releaseBatch(id: string, input: { version: number; reason?: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "BATCH", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.productionBatch.findUniqueOrThrow({
      where: { id },
      include: { article: { include: { order: { include: { buyer: true } } } } },
    });
    assertOptimisticVersion(current.version, input.version);
    assertCanReleaseBatch(actor, current.status);
    if (current.article.order.buyer.status === "HOLD" && current.article.order.buyer.holdReason) {
      throw new DomainError(`Buyer HOLD: ${current.article.order.buyer.holdReason}`, 409, "buyer_hold_blocks_release");
    }
    const batch = await tx.productionBatch.update({
      where: { id },
      data: { status: "RELEASED", releasedQty: current.plannedQty, currentQty: current.plannedQty, releasedAt: new Date(), releasedById: actor.id, version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "ProductionBatch", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: batch, reason: input.reason ?? "Batch Release", actor, ipAddress }, tx);
    return batch;
  });
}

function dateFields(input: Record<string, unknown>) {
  return {
    ...input,
    deadline: toDate(input.deadline as string | null | undefined),
  };
}

function moneyDates(input: Record<string, unknown>) {
  return {
    ...input,
    tanggalOrder: toDate(input.tanggalOrder as string) ?? new Date(),
    deadline: toDate(input.deadline as string | null | undefined),
    fxRateDate: toDate(input.fxRateDate as string | null | undefined),
  };
}
