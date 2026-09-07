import { batchCreateSchema } from "@/lib/schemas";
import { createBatch, listBatches } from "@/lib/order-service";
import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("BATCH", "VIEW", async () => ok(await listBatches()));

export const POST = withPermission("BATCH", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, batchCreateSchema);
  return created(await createBatch(input, actor, getClientIp(req)));
});
