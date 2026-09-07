import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { assertBusinessAuthority } from "@/lib/rbac";
import type { Actor } from "@/lib/domain-types";

const resources = {
  "garment-types": "garmentType",
  "size-sets": "sizeSet",
  sizes: "size",
  colors: "color",
  locations: "location",
  "process-catalog": "processCatalog",
  "process-rates": "processRate",
  materials: "material",
  suppliers: "supplier",
  "payment-terms": "paymentTerm",
  carriers: "carrier",
  "reject-categories": "rejectCategory",
  "system-configs": "systemConfig",
} as const;

export type MasterResource = keyof typeof resources;

export function assertMasterResource(resource: string): asserts resource is MasterResource {
  if (!(resource in resources)) throw new Error(`Master data ${resource} tidak dikenal`);
}

export async function listMasterData(resource: MasterResource) {
  const prisma = getPrisma() as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown> }>;
  const delegate = prisma[resources[resource]];
  const orderBy =
    resource === "sizes"
      ? [{ sizeSetId: "asc" }, { urutan: "asc" }]
      : resource === "system-configs"
        ? { key: "asc" }
        : { updatedAt: "desc" };
  return delegate.findMany({ orderBy });
}

export async function createMasterData(resource: MasterResource, input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "MASTER_DATA", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const delegates = tx as unknown as Record<string, { create: (args: unknown) => Promise<{ id: string }> }>;
    const row = await delegates[resources[resource]].create({ data: input });
    await catatAudit({ entitasType: resource, entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}
