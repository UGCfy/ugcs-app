// app/routes/api.media-tags.ts
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * POST /api/media-tags - Link tag to media
 * DELETE /api/media-tags - Unlink tag from media
 * Body: { mediaId: string, tagId: string }
 */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const method = request.method.toUpperCase();
  const { mediaId, tagId } = await request.json();

  if (method === "POST") {
    await prisma.mediaTag.upsert({
      where: { mediaId_tagId: { mediaId, tagId } },
      update: {},
      create: { mediaId, tagId },
    });
    return { ok: true };
  }

  if (method === "DELETE") {
    await prisma.mediaTag.deleteMany({ where: { mediaId, tagId } });
    return { ok: true };
  }

  return { error: "Unsupported method" };
}

