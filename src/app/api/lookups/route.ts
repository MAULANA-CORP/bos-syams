import { getPrisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  const prisma = getPrisma();
  const [entities, buyers, users, garmentTypes, sizeSets, sizes, colors, locations, paymentTerms, articles, orders, batches, processCatalog, rejectCategories, qualityInspections, packingJobs] = await Promise.all([
    prisma.entity.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.buyer.findMany({ orderBy: { nama: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { nama: "asc" }, select: { id: true, nama: true, username: true } }),
    prisma.garmentType.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.sizeSet.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.size.findMany({ where: { isActive: true }, orderBy: [{ sizeSetId: "asc" }, { urutan: "asc" }] }),
    prisma.color.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.paymentTerm.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.article.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, kode: true, nama: true, qty: true } }),
    prisma.order.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, buyer: { select: { nama: true } } } }),
    prisma.productionBatch.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, plannedQty: true, article: { select: { nama: true } } } }),
    prisma.processCatalog.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } }),
    prisma.rejectCategory.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.qualityInspection.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, batchId: true, articleId: true } }),
    prisma.packingJob.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, qtyToPack: true, packedQty: true } }),
  ]);

  return ok({ entities, buyers, users, garmentTypes, sizeSets, sizes, colors, locations, paymentTerms, articles, orders, batches, processCatalog, rejectCategories, qualityInspections, packingJobs });
});
