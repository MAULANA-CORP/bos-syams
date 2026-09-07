import { getPrisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  const prisma = getPrisma();
  const [entities, buyers, users, garmentTypes, sizeSets, sizes, colors, locations, paymentTerms, articles] = await Promise.all([
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
  ]);

  return ok({ entities, buyers, users, garmentTypes, sizeSets, sizes, colors, locations, paymentTerms, articles });
});
