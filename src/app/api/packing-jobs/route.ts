import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { packingJobCreateSchema } from "@/lib/schemas";
import { createPackingJob, listPackingJobs } from "@/lib/phase3-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("PACKING", "VIEW", async () => ok(await listPackingJobs()));

export const POST = withPermission("PACKING", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, packingJobCreateSchema);
  return created(await createPackingJob(input, actor, getClientIp(req)));
});
