import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { reviewOrderChangeRequest } from "@/lib/order-change-service";
import { orderChangeReviewSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  return (await (context as { params: Promise<{ id: string }> }).params).id;
}

export const POST = withPermission("ORDER_CHANGE", "APPROVE", async ({ req, actor }, context) => {
  const input = await readJson(req, orderChangeReviewSchema);
  return ok(await reviewOrderChangeRequest(await getId(context), input, actor, getClientIp(req)));
});
