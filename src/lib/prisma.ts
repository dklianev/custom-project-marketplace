import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const rawConnectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/atelier";
  const connectionUrl = new URL(rawConnectionString);

  // node-postgres handles TLS via config; removing sslmode avoids verify-full
  // behavior that breaks against Supabase pooler cert chains in local setups.
  connectionUrl.searchParams.delete("sslmode");
  connectionUrl.searchParams.delete("uselibpqcompat");

  const adapter = new PrismaPg({
    connectionString: connectionUrl.toString(),
    ssl:
      connectionUrl.hostname.includes("supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
