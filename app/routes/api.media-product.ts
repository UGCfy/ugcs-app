// app/routes/api.media-product.ts
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * POST /api/media-product - Set product on media
 * DELETE /api/media-product - Unset product from media
 * Body: { mediaId: string, productId?: string }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const method = request.method.toUpperCase();
  const { mediaId, productId } = await request.json();

  if (!mediaId) {
    return { error: "mediaId required" };
  }

  if (method === "POST") {
    if (!productId) {
      return { error: "productId required" };
    }
    await prisma.media.update({
      where: { id: mediaId },
      data: { productId },
    });
    return { ok: true };
  }

  if (method === "DELETE") {
    await prisma.media.update({
      where: { id: mediaId },
      data: { productId: null },
    });
    return { ok: true };
  }

  return { error: "Unsupported method" };
};

