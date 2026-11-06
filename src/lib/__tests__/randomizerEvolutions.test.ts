import { describe, it, expect } from "vitest";
import fs from "node:fs";

// The Universal Pokemon Randomizer ZX covers Gen 1-7, so every official Gen
// 5-7 pack carries the lists scripts/generate-randomizer-evolutions.mjs
// writes, and the Switch games (no ZX support) carry none - which hides the
// three switches in the Rules tab.
const packs = fs.readdirSync("data/games").map((id) => ({
  id,
  game: JSON.parse(fs.readFileSync(`data/games/${id}/game.json`, "utf-8")) as { generation: number; kind?: string },
  hasOverrides: fs.existsSync(`data/games/${id}/evolution-overrides.json`),
}));

describe("randomizer evolution lists", () => {
  it("every official Gen 5-7 game has one", () => {
    const missing = packs.filter(
      (p) => (p.game.kind ?? "official") === "official" && p.game.generation >= 5 && p.game.generation <= 7 && !p.id.startsWith("infinite-fusion") && !p.hasOverrides,
    );
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("no Gen 8/9 game has one", () => {
    expect(packs.filter((p) => p.game.generation >= 8 && p.hasOverrides).map((p) => p.id)).toEqual([]);
  });

  it("Black 2/White 2 change exactly what Black/White do", () => {
    const read = (id: string) => fs.readFileSync(`data/games/${id}/evolution-overrides.json`, "utf-8");
    expect(read("black-2-white-2")).toBe(read("black"));
  });
});
