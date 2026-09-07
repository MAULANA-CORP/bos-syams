import { orderCreateSchema } from "@/lib/schemas";
import { createOrder, listOrders } from "@/lib/order-service";
import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("ORDER", "VIEW", async ({ actor }) => ok(await listOrders(actor)));

export const POST = withPermission("ORDER", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, orderCreateSchema);
  return created(await createOrder(input, actor, getClientIp(req)));
});
