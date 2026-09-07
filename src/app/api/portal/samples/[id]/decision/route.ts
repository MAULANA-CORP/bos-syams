import { ok, readJson, withPortalAuth } from "@/lib/api-helpers";
import { decidePortalSample } from "@/lib/phase6-service";
import { portalSampleDecisionSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPortalAuth(async ({ req, portal }, context) => {
  const input = await readJson(req, portalSampleDecisionSchema);
  return ok(await decidePortalSample(await getId(context), input, portal));
});
