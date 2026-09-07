import { ok, withPortalAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPortalAuth(async ({ portal }) => ok(portal));
