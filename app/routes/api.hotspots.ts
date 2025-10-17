// app/routes/api.hotspots.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { prisma } from "../lib/prisma.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const mediaId = url.searchParams.get("mediaId");

  if (!mediaId) {
    return { error: "mediaId required" };
  }

  try {
    const hotspots = await prisma.productHotspot.findMany({
      where: { mediaId },
      orderBy: { timestamp: "asc" },
    });

    return { hotspots };
  } catch (error) {
    console.error("Error fetching hotspots:", error);
    return { error: "Failed to fetch hotspots" };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    // CREATE hotspot
    if (intent === "create") {
      const mediaId = formData.get("mediaId") as string;
      const productId = formData.get("productId") as string;
      const timestamp = parseFloat(formData.get("timestamp") as string);
      const duration = parseFloat((formData.get("duration") as string) || "5.0");
      const position = (formData.get("position") as string) || "bottom-right";

      if (!mediaId || !productId || isNaN(timestamp)) {
        return { error: "Missing required fields" };
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

      return { hotspot };
    }

    // UPDATE hotspot
    if (intent === "update") {
      const id = formData.get("id") as string;
      const timestamp = formData.get("timestamp") as string;
      const duration = formData.get("duration") as string;
      const position = formData.get("position") as string;

      const updateData: any = {};
      if (timestamp) updateData.timestamp = parseFloat(timestamp);
      if (duration) updateData.duration = parseFloat(duration);
      if (position) updateData.position = position;

      const hotspot = await prisma.productHotspot.update({
        where: { id },
        data: updateData,
      });

      return { hotspot };
    }

    // DELETE hotspot
    if (intent === "delete") {
      const id = formData.get("id") as string;

      await prisma.productHotspot.delete({
        where: { id },
      });

      return { success: true };
    }

    return { error: "Invalid intent" };
  } catch (error) {
    console.error("Error managing hotspots:", error);
    return { error: "Failed to manage hotspots" };
  }
}

