import { afterEach, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_MIGRATIONS_DIR,
  TRACKING_TABLE,
  backfillFamilies,
  listMigrations,
  migrate,
  planMigrations,
  type Migration,
} from "../../../scripts/migrate-turso.mjs";

// Unlike the rest of src/lib's tests this one touches the disk: a migration
// that only reads well is worth nothing, and the failure it guards against
// (a table-redefine migration cascade-deleting a populated database) can only
// be seen on a real one. Every database here is a throwaway in-memory one -
// a file per test made this suite ten times slower on Windows.

const tempDirs: string[] = [];
const clients: Client[] = [];

function openDatabase(): { client: Client; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nuzlocke-migrate-"));
  tempDirs.push(dir);
  const client = createClient({ url: ":memory:" });
  clients.push(client);
  return { client, dir };
}

// A migrations directory holding only the migrations older than `before` -
// the state of a database that has not seen that migration yet.
function migrationsBefore(before: string, into: string): string {
  const target = path.join(into, "older");
  fs.mkdirSync(target);
  for (const name of fs.readdirSync(DEFAULT_MIGRATIONS_DIR)) {
    const source = path.join(DEFAULT_MIGRATIONS_DIR, name);
    if (fs.statSync(source).isDirectory() && name < before) fs.cpSync(source, path.join(target, name), { recursive: true });
  }
  return target;
}

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const dir of tempDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Windows can hold the file a moment longer; the OS temp dir is cleaned up eventually.
    }
  }
});

const quiet = () => {};
const count = async (client: Client, table: string) =>
  Number((await client.execute(`SELECT count(*) AS n FROM "${table}"`)).rows[0].n);

describe("migrate", () => {
  it("applies every migration to an empty database, once", async () => {
    const { client } = openDatabase();
    const all = await listMigrations();

    const first = await migrate(client, { log: quiet });
    expect(first.applied).toEqual(all.map((m) => m.name));
    expect(await count(client, TRACKING_TABLE)).toBe(all.length);

    const columns = (await client.execute(`PRAGMA table_info("Run")`)).rows.map((r) => r.name);
    expect(columns).toEqual(expect.arrayContaining(["accessKey", "version", "playerCount", "changedAt"]));

    const again = await migrate(client, { log: quiet });
    expect(again.applied).toEqual([]);
  });

  it("changes nothing on a dry run", async () => {
    const { client } = openDatabase();
    await migrate(client, { dryRun: true, log: quiet });
    const tables = (await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table'`)).rows.map((r) => r.name);
    expect(tables).not.toContain("Run");
  });

  it("keeps every child row when a later migration redefines Run", async () => {
    // libSQL enforces foreign keys by default, and the accessKey migration
    // rebuilds Run. Run as a plain script (with its own foreign_keys=OFF) the
    // rebuild is harmless; inside a transaction it would cascade-delete
    // everything below.
    const { client, dir } = openDatabase();
    expect(Number((await client.execute("PRAGMA foreign_keys")).rows[0].foreign_keys)).toBe(1);

    const older = migrationsBefore("20260916173148_add_run_access_key", dir);
    await migrate(client, { dir: older, log: quiet });
    await client.executeMultiple(`
      INSERT INTO "Run" ("id", "name") VALUES (101, 'kept run'), (102, 'other run');
      INSERT INTO "SoulLink" ("id", "runId", "routeId", "updatedAt") VALUES (10, 101, 3, 0), (11, 102, 3, 0);
      INSERT INTO "Encounter" ("id", "runId", "routeId", "player", "pokemonId", "currentPokemonId", "familyId", "updatedAt", "soulLinkId")
        VALUES (20, 101, 3, 'PLAYER1', 1, 1, 1, 0, 10), (21, 101, 3, 'PLAYER2', 4, 4, 4, 0, 10), (22, 102, 3, 'PLAYER1', 7, 7, 7, 0, 11);
      INSERT INTO "LevelCapProgress" ("id", "runId", "levelCapId", "updatedAt") VALUES (30, 101, 14, 0);
      INSERT INTO "CustomRoute" ("id", "runId", "routeId", "name") VALUES (40, 101, -1, 'custom');
      INSERT INTO "RouteEntry" ("id", "runId", "routeId") VALUES (50, 101, 3);
    `);

    await migrate(client, { log: quiet });

    // The run 1 an early migration seeds is removed again by
    // add_run_changed_at, since nobody touched it.
    for (const [table, expected] of [
      ["Run", 2],
      ["SoulLink", 2],
      ["Encounter", 3],
      ["LevelCapProgress", 1],
      ["CustomRoute", 1],
      ["RouteEntry", 1],
    ] as const) {
      expect(await count(client, table), table).toBe(expected);
    }
    const keys = (await client.execute(`SELECT "accessKey" FROM "Run"`)).rows.map((r) => String(r.accessKey));
    expect(new Set(keys).size).toBe(2);
    expect(keys.every((key) => key.length >= 16)).toBe(true);
    // The rebuilt table is still the parent of the children: deleting a run still cascades.
    await client.execute(`DELETE FROM "Run" WHERE "id" = 102`);
    expect(await count(client, "Encounter")).toBe(2);
  });

  it("refuses a database that has tables but no migration history", async () => {
    const { client } = openDatabase();
    await client.execute(`CREATE TABLE "Run" ("id" INTEGER PRIMARY KEY)`);
    await expect(migrate(client, { log: quiet })).rejects.toThrow(/no migration history/);
  });

  it("does not record a migration that failed", async () => {
    const { client, dir } = openDatabase();
    const broken = path.join(dir, "broken");
    fs.mkdirSync(path.join(broken, "20200101000000_broken"), { recursive: true });
    fs.writeFileSync(path.join(broken, "20200101000000_broken", "migration.sql"), "CREATE TABLE a (id INTEGER);\nNOT SQL;");
    await expect(migrate(client, { dir: broken, log: quiet })).rejects.toThrow(/NOT recorded/);
    expect(await count(client, TRACKING_TABLE)).toBe(0);
  });
});

describe("planMigrations", () => {
  const m = (name: string, checksum = name): Migration => ({ name, sql: "", checksum });

  it("lists what has not been applied", () => {
    const plan = planMigrations([m("1"), m("2"), m("3")], new Map([["1", "1"]]));
    expect(plan.pending.map((x) => x.name)).toEqual(["2", "3"]);
    expect(plan.errors).toEqual([]);
  });

  it("refuses a migration edited after it was applied", () => {
    const plan = planMigrations([m("1", "new")], new Map([["1", "old"]]));
    expect(plan.errors[0]).toMatch(/edited after it was applied/);
  });

  it("refuses history that was rewritten", () => {
    expect(planMigrations([m("1")], new Map([["0", "0"]])).errors[0]).toMatch(/no longer exists/);
    expect(planMigrations([m("1"), m("2")], new Map([["2", "2"]])).errors[0]).toMatch(/later migration is already applied/);
  });
});

describe("backfillFamilies", () => {
  it("corrects a stale familyId and leaves the rest alone", async () => {
    const { client } = openDatabase();
    await migrate(client, { log: quiet });
    const pokemon = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/pokemon.json"), "utf-8"));
    const bulbasaur = pokemon.find((p: { id: number }) => p.id === 1);
    await client.executeMultiple(`
      INSERT INTO "Run" ("id", "name", "accessKey") VALUES (101, 'r', 'kkkkkkkkkkkkkkkk');
      INSERT INTO "Encounter" ("id", "runId", "routeId", "player", "pokemonId", "currentPokemonId", "familyId", "updatedAt")
        VALUES (1, 101, 3, 'PLAYER1', 1, 1, 9999, 0), (2, 101, 5, 'PLAYER1', 1, 1, ${bulbasaur.family_id}, 0);
    `);
    expect(await backfillFamilies(client, quiet)).toBe(1);
    const families = (await client.execute(`SELECT "familyId" FROM "Encounter" ORDER BY "id"`)).rows.map((r) => Number(r.familyId));
    expect(families).toEqual([bulbasaur.family_id, bulbasaur.family_id]);
    expect(await backfillFamilies(client, quiet)).toBe(0);
  });
});
