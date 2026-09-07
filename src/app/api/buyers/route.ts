import { buyerCreateSchema } from "@/lib/schemas";
import { createBuyer, listBuyers } from "@/lib/buyer-service";
import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("BUYER", "VIEW", async () => ok(await listBuyers()));

export const POST = withPermission("BUYER", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, buyerCreateSchema);
  return created(await createBuyer(input, actor, getClientIp(req)));
});
