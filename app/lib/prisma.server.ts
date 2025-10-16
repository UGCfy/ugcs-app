// app/lib/prisma.server.ts
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ log: ["warn", "error"] });
} else {
  prisma = global.__prisma__ ?? new PrismaClient({ log: ["warn", "error"] });
  global.__prisma__ = prisma;
}

export { prisma };

