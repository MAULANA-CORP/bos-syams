import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateRevisionRequest } from "@/lib/revision-service";
import { revisionUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const params = await (context as { params: Promise<{ id: string }> }).params;
  return params.id;
}

export const PATCH = withPermission("REVISION", "EDIT", async ({ req, actor }, context) => {
  const input = await readJson(req, revisionUpdateSchema);
  return ok(await updateRevisionRequest(await getId(context), input, actor, getClientIp(req)));
});
