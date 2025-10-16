// app/routes/api.track.ts
// Public API for tracking media views and clicks (no auth required - called from storefront)
import type { ActionFunctionArgs } from "react-router";
import { prisma } from "../lib/prisma.server";

/**
 * POST /api/track
 * Body: { 
 *   type: "view" | "click",
 *   mediaId: string,
 *   clickType?: "media" | "product",
 *   productId?: string,
 *   shopDomain?: string,
 *   widgetId?: string,
 * }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = await request.json();
    const { type, mediaId, clickType, productId, shopDomain, widgetId } = data;

    if (!type || !mediaId) {
      return Response.json({ error: "type and mediaId required" }, { status: 400 });
    }

    // Get user agent and referrer from headers
    const userAgent = request.headers.get("user-agent") || undefined;
    const referrer = request.headers.get("referer") || undefined;

    if (type === "view") {
      // Record a view
      await prisma.mediaView.create({
        data: {
          mediaId,
          shopDomain,
          widgetId,
          referrer,
          userAgent,
        },
      });

      return Response.json({ success: true });
    }

    if (type === "click") {
      // Record a click
      await prisma.mediaClick.create({
        data: {
          mediaId,
          clickType: clickType || "media",
          productId,
          shopDomain,
          widgetId,
          referrer,
          userAgent,
        },
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Analytics tracking error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};

