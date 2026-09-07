import { ok, withAuth } from "@/lib/api-helpers";
import { getControlTower } from "@/lib/phase7-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ actor }) => ok(await getControlTower(actor)));
