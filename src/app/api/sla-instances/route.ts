import { ok, withPermission } from "@/lib/api-helpers";
import { listSlaInstances } from "@/lib/sla-service";

export const dynamic = "force-dynamic";

export const GET = withPermission("SLA_RULE", "VIEW", async () => ok(await listSlaInstances()));
