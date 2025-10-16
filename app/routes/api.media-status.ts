// app/routes/api.media-status.ts
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * POST /api/media-status - Update media status
 * Body: { mediaId: string, status: "DRAFT" | "APPROVED" | "REJECTED" }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const { mediaId, status } = await request.json();

  if (!mediaId || !status) {
    return { error: "mediaId and status required" };
  }

  if (!["DRAFT", "APPROVED", "REJECTED"].includes(status)) {
    return { error: "invalid status" };
  }

  await prisma.media.update({
    where: { id: mediaId },
    data: { status },
  });

  return { ok: true };
};

