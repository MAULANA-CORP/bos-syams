import { created, ok, readJson, withPortalAuth } from "@/lib/api-helpers";
import { createPortalTicket, getPortalDashboard } from "@/lib/phase6-service";
import { portalTicketCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPortalAuth(async ({ portal }) => ok((await getPortalDashboard(portal)).tickets));

export const POST = withPortalAuth(async ({ req, portal }) => {
  const input = await readJson(req, portalTicketCreateSchema);
  return created(await createPortalTicket(input, portal));
});
