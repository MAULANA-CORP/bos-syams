import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createOrderChangeRequest, listOrderChangeRequests } from "@/lib/order-change-service";
import { orderChangeCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("ORDER_CHANGE", "VIEW", async () => ok(await listOrderChangeRequests()));

export const POST = withPermission("ORDER_CHANGE", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, orderChangeCreateSchema);
  return created(await createOrderChangeRequest({ ...input, evidenceUrls: input.evidenceUrls ?? [], reviewRoles: input.reviewRoles ?? ["CMO_MANAGER", "PRODUCTION_CONTROLLER", "CFO"] }, actor, getClientIp(req)));
});
