import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createProcurementRequest, listProcurementRequests } from "@/lib/phase4-service";
import { procurementRequestCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("PROCUREMENT", "VIEW", async () => ok(await listProcurementRequests()));

export const POST = withPermission("PROCUREMENT", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, procurementRequestCreateSchema);
  return created(await createProcurementRequest(input, actor, getClientIp(req)));
});
