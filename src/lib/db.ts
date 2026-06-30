import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  // Detect libSQL/Turso URLs — use the adapter for those.
  if (url && (url.startsWith("libsql://") || url.startsWith("https://"))) {
    const libsql = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter } as any);
  }

  // Local SQLite (file:./...) — default engine
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

// Lazy singleton — only create client when actually used.
// This avoids crashing at module load if DATABASE_URL points to a file
// that doesn't exist yet (Vercel production without DB configured).
let _db: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (_db) return _db;
  _db = globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _db;
  return _db;
}

// Proxy that forwards property access to the lazily-created Prisma client.
// Lets us import { db } anywhere without crashing at module-eval time.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
