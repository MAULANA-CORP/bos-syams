import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { applyOrderChangeRequest } from "@/lib/order-change-service";
import { orderChangeApplySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  return (await (context as { params: Promise<{ id: string }> }).params).id;
}

export const POST = withPermission("ORDER_CHANGE", "EXECUTE", async ({ req, actor }, context) => {
  const input = await readJson(req, orderChangeApplySchema);
  return ok(await applyOrderChangeRequest(await getId(context), input, actor, getClientIp(req)));
});
