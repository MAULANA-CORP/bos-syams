import { getPrisma } from "@/lib/prisma";
import { orderUpdateSchema } from "@/lib/schemas";
import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateOrder } from "@/lib/order-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const GET = withPermission("ORDER", "VIEW", async (_ctx, context) => {
  const id = await getId(context);
  const order = await getPrisma().order.findUniqueOrThrow({
    where: { id },
    include: { buyer: true, articles: { include: { sizes: { include: { size: true } }, batches: true, garmentType: true, color: true } } },
  });
  return ok(order);
});

export const PATCH = withPermission("ORDER", "EDIT", async ({ req, actor }, context) => {
  const id = await getId(context);
  const input = await readJson(req, orderUpdateSchema);
  return ok(await updateOrder(id, input, actor, getClientIp(req)));
});
