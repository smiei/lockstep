import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

// Place names per pack kind (5.3):
// - official games carry the official name in every language
//   (scripts/localize-places.mjs, from PokéWiki) - a re-import with
//   import-nuzlocke-app.mjs that skips localize-places would put English back;
// - ROM hacks exist in English only, so their places, bosses and badges are
//   English in every language, as the player reads them in the game.

type Names = Record<"de" | "en" | "fr" | "es" | "it", string>;
const root = process.cwd();
const LANGS = ["de", "fr", "es", "it"] as const;

const packs = readdirSync(path.join(root, "data", "games"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const dir = path.join(root, "data", "games", entry.name);
    const read = <T,>(file: string, fallback: T): T => {
      try {
        return JSON.parse(readFileSync(path.join(dir, file), "utf-8")) as T;
      } catch {
        return fallback;
      }
    };
    return {
      id: entry.name,
      game: read<{ kind?: string }>("game.json", {}),
      routes: read<{ names: Names }[]>("routes.json", []),
      caps: read<{ names: Names; location: Names; badge: Names | null }[]>("levelcaps.json", []),
    };
  });

const official = packs.filter((p) => (p.game.kind ?? "official") === "official" && !p.id.startsWith("infinite-fusion"));
const hacks = packs.filter((p) => p.game.kind === "romhack");

describe("place names", () => {
  it("official games name every place in all five languages", () => {
    const englishOnly: string[] = [];
    for (const pack of official) {
      for (const names of [...pack.routes.map((r) => r.names), ...pack.caps.map((c) => c.location)]) {
        if (LANGS.every((lang) => names[lang] === names.en)) englishOnly.push(`${pack.id}: ${names.en}`);
        for (const lang of LANGS) expect(names[lang], `${pack.id}: ${names.en} (${lang})`).toBeTruthy();
      }
    }
    expect(englishOnly).toEqual([]);
  });

  it("ROM hacks keep the English names of places, bosses and badges in every language", () => {
    expect(hacks.length).toBeGreaterThan(0);
    for (const pack of hacks) {
      const all = [
        ...pack.routes.map((r) => r.names),
        ...pack.caps.flatMap((c) => [c.names, c.location, ...(c.badge ? [c.badge] : [])]),
      ];
      for (const names of all) {
        for (const lang of LANGS) expect(names[lang], `${pack.id}: ${names.en} (${lang})`).toBe(names.en);
      }
    }
  });
});
