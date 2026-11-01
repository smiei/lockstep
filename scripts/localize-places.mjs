// Gives every official pack's routes and boss places their official names in
// German, French, Spanish and Italian, from data/shared/place-names.json
// (generate-place-names.mjs) and, for labels that are not one place, the
// hand-made data/shared/place-name-overrides.json. English stays as the pack
// has it. Run it after scripts/import-nuzlocke-app.mjs, which writes the
// official packs with the older PokeAPI names.
//
//   "Union Cave (Lapras)"    -> place from the table + the Pokémon's own name
//   "Eevee Celadon City"     -> "Evoli Prismania City"
//   "Route 29"               -> the table's route page, else Route/Ruta/Percorso
// The report (default scratch/place-names-report.md, or the path given) lists
// every change and every name nothing was found for - read it before
// committing: a changed name in a pack someone curated by hand is a decision.
// Run: node scripts/localize-places.mjs [report.md]   (no network)
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PACK_REGIONS, splitPlace } from "./place-name-parts.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["de", "fr", "es", "it"];
const REPORT = process.argv[2] ?? path.join(root, "scratch", "place-names-report.md");
const readJson = async (file) => JSON.parse(await readFile(file, "utf-8"));

// PokéWiki's game abbreviations per pack, to pick a name that changed between games.
const PACK_GAMES = {
  "red-blue": ["R", "B", "Ge", "G"],
  "gold-silver": ["Go", "Si", "K"],
  firered: ["FR", "BG"],
  ruby: ["RU", "Ru", "SA", "Sa"],
  sapphire: ["RU", "Ru", "SA", "Sa"],
  emerald: ["SM", "Sm"],
  "diamond-pearl": ["D", "P"],
  platinum: ["PT"],
  heartgold: ["HG", "SS"],
  soulsilver: ["HG", "SS"],
  black: ["S", "W"],
  white: ["S", "W"],
  "black-2-white-2": ["S2", "W2"],
  "x-y": ["X", "Y"],
  "omega-ruby": ["OR", "AS"],
  "alpha-sapphire": ["OR", "AS"],
  sun: ["So", "Mo"],
  moon: ["So", "Mo"],
  "ultra-sun": ["US", "UM"],
  "ultra-moon": ["US", "UM"],
  sword: ["SW", "SH"],
  shield: ["SW", "SH"],
  "brilliant-diamond-shining-pearl": ["SD", "LP"],
  "scarlet-violet": ["Ka", "Pu"],
};

// The packs' own words around a place (not in any wiki).
const GLOSSARY = {
  Starter: { de: "Starter", fr: "Starter", es: "Inicial", it: "Starter" },
  Roaming: { de: "umherstreifend", fr: "errant", es: "errante", it: "errante" },
  roaming: { de: "umherstreifend", fr: "errant", es: "errante", it: "errante" },
  Fossil: { de: "Fossil", fr: "Fossile", es: "Fósil", it: "Fossile" },
  Salesman: { de: "Händler", fr: "Vendeur", es: "Vendedor", it: "Venditore" },
  Egg: { de: "Ei", fr: "Œuf", es: "Huevo", it: "Uovo" },
  // A group, not a place - the same names the packs' boss lists use.
  "Elite Four": { de: "Top Vier", fr: "Conseil 4", es: "Alto Mando", it: "Superquattro" },
};
const EGG = { de: (p) => `${p}-Ei`, fr: (p) => `Œuf ${p}`, es: (p) => `Huevo de ${p}`, it: (p) => `Uovo di ${p}` };
const REGION_STARTER = {
  de: (r) => `${r}-Starter`,
  fr: (r) => `Starter de ${r}`,
  es: (r) => `Inicial de ${r}`,
  it: (r) => `Starter di ${r}`,
};
const RED = { de: (p) => `Rotes ${p}`, fr: (p) => `${p} rouge`, es: (p) => `${p} rojo`, it: (p) => `${p} rosso` };
const ROUTE = { de: "Route", fr: "Route", es: "Ruta", it: "Percorso" };

// Keyed loosely: PokéWiki writes "Diglett's cave" and "Diglett’s Tunnel".
const looseKey = (name) => name.toLowerCase().replace(/[’`´]/g, "'");
// Labels that are not one place ("Totem Trial", "Driftveil Tournament Round 1"),
// put together by hand from official names: data/shared/place-name-overrides.json.
const overrides = (await readJson(path.join(root, "data", "shared", "place-name-overrides.json"))).entries;
const placeTable = {};
for (const [english, pages] of Object.entries((await readJson(path.join(root, "data", "shared", "place-names.json"))).places)) {
  (placeTable[looseKey(english)] ??= []).push(...pages);
}
const pokemon = new Map(
  (await readJson(path.join(root, "data", "pokemon.json"))).filter((p) => p.baseId === undefined).map((p) => [p.names.en, p.names]),
);

// The name this pack's game uses: one marked for its games, else one marked
// for its generation, else the unmarked one. The capitals the Gen 1-3 games
// print (ALABASTIA) are their typeface, not the name, and are skipped.
function pickVariant(list, games, generation) {
  const named = (list ?? []).filter((v) => v.name !== v.name.toUpperCase() || list.length === 1);
  if (!named.length) return null;
  return (
    named.find((v) => v.games?.some((g) => games.includes(g))) ??
    named.find((v) => v.gens?.includes(generation)) ??
    named.find((v) => !v.games && !v.gens) ??
    named[0]
  ).name;
}
let packGeneration = 0;

// The packs' (nuzlocke.app's) name -> PokéWiki's English name, where they
// differ: a shortened name or a typo in the source.
const ALIASES = {
  "Rocket Hideout": "Team Rocket Hideout",
  "Galactic HQ": "Team Galactic HQ",
  "Eterna Building": "Team Galactic Eterna Building",
  "Magma Hideout": "Team Magma Hideout",
  "Aqua Hideout": "Team Aqua Hideout",
  "Thrifty Megamart": "Thrifty Megamart - Abandoned Site",
  "Alola Berry Fields": "Berry Fields",
  Megalopolis: "Ultra Megalopolis",
  "Fuschia City": "Fuchsia City",
  "Valley Windoworks": "Valley Windworks",
  "Hau'oli Cemetry": "Hau'oli Cemetery",
  "Frigrid Sea": "Frigid Sea",
  "Hammerlock Gym": "Hammerlocke Stadium",
  "Glaseado City": "Glaseado Mountain",
  "Still-Water Cave": "Still-Water Cavern",
};

// A place's names in this pack's region and games, or null. A page of the
// pack's region wins; else a page without a region; else the only page there is.
function lookupPlace(english, pack) {
  const pages = placeTable[looseKey(ALIASES[english] ?? english)];
  if (!pages) return null;
  const regions = PACK_REGIONS[pack];
  const page =
    pages.find((p) => p.regions.some((r) => regions.includes(r))) ??
    pages.find((p) => !p.regions.length) ??
    (pages.length === 1 ? pages[0] : null);
  if (!page) return null;
  const out = {};
  for (const lang of LANGS) out[lang] = pickVariant(page[lang], PACK_GAMES[pack], packGeneration);
  return LANGS.every((l) => out[l]) ? out : null;
}

// A Pokémon, an egg, a region's starter or a glossary word -> its names.
function lookupWord(word, pack) {
  if (GLOSSARY[word]) return GLOSSARY[word];
  if (pokemon.has(word)) return pokemon.get(word);
  const egg = word.match(/^(.+) Egg$/);
  if (egg && pokemon.has(egg[1])) return Object.fromEntries(LANGS.map((l) => [l, EGG[l](pokemon.get(egg[1])[l])]));
  const red = word.match(/^Red (.+)$/);
  if (red && pokemon.has(red[1])) return Object.fromEntries(LANGS.map((l) => [l, RED[l](pokemon.get(red[1])[l])]));
  const starter = word.match(/^(\w+) Starter$/);
  if (starter) return Object.fromEntries(LANGS.map((l) => [l, REGION_STARTER[l](starter[1])]));
  if (word.includes("/")) {
    const parts = word.split("/").map((w) => lookupWord(w.trim(), pack));
    if (parts.every(Boolean)) return Object.fromEntries(LANGS.map((l) => [l, parts.map((p) => p[l]).join("/")]));
  }
  // Area One..Six of Paldea's provinces are part of the place there; elsewhere a
  // qualifier can itself be a place ("Fighting Dojo").
  return lookupPlace(word, pack);
}

// The pack's English name -> { de, fr, es, it } or { missing: what }.
function localize(english, pack) {
  const override = overrides[english];
  if (override) {
    const own = override.packs?.[pack] ?? {};
    return Object.fromEntries(LANGS.map((l) => [l, own[l] ?? override[l]]));
  }
  if (GLOSSARY[english]) return GLOSSARY[english];
  const whole = lookupPlace(english, pack) ?? lookupWord(english, pack);
  if (whole) return whole;
  // "Silph Co., Saffron City", "Volcarona, Relic Castle": each part on its own.
  const parts = english.split(/,\s+/);
  if (parts.length > 1) {
    const each = parts.map((part) => localize(part, pack));
    const missing = each.find((p) => p.missing);
    if (missing) return missing;
    return Object.fromEntries(LANGS.map((l) => [l, each.map((p) => p[l]).join(", ")]));
  }
  // Brilliant Diamond/Shining Pearl's "Underground: Rocky Cave".
  const underground = english.match(/^Underground: (.+)$/);
  if (underground) {
    const area = lookupPlace("Grand Underground", pack);
    const cave = lookupPlace(underground[1], pack);
    if (area && cave) return Object.fromEntries(LANGS.map((l) => [l, `${area[l]}: ${cave[l]}`]));
  }
  const { place, note, floor } = splitPlace(english);
  // A place, or a Pokémon or word standing for one ("Mesprit (Roaming)").
  let base = lookupWord(place, pack);
  let prefix = null;
  if (!base) {
    const route = place.match(/^Route (\d+)$/);
    if (route) base = Object.fromEntries(LANGS.map((l) => [l, `${ROUTE[l]} ${route[1]}`]));
  }
  if (!base) {
    // "Eevee Celadon City", "Fighting Dojo Saffron City", "Salesman Route 4"
    const words = place.split(" ");
    for (let cut = 1; cut < words.length && !base; cut++) {
      const rest = words.slice(cut).join(" ");
      const restNames = lookupPlace(rest, pack) ?? localizeRoute(rest);
      const lead = lookupWord(words.slice(0, cut).join(" "), pack);
      if (restNames && lead) {
        base = restNames;
        prefix = lead;
      }
    }
  }
  if (!base) return { missing: place };
  const noteNames = note ? lookupWord(note, pack) : null;
  if (note && !noteNames) return { missing: `(${note})` };
  const out = {};
  // Same order as the English name: "Evoli Prismania City", "Union Cave (Lapras)".
  for (const lang of LANGS) {
    out[lang] =
      `${prefix ? `${prefix[lang]} ` : ""}${base[lang]}${floor ? ` ${floor}` : ""}${noteNames ? ` (${noteNames[lang]})` : ""}`;
  }
  return out;
}

function localizeRoute(name) {
  const route = name.match(/^Route (\d+)$/);
  return route ? Object.fromEntries(LANGS.map((l) => [l, `${ROUTE[l]} ${route[1]}`])) : null;
}

const report = { changed: [], missing: [] };
for (const pack of Object.keys(PACK_REGIONS)) {
  const dir = path.join(root, "data", "games", pack);
  const game = await readJson(path.join(dir, "game.json"));
  packGeneration = game.generation;
  for (const [file, field] of [
    ["routes.json", "names"],
    ["levelcaps.json", "location"],
  ]) {
    let entries;
    try {
      entries = await readJson(path.join(dir, file));
    } catch {
      continue;
    }
    let changed = 0;
    for (const entry of entries) {
      const names = entry[field];
      const result = localize(names.en, pack);
      if (result.missing) {
        report.missing.push(`${pack}: "${names.en}" – ${result.missing}`);
        continue;
      }
      const diff = LANGS.filter((l) => names[l] !== result[l]);
      if (!diff.length) continue;
      const line = `${pack}: "${names.en}" – ${diff.map((l) => `${l}: ${names[l]} → ${result[l]}`).join("; ")}`;
      for (const l of LANGS) names[l] = result[l];
      changed++;
      report.changed.push(line);
    }
    if (changed) await writeFile(path.join(dir, file), JSON.stringify(entries, null, 2) + "\n");
  }
}

const section = (title, lines) => `## ${title} (${lines.length})\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`;
await writeFile(
  REPORT,
  [
    "# Place names report\n",
    section("Not found", report.missing),
    section("Written", report.changed),
  ].join("\n"),
);
console.log(`written ${report.changed.length}, not found ${report.missing.length} -> ${REPORT}`);
