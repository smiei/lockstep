import path from "node:path";
// The /web build talks to Turso over HTTP in plain JS. The default build loads
// libSQL's native binding at import time, and that binding does not load on
// the Docker image's Alpine at all - even though Docker never uses it.
import { PrismaLibSql } from "@prisma/adapter-libsql/web";
// A SQLite file is opened by better-sqlite3 (native), through the same adapter
// interface: Prisma 7 has no query engine of its own any more.
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";

// A relative sqlite `file:` URL means prisma/<file> (the Prisma 6 CLI resolved
// it against prisma/schema.prisma, and every existing install's
// `file:./dev.db` relies on that). Prisma 7's CLI would use the project root,
// so prisma.config.ts applies the same rule; better-sqlite3 itself opens
// relative paths against the cwd. Make it absolute here so the app opens the
// exact same file the CLI migrated.
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url.startsWith("file:") && !path.isAbsolute(url.slice("file:".length))) {
    const absolute = path.join(process.cwd(), "prisma", url.slice("file:".length));
    return `file:${absolute.split(path.sep).join("/")}`;
  }
  return url;
}

// Two ways to reach the same SQLite schema, both through a driver adapter. A
// self-hosted container opens its database file with better-sqlite3. A hosted
// deployment (Vercel) has no file that survives a request and talks to Turso
// over the libSQL adapter instead - TURSO_DATABASE_URL is what the Vercel
// Marketplace integration sets. `unixepoch-ms` makes both adapters store
// DateTime as the integer the Rust engine of Prisma 6 wrote (and every
// existing database holds), so both paths read and sort each other's rows,
// and old files, identically.
function createClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    // A hosted database means a hosted deployment, and a hosted deployment that
    // is not built as a public instance lists every run in it to every visitor
    // (src/lib/instance.ts). scripts/build-public.mjs sets the flag itself, so
    // this only fires for a build made some other way - fail loudly instead.
    if (!IS_PUBLIC_INSTANCE) {
      throw new Error(
        "TURSO_DATABASE_URL is set, but this build is not a public instance. " +
          "Build with `npm run build:public` (vercel.json does), or unset TURSO_DATABASE_URL.",
      );
    }
    const adapter = new PrismaLibSql(
      { url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN },
      { timestampFormat: "unixepoch-ms" },
    );
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaBetterSqlite3(
    { url: resolveDatabaseUrl() },
    { timestampFormat: "unixepoch-ms" },
  );
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
