// app/routes/api.media.ts
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * Resource route: /api/media
 * 
 * Query params:
 * - ?q=search     : Full-text search on url/caption
 * - ?tag=slug     : Filter by tag slug or name
 * 
 * Returns: JSON array of media with normalized tags
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // 🔒 Shopify admin authentication
  await authenticate.admin(request);

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const tag = url.searchParams.get("tag") ?? "";

  const data = await prisma.media.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { url: { contains: q, mode: "insensitive" } },
                { caption: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        tag
          ? {
              mediaTags: {
                some: { tag: { OR: [{ slug: tag }, { name: tag }] } },
              },
            }
          : {},
      ],
    },
    include: {
      mediaTags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return data.map((m) => ({
    id: m.id,
    url: m.url,
    caption: m.caption,
    status: m.status,
    tags: m.mediaTags.map((mt) => ({ 
      id: mt.tag.id, 
      name: mt.tag.name, 
      slug: mt.tag.slug 
    })),
    createdAt: m.createdAt,
  }));
}

