// Applies prisma/migrations/*/migration.sql to a libSQL database - Turso, for
// the public Vercel instance - and re-syncs Encounter.familyId afterwards.
//
// Why this exists: `prisma migrate deploy` opens the database with Prisma's
// own SQLite engine, which cannot talk to a hosted Turso database (that is
// HTTP, not a file). The self-hosted container keeps using migrate deploy from
// docker-entrypoint.sh; there is no container start on Vercel, so this runs by
// hand from a developer machine before a deploy that carries a new migration:
//
//   npm run migrate:turso            # apply what is pending, then re-sync familyId
//   npm run migrate:turso -- --dry-run
//
// It reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from the environment, or from
// .env.local / .env (`vercel env pull .env.local` fetches them).
//
// What has to stay true - each of these was checked against a populated
// database, see src/lib/__tests__/migrateTurso.test.ts:
//
// - Every migration is executed as one plain multi-statement script, NEVER
//   inside a transaction. Prisma's table-redefine migrations start with
//   `PRAGMA foreign_keys=OFF`, which SQLite ignores inside a transaction - and
//   libSQL, unlike stock SQLite, has foreign keys ON by default. Wrapped in a
//   transaction, `DROP TABLE "Run"` would cascade-delete every Encounter,
//   SoulLink and LevelCapProgress row of every run. This is also exactly how
//   Prisma itself applies a SQLite migration.
// - The price of that is that a migration which fails half way is not rolled
//   back. Take a backup first (`turso db shell <db> .dump`, or a branch); the
//   failure message says which migration it was and that it is NOT recorded.
// - Applied migrations are tracked in their own table, keyed by directory name
//   with a checksum, so an edited migration is refused instead of silently
//   skipped. Line endings are normalised before hashing: a Windows checkout
//   and a Linux one must agree.
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
export const DEFAULT_MIGRATIONS_DIR = path.join(rootDir, "prisma", "migrations");
export const TRACKING_TABLE = "_nuzlocke_migrations";

const normalize = (sql) => sql.replace(/\r\n/g, "\n");

export async function listMigrations(dir = DEFAULT_MIGRATIONS_DIR) {
  const entries = await readdir(dir, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const migrations = [];
  for (const name of names) {
    const sql = normalize(await readFile(path.join(dir, name, "migration.sql"), "utf-8"));
    migrations.push({ name, sql, checksum: createHash("sha256").update(sql).digest("hex") });
  }
  return migrations;
}

// Which migrations are still to run, and what stops the run. `applied` maps a
// migration's directory name to the checksum it had when it was applied.
export function planMigrations(migrations, applied) {
  const known = new Set(migrations.map((m) => m.name));
  const errors = [];
  for (const [name, checksum] of applied) {
    const migration = migrations.find((m) => m.name === name);
    if (!migration) {
      errors.push(`${name} was applied to this database but no longer exists in prisma/migrations.`);
    } else if (migration.checksum !== checksum) {
      errors.push(`${name} was edited after it was applied. Migrations are append-only - add a new one instead.`);
    }
  }
  const pending = migrations.filter((m) => !applied.has(m.name));
  // An applied migration sitting AFTER a pending one means the history was
  // rewritten; applying the gap now would run things out of order.
  const lastApplied = migrations.map((m) => applied.has(m.name)).lastIndexOf(true);
  const gap = pending.find((m) => migrations.indexOf(m) < lastApplied);
  if (gap) errors.push(`${gap.name} is pending but a later migration is already applied.`);
  return { pending, errors, unknown: [...applied.keys()].filter((name) => !known.has(name)) };
}

async function tableExists(client, name) {
  const result = await client.execute({
    sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return result.rows.length > 0;
}

export async function migrate(client, { dir = DEFAULT_MIGRATIONS_DIR, dryRun = false, log = console.log } = {}) {
  const migrations = await listMigrations(dir);
  await client.execute(
    `CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" (` +
      `"name" TEXT NOT NULL PRIMARY KEY, "checksum" TEXT NOT NULL, "appliedAt" TEXT NOT NULL)`,
  );
  const rows = (await client.execute(`SELECT "name", "checksum" FROM "${TRACKING_TABLE}"`)).rows;
  const applied = new Map(rows.map((row) => [String(row.name), String(row.checksum)]));

  // Tables but no history: this database was set up some other way. Running
  // migration 1 over it would fail on the first CREATE TABLE and leave a mess.
  if (applied.size === 0 && (await tableExists(client, "Run"))) {
    throw new Error(
      `This database already has a "Run" table but no migration history in ${TRACKING_TABLE}. ` +
        `Refusing to guess which migrations it already contains.`,
    );
  }

  const { pending, errors } = planMigrations(migrations, applied);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  if (pending.length === 0) {
    log(`Database is up to date (${migrations.length} migrations).`);
    return { applied: [] };
  }

  const done = [];
  for (const migration of pending) {
    if (dryRun) {
      log(`would apply ${migration.name}`);
      continue;
    }
    log(`applying ${migration.name} ...`);
    try {
      await client.executeMultiple(migration.sql);
    } catch (error) {
      throw new Error(
        `Migration ${migration.name} failed and was NOT recorded as applied - it may have run partly, ` +
          `and nothing was rolled back. Restore your backup before trying again.\n${error.message}`,
      );
    }
    await client.execute({
      sql: `INSERT INTO "${TRACKING_TABLE}" ("name", "checksum", "appliedAt") VALUES (?, ?, ?)`,
      args: [migration.name, migration.checksum, new Date().toISOString()],
    });
    done.push(migration.name);
  }
  log(dryRun ? `${pending.length} migration(s) pending.` : `Applied ${done.length} migration(s).`);
  return { applied: done };
}

// Encounter.familyId is denormalised at write time, so a correction to a
// species' family in data/pokemon.json never reaches rows that already exist.
// scripts/backfill-encounter-families.mjs does the same for the container's
// SQLite file through `prisma db execute`; this is the libSQL twin. Idempotent:
// it only touches rows whose stored value disagrees with the data.
export async function backfillFamilies(client, log = console.log) {
  if (!(await tableExists(client, "Encounter"))) return 0;
  const pokemon = JSON.parse(await readFile(path.join(rootDir, "data", "pokemon.json"), "utf-8"));
  const pairs = pokemon
    .filter((p) => Number.isInteger(p.id) && Number.isInteger(p.family_id))
    .map((p) => [p.id, p.family_id]);
  if (pairs.length === 0) return 0;
  const cases = pairs.map(([id, family]) => `WHEN ${id} THEN ${family}`).join(" ");
  const ids = pairs.map(([id]) => id).join(",");
  const result = await client.execute(
    `UPDATE "Encounter" SET "familyId" = CASE "pokemonId" ${cases} END ` +
      `WHERE "pokemonId" IN (${ids}) AND "familyId" <> CASE "pokemonId" ${cases} END`,
  );
  log(`Encounter.familyId re-synced against ${pairs.length} species (${result.rowsAffected} row(s) changed).`);
  return result.rowsAffected;
}

async function main() {
  const dotenv = await import("dotenv");
  dotenv.config({ path: [path.join(rootDir, ".env.local"), path.join(rootDir, ".env")], quiet: true });

  const args = new Set(process.argv.slice(2));
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    console.error("TURSO_DATABASE_URL is not set (put it in .env.local, or run `vercel env pull .env.local`).");
    process.exitCode = 1;
    return;
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const target = url.startsWith("file:") ? url : new URL(url.replace(/^libsql:/, "https:")).host;
    console.log(`Target: ${target}`);

    // The schema's ON DELETE CASCADE relations (deleting a run takes its
    // encounters with it) only work while foreign keys are enforced.
    const foreignKeys = (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys;
    if (Number(foreignKeys) !== 1) {
      console.warn("WARNING: foreign keys are OFF on this database - deleting a run would leave its rows behind.");
    }

    await migrate(client, { dryRun: args.has("--dry-run") });
    if (!args.has("--dry-run") && !args.has("--no-backfill")) await backfillFamilies(client);
  } finally {
    client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
}
