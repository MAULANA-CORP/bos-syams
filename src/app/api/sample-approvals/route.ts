import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createSampleApproval, listSampleApprovals } from "@/lib/phase7-service";
import { sampleApprovalCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("SAMPLE", "VIEW", async () => ok(await listSampleApprovals()));

export const POST = withPermission("SAMPLE", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, sampleApprovalCreateSchema);
  return created(await createSampleApproval(input, actor, getClientIp(req)));
});
