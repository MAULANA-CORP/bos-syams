import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { quotationStatusSchema } from "@/lib/schemas";
import { updateQuotationStatus } from "@/lib/phase2-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("QUOTATION", "EXECUTE", async ({ req, actor }, context) => {
  const input = await readJson(req, quotationStatusSchema);
  return ok(await updateQuotationStatus(await getId(context), input, actor, getClientIp(req)));
});
