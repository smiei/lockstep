import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { getEvolutionById, getEvolutions, getMoveset, getMoves, getPokemonById, type GameInfo, type Pokemon } from "@/lib/data";
import { getCatchRatesForGame, getPokemonFormsForGame, getPokemonListForGame, isInDex } from "@/lib/gameData";
import { formatEvolutionMethod } from "@/lib/evolutionMethods";
import { LANGS } from "@/lib/i18n/dictionary";
import { getPokemonSpriteUrls, placeholderSpriteBase } from "@/lib/sprites";

// The data extension for ROM hacks on modern data (Radical Red & co.): the
// dex up to Gen 9, Gen 6+ formes gated by `since`, regional forms with their
// own evolutions, and the synthetic "modern" version group.
const readGame = (id: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "games", id, "game.json"), "utf-8")) as GameInfo;
const pokemon = JSON.parse(readFileSync(path.join(process.cwd(), "data", "pokemon.json"), "utf-8")) as Pokemon[];
const byId = new Map(pokemon.map((p) => [p.id, p]));

const fireRed = readGame("firered");
const radicalRed = readGame("radical-red");
const inclementEmerald = readGame("inclement-emerald");
const infiniteFusion = readGame("infinite-fusion-classic");

describe("pokemon.json", () => {
  it("covers national dex 1-1025 without gaps", () => {
    const species = pokemon.filter((p) => p.baseId === undefined).map((p) => p.id);
    expect(species).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1));
  });

  it("marks every Gen 6+ forme with its generation, and regional forms as such", () => {
    const modern = pokemon.filter((p) => p.since !== undefined);
    expect(modern.length).toBeGreaterThan(50);
    for (const form of modern) {
      expect(form.baseId).toBeDefined();
      expect(form.since).toBeGreaterThanOrEqual(6);
      expect(form.since).toBeLessThanOrEqual(9);
    }
    expect(byId.get(10103)).toMatchObject({ baseId: 37, since: 7, regional: true, types: ["ice"] });
    expect(byId.get(10152)?.regional).toBeUndefined(); // Lycanroc Dusk: a forme, not a regional form
  });

  it("labels every forme in all five languages (LABEL_FIXES in generate-forms.mjs)", () => {
    for (const p of pokemon.filter((entry) => entry.formNames)) {
      for (const lang of LANGS) expect(p.formNames![lang], `${p.id} ${lang}`).toBeTruthy();
    }
    expect(byId.get(10253)?.formNames?.de).toBe("Paldea-Form");
  });
});

describe("Gen 6+ formes per pack", () => {
  it("never reach an older game", () => {
    expect(getPokemonFormsForGame(fireRed).some((p) => p.since !== undefined)).toBe(false);
    expect(getPokemonListForGame(fireRed).some((p) => p.baseId !== undefined)).toBe(false);
  });

  it("follow the pack's data generation", () => {
    const ids = getPokemonFormsForGame(inclementEmerald).map((p) => p.id);
    expect(ids).toContain(10103); // Alolan Vulpix, Gen 7
    expect(ids).not.toContain(10161); // Galarian Meowth, Gen 8
  });

  it("leave the Infinite Fusion allowlist as it was", () => {
    expect(getPokemonFormsForGame(infiniteFusion).some((p) => p.since !== undefined)).toBe(false);
  });

  it("make regional forms catchable where the pack says so", () => {
    expect(radicalRed.regionalForms).toBe(true);
    const list = getPokemonListForGame(radicalRed);
    expect(list.some((p) => p.id === 10103)).toBe(true);
    expect(list.some((p) => p.id === 10152)).toBe(false); // not regional: switch into it
  });

  it("count as in the dex only where the pack offers them", () => {
    expect(isInDex(radicalRed, 10104)).toBe(true);
    expect(isInDex(fireRed, 10104)).toBe(false);
    expect(isInDex(radicalRed, 1025)).toBe(true);
  });
});

describe("form-evolutions.json", () => {
  const edges = (
    JSON.parse(readFileSync(path.join(process.cwd(), "data", "form-evolutions.json"), "utf-8")) as {
      edges: { from: number; to: number }[];
    }
  ).edges;

  it("links existing Pokémon of one family", () => {
    for (const edge of edges) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      expect(from, `${edge.from}`).toBeDefined();
      expect(to, `${edge.to}`).toBeDefined();
      expect(to!.family_id, `${edge.from} -> ${edge.to}`).toBe(from!.family_id);
    }
  });

  it("adds regional evolutions beside the species' own", () => {
    expect(getEvolutionById(10103)?.evolvesTo).toEqual([10104]);
    expect(getEvolutionById(10104)?.evolvesFrom).toBe(10103);
    expect(getEvolutionById(25)?.evolvesTo).toEqual([26, 10100]);
  });

  it("moves a regional-only evolution off the species", () => {
    expect(getEvolutionById(52)?.evolvesTo).toEqual([53]);
    expect(getEvolutionById(863)?.evolvesFrom).toBe(10161);
    expect(getEvolutionById(122)?.evolvesTo).toEqual([]);
    expect(getEvolutionById(866)?.evolvesFrom).toBe(10168);
  });
});

describe("evolution labels", () => {
  it("name every item, move and place in every language", () => {
    for (const entry of getEvolutions()) {
      const method = entry.method;
      if (!method) continue;
      const slug =
        "item" in method && method.item ? method.item : "move" in method ? method.move : "location" in method ? method.location : null;
      if (!slug) continue;
      for (const lang of LANGS) {
        expect(formatEvolutionMethod(method, lang), `${entry.id} ${lang}`).not.toContain(slug);
      }
    }
  });
});

describe("fakemon.json (a ROM hack's own Pokémon)", () => {
  const fakemon = (
    JSON.parse(readFileSync(path.join(process.cwd(), "data", "fakemon.json"), "utf-8")) as {
      fakemon: (Pokemon & { pack: string; alias: string; catchRate: number; evolvesTo?: number[] })[];
    }
  ).fakemon;
  const blazingEmerald = readGame("blazing-emerald");

  it("has unique ids from 20001 on, each in an existing pack", () => {
    const ids = fakemon.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of fakemon) {
      expect(f.id).toBeGreaterThanOrEqual(20001);
      expect(readGame(f.pack).id).toBe(f.pack);
      if (f.baseId !== undefined) expect(byId.get(f.baseId), f.alias).toBeDefined();
      for (const to of f.evolvesTo ?? []) expect(fakemon.some((t) => t.id === to) || byId.has(to), `${f.alias} -> ${to}`).toBe(true);
    }
  });

  it("leaves battle states out", () => {
    expect(fakemon.some((f) => /-mega|-school$/.test(f.alias))).toBe(false);
  });

  it("belong only to their pack", () => {
    const sevii = fakemon.find((f) => f.alias === "doduo-sevii")!;
    expect(sevii).toMatchObject({ baseId: 84, regional: true });
    expect(getPokemonListForGame(radicalRed).some((p) => p.id === sevii.id)).toBe(true);
    expect(getPokemonFormsForGame(radicalRed).some((p) => p.id === sevii.id)).toBe(true);
    expect(getPokemonListForGame(blazingEmerald).some((p) => p.id === sevii.id)).toBe(false);
    expect(isInDex(radicalRed, sevii.id)).toBe(true);
    expect(isInDex(blazingEmerald, sevii.id)).toBe(false);
    expect(getPokemonListForGame(fireRed).some((p) => p.id >= 20001)).toBe(false);
  });

  it("resolve by id, evolve within their line and get a catch rate", () => {
    const oreon = fakemon.find((f) => f.alias === "oreon")!;
    expect(getPokemonById(oreon.id)?.family_id).toBe(133);
    const venonat = fakemon.find((f) => f.alias === "venonat-hoenn")!;
    expect(getEvolutionById(venonat.id)?.evolvesTo).toEqual(venonat.evolvesTo);
    expect(getEvolutionById(venonat.evolvesTo![0])?.evolvesFrom).toBe(venonat.id);
    expect(getCatchRatesForGame(blazingEmerald).find((r) => r.id === oreon.id)?.catch_rate).toBe(oreon.catchRate);
  });

  it("borrow their species' sprite as a placeholder; new species have none", () => {
    const sevii = fakemon.find((f) => f.alias === "doduo-sevii")!;
    expect(placeholderSpriteBase(sevii.id)).toBe(84);
    expect(getPokemonSpriteUrls(sevii.id, "emerald")).toEqual(getPokemonSpriteUrls(84, "emerald"));
    const oreon = fakemon.find((f) => f.alias === "oreon")!;
    expect(placeholderSpriteBase(oreon.id)).toBeNull();
    expect(getPokemonSpriteUrls(oreon.id, "emerald")).toEqual([]);
    expect(placeholderSpriteBase(84)).toBeNull();
  });
});

describe("modern version group", () => {
  it("has level-up moves for every species, all of them in moves.json", () => {
    const moveset = getMoveset("modern");
    const moves = getMoves();
    for (let id = 1; id <= 1025; id++) {
      expect(moveset[id]?.length, `#${id}`).toBeGreaterThan(0);
      for (const [, slug] of moveset[id]) expect(moves[slug], `#${id} ${slug}`).toBeDefined();
    }
  });
});
