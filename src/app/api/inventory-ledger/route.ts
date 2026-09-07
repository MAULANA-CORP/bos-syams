import { ok, withPermission } from "@/lib/api-helpers";
import { listInventoryLedger } from "@/lib/phase4-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("INVENTORY", "VIEW", async () => ok(await listInventoryLedger()));
