import { ok, withAuth } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ actor }) => ok(actor));
