import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createPurchaseOrder, listPurchaseOrders } from "@/lib/phase4-service";
import { purchaseOrderCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("PROCUREMENT", "VIEW", async () => ok(await listPurchaseOrders()));

export const POST = withPermission("PROCUREMENT", "EXECUTE", async ({ req, actor }) => {
  const input = await readJson(req, purchaseOrderCreateSchema);
  return created(await createPurchaseOrder(input, actor, getClientIp(req)));
});
