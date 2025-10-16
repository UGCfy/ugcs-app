// app/routes/api.media-bulk.ts
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * POST /api/media-bulk - Bulk update media status
 * Body: { ids: string[], status: "DRAFT" | "APPROVED" | "REJECTED" }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const { ids, status } = await request.json();

  if (!Array.isArray(ids) || !ids.length) {
    return { error: "ids required" };
  }

  if (!["DRAFT", "APPROVED", "REJECTED"].includes(status)) {
    return { error: "invalid status" };
  }

  const result = await prisma.media.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return { ok: true, count: result.count };
};

