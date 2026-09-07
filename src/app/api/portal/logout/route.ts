import { ok } from "@/lib/api-helpers";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  session.portalAccountId = undefined;
  session.portalBuyerId = undefined;
  session.portalEmail = undefined;
  session.isPortalLoggedIn = false;
  await session.save();
  return ok({ loggedOut: true });
}
