// app/db.server.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

export const prisma = new PrismaClient();
