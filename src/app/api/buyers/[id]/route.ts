import { getPrisma } from "@/lib/prisma";
import { buyerUpdateSchema } from "@/lib/schemas";
import { ok, readJson, withPermission, getClientIp } from "@/lib/api-helpers";
import { updateBuyer } from "@/lib/buyer-service";

export const dynamic = "force-dynamic";

async function getId(context: { params: Promise<{ id: string }> | { id: string } }) {
  return (await context.params).id;
}

export const GET = withPermission("BUYER", "VIEW", async (_ctx, context) => {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  const id = await getId(typed);
  const buyer = await getPrisma().buyer.findUniqueOrThrow({ where: { id }, include: { contacts: true, orders: true } });
  return ok(buyer);
});

export const PATCH = withPermission("BUYER", "EDIT", async ({ req, actor }, context) => {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  const id = await getId(typed);
  const input = await readJson(req, buyerUpdateSchema);
  return ok(await updateBuyer(id, input, actor, getClientIp(req)));
});
