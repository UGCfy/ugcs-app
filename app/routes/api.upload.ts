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
  const { admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedMedia = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Convert file to base64 for Shopify Files API
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const mimeType = file.type;
      const filename = file.name;

      // Upload to Shopify Files API
      const mutation = `#graphql
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              ... on GenericFile {
                id
                url
                alt
              }
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await admin.graphql(mutation, {
        variables: {
          files: [
            {
              alt: filename,
              contentType: mimeType.startsWith("image/") ? "IMAGE" : "VIDEO",
              originalSource: `data:${mimeType};base64,${base64}`,
            },
          ],
        },
      });

      const result = await response.json();

      if (result.data?.fileCreate?.userErrors?.length > 0) {
        console.error("File upload error:", result.data.fileCreate.userErrors);
        continue;
      }

      const uploadedFile = result.data?.fileCreate?.files?.[0];
      let fileUrl = "";

      if (uploadedFile) {
        fileUrl = uploadedFile.url || uploadedFile.image?.url || "";
      }

      // If Shopify upload failed or URL is empty, use data URL as fallback
      if (!fileUrl) {
        fileUrl = `data:${mimeType};base64,${base64}`;
      }

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

