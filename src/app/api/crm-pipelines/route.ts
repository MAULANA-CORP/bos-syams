import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createCrmPipeline, listCrmPipelines } from "@/lib/phase7-service";
import { crmPipelineCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("CRM", "VIEW", async () => ok(await listCrmPipelines()));

export const POST = withPermission("CRM", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, crmPipelineCreateSchema);
  return created(await createCrmPipeline(input, actor, getClientIp(req)));
});
