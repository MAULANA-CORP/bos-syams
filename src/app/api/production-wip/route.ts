import { ok, withPermission } from "@/lib/api-helpers";
import { listWipByLocation } from "@/lib/phase3-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("PRODUCTION", "VIEW", async () => ok(await listWipByLocation()));
