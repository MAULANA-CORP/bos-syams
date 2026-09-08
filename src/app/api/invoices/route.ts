import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createInvoice, listInvoices } from "@/lib/phase5-service";
import { invoiceCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("INVOICE", "VIEW", async ({ actor }) => ok(await listInvoices(actor)));

export const POST = withPermission("INVOICE", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, invoiceCreateSchema);
  return created(await createInvoice(input, actor, getClientIp(req)));
});
