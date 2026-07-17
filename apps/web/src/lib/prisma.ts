import { devPrisma } from "./dev-db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _prisma: any;

function getPrisma() {
  if (process.env.DEV_MODE === "true") return devPrisma;

  if (!_prisma) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@prisma/client");
    const globalForPrisma = globalThis as unknown as { prisma: unknown };
    _prisma = globalForPrisma.prisma || new PrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prisma;
  }
  return _prisma;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = getPrisma();
