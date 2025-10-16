// app/routes/api.import-instagram.ts
// Instagram import API - fetches posts and creates media records
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * POST /api/import-instagram
 * Body: { channelId: string, hashtag?: string, limit?: number }
 * 
 * Fetches recent Instagram posts and creates media records
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const { channelId, hashtag, limit = 10 } = await request.json();

  // Get channel with access token
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel || channel.type !== "INSTAGRAM") {
    return { error: "Invalid Instagram channel" };
  }

  if (!channel.accessToken) {
    return { error: "No access token found. Please reconnect Instagram." };
  }

  try {
    // Get Instagram Business Account ID from metadata
    const metadata = JSON.parse(channel.metadata || "{}");
    const instagramAccountId = metadata.instagramAccountId;

    if (!instagramAccountId) {
      throw new Error("Instagram Account ID not found. Please reconnect your Instagram account.");
    }

    // Fetch user's recent media using Instagram Graph API
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username";
    const apiUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=${fields}&access_token=${channel.accessToken}&limit=${limit}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const posts = data.data || [];
    let imported = 0;
    const skipped = [];

    for (const post of posts) {
      // Skip non-video/image posts
      if (!["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].includes(post.media_type)) {
        continue;
      }

      const mediaUrl = post.media_type === "VIDEO" ? post.media_url : post.thumbnail_url || post.media_url;

      // Check if already imported
      const existing = await prisma.media.findFirst({
        where: { url: mediaUrl },
      });

      if (existing) {
        skipped.push(post.id);
        continue;
      }

      // Create media record
      await prisma.media.create({
        data: {
          url: mediaUrl,
          caption: post.caption || null,
          sourceType: "INSTAGRAM",
          status: "DRAFT", // Requires moderation
          tags: hashtag ? [hashtag] : [],
        },
      });

      imported++;
    }

    // Update channel last synced
    await prisma.channel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      imported,
      skipped: skipped.length,
      total: posts.length,
    };
  } catch (error: any) {
    console.error("Instagram import failed:", error);
    
    // If token expired, mark channel as error
    if (error.message?.includes("expired") || error.message?.includes("token")) {
      await prisma.channel.update({
        where: { id: channelId },
        data: { status: "ERROR" },
      });
    }

    return { error: error.message };
  }
};

