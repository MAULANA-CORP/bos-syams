import { getClientIp, ok, readJson, withAuth } from "@/lib/api-helpers";
import { updateCrmPipeline } from "@/lib/phase7-service";
import { crmPipelineUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const PATCH = withAuth(async ({ req, actor }, context) => {
  const input = await readJson(req, crmPipelineUpdateSchema);
  return ok(await updateCrmPipeline(await getId(context), input, actor, getClientIp(req)));
});
