import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { productionHandoffCreateSchema } from "@/lib/schemas";
import { createProductionHandoff, listProductionHandoffs } from "@/lib/phase3-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("PRODUCTION", "VIEW", async () => ok(await listProductionHandoffs()));

export const POST = withPermission("PRODUCTION", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, productionHandoffCreateSchema);
  return created(await createProductionHandoff(input, actor, getClientIp(req)));
});
