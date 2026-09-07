import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { listPayments, reportPayment } from "@/lib/phase5-service";
import { paymentReportSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("PAYMENT", "VIEW", async () => ok(await listPayments()));

export const POST = withPermission("PAYMENT", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, paymentReportSchema);
  return created(await reportPayment(input, actor, getClientIp(req)));
});
