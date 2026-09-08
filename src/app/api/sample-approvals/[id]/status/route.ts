import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateSampleApprovalStatus } from "@/lib/phase7-service";
import { sampleApprovalStatusSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("SAMPLE", "APPROVE", async ({ req, actor }, context) => {
  const input = await readJson(req, sampleApprovalStatusSchema);
  return ok(await updateSampleApprovalStatus(await getId(context), input, actor, getClientIp(req)));
});
