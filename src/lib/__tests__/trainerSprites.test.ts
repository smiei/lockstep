import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { slugify } from "@/lib/slug";

const GAMES_DIR = path.join(process.cwd(), "data", "games");
const sources = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "trainer-sprite-sources.json"), "utf-8")) as {
  source: string;
  map: Record<string, string>;
  unmapped: Record<string, string>;
};

// Every `<trainerSet>/<slug>` the level-cap screen can ask for - the same pair
// LevelCapsView/TrainerSprite build from the game pack.
function wantedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const dir of fs.readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const game = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, dir.name, "game.json"), "utf-8"));
    const caps = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, dir.name, "levelcaps.json"), "utf-8"));
    const set = game.trainerSet ?? dir.name;
    for (const cap of caps) keys.add(`${set}/${slugify(cap.sprite ?? cap.names.de)}`);
  }
  return keys;
}

describe("data/trainer-sprite-sources.json", () => {
  const wanted = wantedKeys();

  it("only names trainers the level-cap screen can ask for", () => {
    // The generator carries its own copy of slugify; a difference would show up
    // here as keys nothing looks up.
    const stray = Object.keys(sources.map).filter((key) => !wanted.has(key));
    expect(stray).toEqual([]);
  });

  it("covers every trainer, either mapped or knowingly left out", () => {
    // Fails after a level-cap change: rerun `npm run generate:trainer-sprites`.
    const unaccounted = [...wanted].filter((key) => !(key in sources.map) && !(key in sources.unmapped));
    expect(unaccounted).toEqual([]);
  });

  it("holds only plausible Showdown file names", () => {
    for (const name of Object.values(sources.map)) expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)?$/);
  });
});

// IS_PUBLIC_INSTANCE is read when src/lib/instance.ts is first imported, so each
// case sets the environment and loads a fresh copy of the module.
async function loadSprites(publicInstance: boolean) {
  vi.resetModules();
  if (publicInstance) vi.stubEnv("NEXT_PUBLIC_INSTANCE_MODE", "public");
  return import("@/lib/sprites");
}

afterEach(() => vi.unstubAllEnvs());

describe("getTrainerSpriteUrl", () => {
  const [key, name] = Object.entries(sources.map)[0];
  const [trainerSet, slug] = key.split("/");

  it("never offers a picture on a private instance, which shows the user's own files", async () => {
    const { getTrainerSpriteUrl } = await loadSprites(false);
    expect(getTrainerSpriteUrl(trainerSet, slug)).toBeNull();
  });

  it("points a public instance at Showdown's sprite for a mapped trainer", async () => {
    const { getTrainerSpriteUrl } = await loadSprites(true);
    expect(getTrainerSpriteUrl(trainerSet, slug)).toBe(`${sources.source}/${name}.png`);
  });

  it("returns null for a trainer without one, and without a trainer set", async () => {
    const { getTrainerSpriteUrl } = await loadSprites(true);
    expect(getTrainerSpriteUrl(trainerSet, "no-such-trainer")).toBeNull();
    expect(getTrainerSpriteUrl(undefined, slug)).toBeNull();
  });
});
