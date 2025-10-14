// app/db.server.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

// Single Prisma client for the whole app
const prisma = new PrismaClient();

// Export both named and default to satisfy all imports
export { PrismaClient, prisma };
export default prisma;
