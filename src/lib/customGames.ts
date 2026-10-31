// Game packs a user imported in the app (New Run -> Import your own game).
// They are stored as ordinary pack folders - the same four files as
// data/games/<id>/ - in a `custom-games` folder NEXT TO THE DATABASE, so they
// live in the same volume as the runs that use them and survive image
// updates, while data.ts reads them exactly like a built-in pack. Ids always
// start with CUSTOM_PACK_PREFIX, so they can never shadow a built-in pack.
//
// Server-only (fs). A host without a SQLite file (the public instance on
// Turso) has no such folder: customGamesDir() is null and importing is off.
import fs from "node:fs";
import path from "node:path";
import { BUNDLE_FORMAT, isCustomPackId, type GamePackBundle } from "@/lib/gamePack";

const FILES = {
  game: "game.json",
  routes: "routes.json",
  levelcaps: "levelcaps.json",
  evolutionOverrides: "evolution-overrides.json",
} as const;

// CUSTOM_GAMES_DIR wins; otherwise `custom-games` beside the SQLite file of
// DATABASE_URL (a relative `file:./dev.db` is relative to prisma/, where the
// schema lives - Prisma resolves it the same way).
export function customGamesDir(): string | null {
  if (process.env.CUSTOM_GAMES_DIR) return path.resolve(process.env.CUSTOM_GAMES_DIR);
  const url = process.env.DATABASE_URL;
  if (process.env.TURSO_DATABASE_URL || !url?.startsWith("file:")) return null;
  const file = url.slice("file:".length).split("?")[0];
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), "prisma", file);
  return path.join(path.dirname(absolute), "custom-games");
}

// The folder of one custom pack, or null when the id is not a custom id or
// there is no custom folder on this host. Guards against path tricks: a
// custom id is lowercase letters, digits and dashes only (the validator
// enforces it on import), so anything else is refused here too.
export function customGameDir(gameId: string): string | null {
  const root = customGamesDir();
  if (!root || !isCustomPackId(gameId) || !/^[a-z0-9-]+$/.test(gameId)) return null;
  return path.join(root, gameId);
}

export function listCustomGameIds(): string[] {
  const root = customGamesDir();
  if (!root || !fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isCustomPackId(entry.name) && fs.existsSync(path.join(root, entry.name, FILES.game)))
    .map((entry) => entry.name);
}

// Writes a validated bundle as a pack folder, replacing an older version of
// the same id. Files are written next to the target first and then renamed,
// so a reader never sees half a pack.
export function writeCustomGame(bundle: GamePackBundle): string {
  const id = bundle.game.id as string;
  const dir = customGameDir(id);
  if (!dir) throw new Error(`not a custom game id: ${id}`);
  fs.mkdirSync(dir, { recursive: true });
  const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
  const parts: [string, unknown][] = [
    [FILES.game, bundle.game],
    [FILES.routes, bundle.routes],
    [FILES.levelcaps, bundle.levelcaps],
  ];
  if (bundle.evolutionOverrides?.length) parts.push([FILES.evolutionOverrides, bundle.evolutionOverrides]);
  else fs.rmSync(path.join(dir, FILES.evolutionOverrides), { force: true });
  for (const [name, value] of parts) {
    const target = path.join(dir, name);
    fs.writeFileSync(target + ".tmp", json(value));
    fs.renameSync(target + ".tmp", target);
  }
  return id;
}

export function removeCustomGame(gameId: string): boolean {
  const dir = customGameDir(gameId);
  if (!dir || !fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

// The pack as one bundle, for backups of runs that play it.
export function readCustomGameBundle(gameId: string): GamePackBundle | null {
  const dir = customGameDir(gameId);
  if (!dir || !fs.existsSync(path.join(dir, FILES.game))) return null;
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf-8"));
  const overrides = path.join(dir, FILES.evolutionOverrides);
  return {
    format: BUNDLE_FORMAT,
    version: 1,
    game: read(FILES.game),
    routes: read(FILES.routes),
    levelcaps: read(FILES.levelcaps),
    ...(fs.existsSync(overrides) ? { evolutionOverrides: read(FILES.evolutionOverrides) } : {}),
  };
}
