import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

// data/cover-sources.json drives scripts/download-covers.mjs (and the public
// instance's hotlinks). Every official game has a cover; a ROM hack or fan game
// only where a source exists (else GameCover draws its tile). Only the two
// sources THIRD_PARTY_NOTICES.md names may appear.
const root = process.cwd();
const { covers } = JSON.parse(readFileSync(path.join(root, "data", "cover-sources.json"), "utf-8")) as {
  covers: Record<string, string>;
};
const packs = readdirSync(path.join(root, "data", "games"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => JSON.parse(readFileSync(path.join(root, "data", "games", entry.name, "game.json"), "utf-8")) as { id: string; kind?: string });

describe("cover sources", () => {
  it("name only existing packs", () => {
    const ids = new Set(packs.map((p) => p.id));
    expect(Object.keys(covers).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("cover every official game", () => {
    const official = packs.filter((p) => (p.kind ?? "official") === "official").map((p) => p.id);
    expect(official.filter((id) => !covers[id])).toEqual([]);
  });

  it("come from libretro-thumbnails or Wikipedia only", () => {
    for (const [id, url] of Object.entries(covers)) {
      expect(url, id).toMatch(
        /^https:\/\/(raw\.githubusercontent\.com\/libretro-thumbnails\/|upload\.wikimedia\.org\/wikipedia\/en\/)/,
      );
    }
  });
});
