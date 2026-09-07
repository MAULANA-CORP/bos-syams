import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createPortalAccount, listPortalAccounts } from "@/lib/phase6-service";
import { portalAccountCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("PORTAL", "VIEW", async () => ok(await listPortalAccounts()));

export const POST = withPermission("PORTAL", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, portalAccountCreateSchema);
  return created(await createPortalAccount(input, actor, getClientIp(req)));
});
