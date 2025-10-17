import { json } from "@remix-run/node";
import prisma from "../lib/prisma.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const mediaId = url.searchParams.get("mediaId");

  if (!mediaId) {
    return json({ error: "mediaId required" }, { status: 400 });
  }

  try {
    const hotspots = await prisma.productHotspot.findMany({
      where: { mediaId },
      orderBy: { timestamp: "asc" },
    });

    return json({ hotspots });
  } catch (error) {
    console.error("Error fetching hotspots:", error);
    return json({ error: "Failed to fetch hotspots" }, { status: 500 });
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    // CREATE hotspot
    if (intent === "create") {
      const mediaId = formData.get("mediaId");
      const productId = formData.get("productId");
      const timestamp = parseFloat(formData.get("timestamp"));
      const duration = parseFloat(formData.get("duration") || "5.0");
      const position = formData.get("position") || "bottom-right";

      if (!mediaId || !productId || isNaN(timestamp)) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }

      const hotspot = await prisma.productHotspot.create({
        data: {
          mediaId,
          productId,
          timestamp,
          duration,
          position,
        },
      });

      return json({ hotspot });
    }

    // UPDATE hotspot
    if (intent === "update") {
      const id = formData.get("id");
      const timestamp = formData.get("timestamp");
      const duration = formData.get("duration");
      const position = formData.get("position");

      const updateData = {};
      if (timestamp) updateData.timestamp = parseFloat(timestamp);
      if (duration) updateData.duration = parseFloat(duration);
      if (position) updateData.position = position;

      const hotspot = await prisma.productHotspot.update({
        where: { id },
        data: updateData,
      });

      return json({ hotspot });
    }

    // DELETE hotspot
    if (intent === "delete") {
      const id = formData.get("id");

      await prisma.productHotspot.delete({
        where: { id },
      });

      return json({ success: true });
    }

    return json({ error: "Invalid intent" }, { status: 400 });
  } catch (error) {
    console.error("Error managing hotspots:", error);
    return json({ error: "Failed to manage hotspots" }, { status: 500 });
  }
}

