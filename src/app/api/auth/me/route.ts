import { ok, withAuth } from "@/lib/api-helpers";
import { listAllowedPermissions } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ actor }) => ok({
  ...actor,
  permissions: await listAllowedPermissions(actor),
}));
