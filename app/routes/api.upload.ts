// app/routes/api.upload.ts
// File upload API - handles direct file uploads and stores in Shopify Files
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * POST /api/upload
 * Handles multipart file uploads
 * Uploads to Shopify Files API and creates Media records
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedMedia = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // For now, store file as data URL to avoid stack overflow with large files
      // In production, you'd upload to a CDN (Cloudinary, S3, etc.)
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const mimeType = file.type;
      const filename = file.name;
      
      // Convert to base64 in chunks to avoid stack overflow
      let base64 = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < bytes.length; i += chunkSize) {
        base64 += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      base64 = btoa(base64);
      
      // For MVP, use data URLs (works for small files)
      // TODO: Integrate Cloudinary or S3 for production
      const fileUrl = `data:${mimeType};base64,${base64}`;

      // Create media record
      const media = await db.media.create({
        data: {
          url: fileUrl,
          caption: filename.replace(/\.[^/.]+$/, ""), // Filename without extension
          sourceType: "UPLOAD",
          status: "DRAFT",
          tags: [],
        },
      });

      uploadedMedia.push({
        id: media.id,
        url: media.url,
        caption: media.caption,
        status: media.status,
      });
    }

    return Response.json({
      success: true,
      uploaded: uploadedMedia.length,
      media: uploadedMedia,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
};

