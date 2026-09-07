import { created, readJson, withPortalAuth } from "@/lib/api-helpers";
import { reportPortalPayment } from "@/lib/phase6-service";
import { portalPaymentEvidenceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = withPortalAuth(async ({ req, portal }) => {
  const input = await readJson(req, portalPaymentEvidenceSchema);
  return created(await reportPortalPayment(input, portal));
});
