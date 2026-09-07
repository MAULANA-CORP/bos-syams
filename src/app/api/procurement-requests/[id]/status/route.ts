import { getClientIp, ok, readJson, withAuth } from "@/lib/api-helpers";
import { updateProcurementRequestStatus } from "@/lib/phase4-service";
import { procurementStatusSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withAuth(async ({ req, actor }, context) => {
  const input = await readJson(req, procurementStatusSchema);
  return ok(await updateProcurementRequestStatus(await getId(context), input, actor, getClientIp(req)));
});
