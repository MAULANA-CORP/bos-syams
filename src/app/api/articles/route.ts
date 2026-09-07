import { articleCreateSchema } from "@/lib/schemas";
import { createArticle } from "@/lib/order-service";
import { created, getClientIp, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const POST = withPermission("ARTICLE", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, articleCreateSchema);
  return created(await createArticle(input, actor, getClientIp(req)));
});
