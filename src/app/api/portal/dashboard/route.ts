import { ok, withPortalAuth } from "@/lib/api-helpers";
import { getPortalDashboard } from "@/lib/phase6-service";

export const dynamic = "force-dynamic";

export const GET = withPortalAuth(async ({ portal }) => ok(await getPortalDashboard(portal)));
