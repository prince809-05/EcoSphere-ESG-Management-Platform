import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function hasCurrentModelDelegates(client: PrismaClient) {
  return Prisma.dmmf.datamodel.models.every((model) => {
    const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    return delegateName in client;
  });
}

const cachedPrisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== 'production' && cachedPrisma && !hasCurrentModelDelegates(cachedPrisma)) {
  void cachedPrisma.$disconnect();
  globalForPrisma.prisma = undefined as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
