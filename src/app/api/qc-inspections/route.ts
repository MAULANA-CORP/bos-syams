import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { qcInspectionCreateSchema } from "@/lib/schemas";
import { createQualityInspection, listQualityInspections } from "@/lib/phase3-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("QC", "VIEW", async () => ok(await listQualityInspections()));

export const POST = withPermission("QC", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, qcInspectionCreateSchema);
  return created(await createQualityInspection(input, actor, getClientIp(req)));
});
