// app/routes/api.tags.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

/**
 * GET /api/tags?q=search - List tags with optional search
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const tags = await prisma.tag.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    take: 50,
  });
  
  return tags;
}

/**
 * POST /api/tags - Create or update tag
 * Body: { name: string }
 */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const { name } = await request.json();
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  
  const tag = await prisma.tag.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
  
  return tag;
}

