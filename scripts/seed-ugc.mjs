import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Upsert a couple of tags
  const tagTraining = await prisma.tag.upsert({
    where: { slug: "training" },
    update: {},
    create: { name: "Training", slug: "training" },
  });

  const tagHandbags = await prisma.tag.upsert({
    where: { slug: "handbags" },
    update: {},
    create: { name: "Handbags", slug: "handbags" },
  });

  // Create one demo media if none exists
  const existing = await prisma.media.findFirst();
  const media = existing ?? await prisma.media.create({
    data: {
      url: "https://example.com/ugc/demo-video.mp4",
      caption: "Demo UGC clip",
      sourceType: "UPLOAD",
      status: "APPROVED",
      tags: [], // keep legacy array empty for now
    },
  });

  // Link media ↔ tags via normalized join table
  await prisma.mediaTag.upsert({
    where: { mediaId_tagId: { mediaId: media.id, tagId: tagTraining.id } },
    update: {},
    create: { mediaId: media.id, tagId: tagTraining.id },
  });

  await prisma.mediaTag.upsert({
    where: { mediaId_tagId: { mediaId: media.id, tagId: tagHandbags.id } },
    update: {},
    create: { mediaId: media.id, tagId: tagHandbags.id },
  });

  console.log("Seeded:", {
    media: media.id,
    tags: [tagTraining.slug, tagHandbags.slug],
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
