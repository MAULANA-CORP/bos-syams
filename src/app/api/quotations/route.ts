import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { quotationCreateSchema } from "@/lib/schemas";
import { createQuotation, listQuotations } from "@/lib/phase2-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("QUOTATION", "VIEW", async ({ actor }) => ok(await listQuotations(actor)));

export const POST = withPermission("QUOTATION", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, quotationCreateSchema);
  return created(await createQuotation(input, actor, getClientIp(req)));
});
