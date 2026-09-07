import { getClientIp, ok, readJson, withAuth } from "@/lib/api-helpers";
import { packingStatusSchema } from "@/lib/schemas";
import { updatePackingStatus } from "@/lib/phase3-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withAuth(async ({ req, actor }, context) => {
  const input = await readJson(req, packingStatusSchema);
  return ok(await updatePackingStatus(await getId(context), input, actor, getClientIp(req)));
});
