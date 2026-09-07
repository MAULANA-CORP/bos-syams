import { ok, withPermission } from "@/lib/api-helpers";
import { listPortalTickets } from "@/lib/phase6-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("PORTAL", "VIEW", async () => ok(await listPortalTickets()));
