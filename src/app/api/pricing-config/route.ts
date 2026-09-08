import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { getPricingConfig, updatePricingConfig } from "@/lib/phase2-service";
import { pricingConfigSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("QUOTATION", "VIEW", async ({ actor }) => ok(await getPricingConfig(actor)));

export const PATCH = withPermission("QUOTATION", "APPROVE", async ({ req, actor }) => {
  const input = await readJson(req, pricingConfigSchema);
  return ok(await updatePricingConfig(input, actor, getClientIp(req)));
});
