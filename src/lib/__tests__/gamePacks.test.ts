import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  BUNDLE_FORMAT,
  SPRITE_SET_IDS,
  formatIssue,
  validateBundle,
  validatePackParts,
  type PackContext,
} from "@/lib/gamePack";

// Every pack in data/games/ must pass the same validator the in-app import
// uses. This file is what `npm run validate:packs` and the validate-packs
// GitHub Action run, so a contributed pack is checked on every pull request.
const root = process.cwd();
const gamesDir = path.join(root, "data", "games");
const read = (file: string) => JSON.parse(readFileSync(file, "utf-8"));

const pokemon = read(path.join(root, "data", "pokemon.json")) as { id: number; baseId?: number }[];
const ctx: PackContext = {
  maxDexId: Math.max(...pokemon.filter((p) => p.baseId === undefined).map((p) => p.id)),
  versionGroups: readdirSync(path.join(root, "data", "movesets")).map((f) => f.replace(/\.json$/, "")),
};

describe("game packs in data/games", () => {
  for (const id of readdirSync(gamesDir)) {
    it(`${id} is a valid pack`, () => {
      const dir = path.join(gamesDir, id);
      const overrides = path.join(dir, "evolution-overrides.json");
      const issues = validatePackParts(
        {
          game: read(path.join(dir, "game.json")),
          routes: read(path.join(dir, "routes.json")),
          levelcaps: read(path.join(dir, "levelcaps.json")),
          evolutionOverrides: existsSync(overrides) ? read(overrides) : undefined,
        },
        ctx,
      );
      const errors = issues.filter((issue) => issue.level === "error").map(formatIssue);
      expect(errors).toEqual([]);
      expect(read(path.join(dir, "game.json")).id).toBe(id);
    });
  }

  it("lists exactly the sprite sets download-sprites.mjs can fetch", () => {
    const script = readFileSync(path.join(root, "scripts", "download-sprites.mjs"), "utf-8");
    const block = script.slice(script.indexOf("const SPRITE_SETS = {"), script.indexOf("};", script.indexOf("const SPRITE_SETS = {")));
    const keys = [...block.matchAll(/^\s+"?([a-z-]+)"?: \{/gm)].map((m) => m[1]);
    expect([...keys].sort()).toEqual([...SPRITE_SET_IDS].sort());
  });
});

describe("validateBundle", () => {
  const good = () => ({
    format: BUNDLE_FORMAT,
    version: 1,
    game: {
      id: "custom-test-hack",
      sort: 100,
      kind: "romhack",
      generation: 3,
      dataGeneration: 9,
      dexLimit: 386,
      spriteSet: "emerald",
      versionGroup: "emerald",
      names: { de: "Test", en: "Test" },
    },
    routes: [
      { id: 1, names: { de: "Route 1", en: "Route 1" }, type: "route" },
      { id: 2, names: { de: "Geschenk", en: "Gift" }, type: "static" },
    ],
    levelcaps: [
      { id: 1, names: { de: "A", en: "A" }, location: { de: "X", en: "X" }, badge: null, max_level: 12 },
      { id: 2, names: { de: "B", en: "B" }, location: { de: "Top Vier", en: "Elite Four" }, badge: null, max_level: 60 },
    ],
  });
  const custom: PackContext = { ...ctx, custom: true, builtInIds: ["firered"] };

  it("accepts a well-formed custom pack", () => {
    expect(validateBundle(good(), custom).filter((i) => i.level === "error")).toEqual([]);
  });

  it("rejects what would break the app", () => {
    const bad = good();
    bad.game.id = "firered";
    bad.game.spriteSet = "gameboy";
    bad.routes[1].id = 1;
    (bad.routes[0].names as Record<string, string>).en = "";
    bad.levelcaps[0].max_level = 250;
    const messages = validateBundle(bad, custom).filter((i) => i.level === "error").map((i) => `${i.file}:${i.at}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        "game:id",
        "game:spriteSet",
        "routes:routes[1].id",
        "routes:routes[0].names.en",
        "levelcaps:levelcaps[0].max_level",
      ]),
    );
  });

  it("refuses a file that is not a pack at all", () => {
    expect(validateBundle({ runs: [] }, custom)[0].at).toBe("format");
  });

  it("keeps the custom- prefix for imports and out of the repository", () => {
    const repoPack = good();
    expect(validateBundle(repoPack, ctx).some((i) => i.at === "id" && i.level === "error")).toBe(true);
    repoPack.game.id = "test-hack";
    expect(validateBundle(repoPack, custom).some((i) => i.at === "id" && i.level === "error")).toBe(true);
  });
});

describe("npm run pack -- from-text", () => {
  it("turns the documented example list into a valid pack", () => {
    const out = execFileSync(process.execPath, ["scripts/pack-tool.mjs", "from-text", "docs/examples/game-pack-example.txt"], {
      cwd: root,
      encoding: "utf-8",
    });
    const pack = JSON.parse(out);
    const errors = validateBundle(pack, ctx).filter((issue) => issue.level === "error").map(formatIssue);
    expect(errors).toEqual([]);
    expect(pack.routes).toHaveLength(6);
    expect(pack.levelcaps[1]).toMatchObject({ names: { en: "Brock", de: "Rocko" }, max_level: 14 });
    expect(pack.levelcaps[0].badge).toBeNull();
  });

  it("round-trips a repository pack through bundle", () => {
    const out = execFileSync(process.execPath, ["scripts/pack-tool.mjs", "bundle", "data/games/firered"], { cwd: root, encoding: "utf-8" });
    expect(validateBundle(JSON.parse(out), ctx).filter((issue) => issue.level === "error")).toEqual([]);
  });
});
