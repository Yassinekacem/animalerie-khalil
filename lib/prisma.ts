import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConstructor: typeof PrismaClient | undefined;
};

// Hot reload preserves globalThis even after Prisma Client has been regenerated.
// An instance created with an older schema silently omits newly added fields.
const cachedPrisma = globalForPrisma.prismaConstructor === PrismaClient ? globalForPrisma.prisma : undefined;

export const prisma =
  cachedPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      // Allow cold connections to establish, but never wait indefinitely for the pool.
      connectionTimeoutMillis: 15_000,
    }),
  });

if (process.env.NODE_ENV !== "production") {
  if (globalForPrisma.prisma && globalForPrisma.prisma !== prisma) {
    void globalForPrisma.prisma.$disconnect().catch(error => {
      console.error("Failed to disconnect outdated Prisma Client:", error);
    });
  }
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConstructor = PrismaClient;
}
