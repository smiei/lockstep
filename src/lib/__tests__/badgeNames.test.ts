import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PACK_REGIONS } from "../../../scripts/place-name-parts.mjs";

// Every official pack's badges carry the official names in all five
// languages (data/shared/badge-names.json, from PokéWiki). Until 2026-11-09
// the older packs had German names translated from English ("Mineralorden"
// for Jasmine's Stahlorden). Fix with: node scripts/apply-badge-names.mjs
type Names = Record<string, string>;
const root = process.cwd();
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const table = read(path.join(root, "data", "shared", "badge-names.json")).regions as Record<string, Record<string, Names>>;
const regions = PACK_REGIONS as Record<string, string[]>;

describe("badge names", () => {
  it("official packs use PokéWiki's names in every language", () => {
    const wrong: string[] = [];
    for (const pack of Object.keys(regions)) {
      const file = path.join(root, "data", "games", pack, "levelcaps.json");
      if (!fs.existsSync(file)) continue;
      for (const cap of read(file) as { names: Names; badge: Names | null }[]) {
        if (!cap.badge) continue;
        const candidates = regions[pack]
          .flatMap((region) => Object.values(table[region] ?? {}))
          .filter((names) => names.en === cap.badge!.en);
        const ok = candidates.some((names) => Object.entries(names).every(([lang, name]) => cap.badge![lang] === name));
        if (!ok) wrong.push(`${pack}: ${cap.names.en} ${JSON.stringify(cap.badge)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("knows Jasmine's badge as the Stahlorden", () => {
    expect(table.johto.Jasmine).toMatchObject({ de: "Stahlorden", en: "Mineral Badge" });
  });
});
