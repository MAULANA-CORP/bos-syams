import { ok, withPermission } from "@/lib/api-helpers";
import { getControlTower } from "@/lib/phase7-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("CONTROL_TOWER", "VIEW", async ({ actor }) => ok(await getControlTower(actor)));
