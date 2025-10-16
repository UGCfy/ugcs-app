// app/routes/api.media.$id.ts
// Update or delete a single media item
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const mediaId = params.id;
  if (!mediaId) {
    return Response.json({ error: "Media ID required" }, { status: 400 });
  }

  // DELETE - Remove media
  if (request.method === "DELETE") {
    try {
      await db.media.delete({
        where: { id: mediaId },
      });
      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete failed:", error);
      return Response.json({ error: "Delete failed" }, { status: 500 });
    }
  }

  // PATCH - Update media
  if (request.method === "PATCH") {
    try {
      const data = await request.json();
      const { caption } = data;

      await db.media.update({
        where: { id: mediaId },
        data: {
          caption: caption !== undefined ? caption : undefined,
        },
      });

      return Response.json({ success: true });
    } catch (error) {
      console.error("Update failed:", error);
      return Response.json({ error: "Update failed" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

