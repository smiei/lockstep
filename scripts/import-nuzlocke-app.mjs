// Generates ROM-hack game packs from nuzlocke.app's generated data
// (github.com/Bassel-T/nuzlocke.app, a fork of domtronn/nuzlocke.app,
// BSD-3-Clause, "Copyright (c) 2021, Diego Ballesteros" - see
// THIRD_PARTY_NOTICES.md). Pinned to one commit so a rerun is reproducible.
//
//   node scripts/import-nuzlocke-app.mjs            # every hack in HACKS
//   node scripts/import-nuzlocke-app.mjs renegade-platinum
//
// Per hack it writes data/games/<id>/{game,routes,levelcaps}.json, a
// move-overrides.json when the hack changes moves, and
// data/shared/<id>-species.json (game.json speciesData) when it changes
// Pokémon stats or types. What it maps:
// - Routes in the source's play order. A route whose English name matches the
//   base game's pack takes that pack's names in all five languages and its
//   type/postgame flag; anything else is English everywhere.
// - Boss fights (the source's "gym" entries) become level caps; the cap is the
//   highest level in the boss's team (league.json). A boss that exists in the
//   base game takes its names, place, badge and trainer picture from there.
//   The first contiguous run of Elite Four entries is marked as the Elite
//   Four block (location.en "Elite Four").
// - patches.json: stats and types -> species data (merged onto this app's own
//   values, era-adjusted with pokemon-history for the pack's data generation);
//   move power/type/category -> move-overrides.json.
// Not in the source and therefore not generated: changed evolutions and catch
// rates. Every generated pack is "unverified".
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const SOURCE_REPO = "Bassel-T/nuzlocke.app";
const SOURCE_COMMIT = "2b4f2ec8e0bf4d7112a210b4ac922feedb49662e";
const RAW = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}/src/lib/data`;

// The highest national-dex number of each generation, capped at what
// pokemon.json carries.
const GEN_MAX_ID = { 1: 151, 2: 251, 3: 386, 4: 493, 5: 649, 6: 721, 7: 809, 8: 905, 9: 1025 };

// src: the source's game id; routes/league/patch default to it.
// base: our pack the hack is built on (names, places, badges, trainers).
const HACKS = [
  { id: "renegade-platinum", src: "renplat", base: "platinum", name: "Renegade Platinum", generation: 4, dataGeneration: 6, spriteSet: "platinum", versionGroup: "platinum", sort: 30 },
  { id: "sacred-gold", src: "sacredgold", league: "sssg", patch: "sssg", base: "heartgold", name: "Sacred Gold", generation: 4, dataGeneration: 4, spriteSet: "heartgold-soulsilver", versionGroup: "heartgold-soulsilver", sort: 31 },
  { id: "storm-silver", src: "stormsilv", league: "sssg", patch: "sssg", base: "soulsilver", name: "Storm Silver", generation: 4, dataGeneration: 4, spriteSet: "heartgold-soulsilver", versionGroup: "heartgold-soulsilver", sort: 32 },
  { id: "blaze-black", src: "blaze", league: "blazevolt", patch: "blazevolt", base: "black", name: "Blaze Black", generation: 5, dataGeneration: 5, spriteSet: "black-white", versionGroup: "black-white", sort: 33 },
  { id: "volt-white", src: "volt", league: "blazevolt", patch: "blazevolt", base: "white", name: "Volt White", generation: 5, dataGeneration: 5, spriteSet: "black-white", versionGroup: "black-white", sort: 34 },
  { id: "blaze-black-2-volt-white-2-redux", src: "blazevolt2", routes: "blazevolt2_n", league: "blazevolt2_n", patch: "blazevolt2", base: "black", name: "Blaze Black 2 / Volt White 2 Redux", generation: 5, dataGeneration: 6, spriteSet: "black-white", versionGroup: "black-white", sort: 35 },
  { id: "emerald-kaizo", src: "emkaizo", base: "emerald", name: "Emerald Kaizo", generation: 3, dataGeneration: 3, spriteSet: "emerald", versionGroup: "emerald", sort: 36 },
  { id: "inclement-emerald", src: "incem", base: "emerald", name: "Inclement Emerald", generation: 3, dataGeneration: 7, spriteSet: "emerald", versionGroup: "emerald", sort: 37 },
  { id: "rising-ruby", src: "rrss", base: "emerald", name: "Rising Ruby", generation: 3, dataGeneration: 6, spriteSet: "emerald", versionGroup: "emerald", sort: 38 },
  { id: "sinking-sapphire", src: "ssaph", league: "rrss", patch: "rrss", base: "emerald", name: "Sinking Sapphire", generation: 3, dataGeneration: 6, spriteSet: "emerald", versionGroup: "emerald", sort: 39 },
  { id: "glazed", src: "glazed", base: "emerald", name: "Glazed", generation: 3, dataGeneration: 6, spriteSet: "emerald", versionGroup: "emerald", sort: 40 },
  { id: "new-generations", src: "newgen", base: "firered", name: "New Generations", generation: 3, dataGeneration: 3, spriteSet: "emerald", versionGroup: "firered-leafgreen", sort: 41 },
];

const STAT_KEYS = { hp: "KP", atk: "Ang.", def: "Vert.", spa: "Sp.-A.", spd: "Sp.-V.", spe: "Init." };
const LANGS = ["de", "en", "fr", "es", "it"];

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[.'’:]/g, "")
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const key = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const allLangs = (text) => Object.fromEntries(LANGS.map((lang) => [lang, text]));
const readJson = async (file) => JSON.parse(await readFile(file, "utf-8"));

async function fetchJson(name) {
  const res = await fetch(`${RAW}/${name}.json`);
  if (!res.ok) throw new Error(`${name}.json: HTTP ${res.status}`);
  return res.json();
}

// Inclement Emerald scales trainers to the player ("-3", "+0"): a relative
// level is no fixed cap, so such a fight gets none (null).
function highestLevel(boss) {
  const levels = (boss?.pokemon ?? [])
    .map((p) => String(p.level).trim())
    .filter((level) => /^\d+$/.test(level))
    .map((level) => parseInt(level, 10));
  return levels.length ? Math.min(100, Math.max(...levels)) : null;
}

async function main() {
  const only = process.argv[2];
  const hacks = only ? HACKS.filter((h) => h.id === only) : HACKS;
  if (hacks.length === 0) throw new Error(`unknown hack "${only}"`);

  const [sourceRoutes, sourceLeague, sourcePatches] = await Promise.all(["routes", "league", "patches"].map(fetchJson));
  const pokemon = await readJson(path.join(dataDir, "pokemon.json"));
  const catchRates = new Map((await readJson(path.join(dataDir, "catchrates.json"))).map((c) => [c.id, c.catch_rate]));
  const history = await readJson(path.join(dataDir, "pokemon-history.json"));
  const moves = await readJson(path.join(dataDir, "moves.json"));
  const bySlug = new Map(pokemon.filter((p) => p.baseId === undefined).map((p) => [slug(p.names.en), p]));
  const maxDex = Math.max(...pokemon.filter((p) => p.baseId === undefined).map((p) => p.id));

  for (const hack of hacks) {
    const base = path.join(dataDir, "games", hack.base);
    const baseGame = await readJson(path.join(base, "game.json"));
    const baseRoutes = await readJson(path.join(base, "routes.json"));
    const baseCaps = await readJson(path.join(base, "levelcaps.json"));
    const routeByName = new Map(baseRoutes.map((r) => [key(r.names.en), r]));
    const capByName = new Map();
    for (const cap of baseCaps) if (!capByName.has(key(cap.names.en))) capByName.set(key(cap.names.en), cap);
    const e4Base = baseCaps.find((cap) => cap.location.en === "Elite Four")?.location ?? allLangs("Elite Four");

    const entries = sourceRoutes[hack.routes ?? hack.src];
    const league = sourceLeague[hack.league ?? hack.src] ?? {};
    if (!entries?.length) throw new Error(`${hack.id}: no routes under "${hack.routes ?? hack.src}"`);

    // Routes ------------------------------------------------------------------
    const routes = [];
    for (const entry of entries.filter((e) => e.type === "route")) {
      const match = routeByName.get(key(entry.name));
      const route = {
        id: routes.length + 1,
        names: match ? match.names : allLangs(entry.name),
        type: match?.type ?? (/^(starter|gift|fossil)/i.test(entry.name) ? "static" : "route"),
      };
      if (match?.postgame) route.postgame = true;
      routes.push(route);
    }

    // Boss fights ---------------------------------------------------------------
    const gyms = entries.filter((e) => e.type === "gym");
    const firstE4 = gyms.findIndex((g) => g.group === "elite-four");
    let e4End = firstE4;
    while (e4End >= 0 && e4End < gyms.length && gyms[e4End].group === "elite-four") e4End++;
    const levelcaps = gyms.map((gym, i) => {
      const match = capByName.get(key(gym.boss ?? ""));
      const inE4 = firstE4 >= 0 && i >= firstE4 && i < e4End;
      const cap = {
        id: i + 1,
        names: match ? match.names : allLangs(gym.boss || gym.name),
        // A base-game place is only borrowed for a gym leader, and never the
        // base game's "Elite Four" outside the block (Wallace leads a gym in
        // Ruby/Sapphire but is Emerald's Champion).
        location: inE4
          ? e4Base
          : match && gym.group === "gym-leader" && match.location.en !== "Elite Four"
            ? match.location
            : allLangs(gym.name),
        badge: gym.group === "gym-leader" && match?.badge && !inE4 ? match.badge : null,
        max_level: highestLevel(league[gym.value]),
      };
      if (match?.sprite) cap.sprite = match.sprite;
      return cap;
    });

    // Species and moves from the hack's patches ---------------------------------
    const patch = sourcePatches[hack.patch ?? hack.src] ?? {};
    const species = [];
    for (const [name, change] of Object.entries(patch.pokemon ?? {})) {
      const own = bySlug.get(slug(change.name ?? name));
      if (!own || (!change.stats && !change.types)) continue;
      let types = own.types;
      for (const h of history
        .filter((e) => e.id === own.id && e.types && hack.dataGeneration <= e.maxGeneration)
        .sort((a, b) => b.maxGeneration - a.maxGeneration)) {
        types = h.types;
      }
      const stats = { ...own.stats };
      delete stats.Spezial;
      for (const [k, v] of Object.entries(change.stats ?? {})) if (STAT_KEYS[k]) stats[STAT_KEYS[k]] = Number(v);
      stats.Summe = Object.values(STAT_KEYS).reduce((sum, k) => sum + stats[k], 0);
      species.push({
        id: own.id,
        name: own.names.en,
        types: change.types?.length ? change.types : types,
        stats,
        catchRate: catchRates.get(own.id) ?? 45,
        weight: own.weight,
      });
    }
    const moveOverrides = {};
    for (const [name, change] of Object.entries(patch.move ?? {})) {
      if (!moves[name]) continue;
      const out = {};
      if (change.type) out.type = change.type;
      if (change.power !== undefined && change.power !== "" && Number.isFinite(Number(change.power))) out.power = Number(change.power);
      if (["physical", "special", "status"].includes(change.category)) out.damageClass = change.category;
      if (Object.keys(out).length) moveOverrides[name] = out;
    }

    // game.json -------------------------------------------------------------------
    const game = {
      id: hack.id,
      sort: hack.sort,
      kind: "romhack",
      dataStatus: "unverified",
      generation: hack.generation,
      ...(hack.dataGeneration !== hack.generation ? { dataGeneration: hack.dataGeneration } : {}),
      dexLimit: Math.min(GEN_MAX_ID[hack.dataGeneration], maxDex),
      spriteSet: hack.spriteSet,
      versionGroup: hack.versionGroup,
      trainerSet: baseGame.trainerSet ?? baseGame.id,
      ...(species.length ? { speciesData: hack.id } : {}),
      names: allLangs(hack.name),
      source: `${SOURCE_REPO}@${SOURCE_COMMIT.slice(0, 7)} (${hack.src})`,
    };

    const dir = path.join(dataDir, "games", hack.id);
    await mkdir(dir, { recursive: true });
    const json = (value) => JSON.stringify(value, null, 2) + "\n";
    await writeFile(path.join(dir, "game.json"), json(game));
    await writeFile(path.join(dir, "routes.json"), json(routes));
    await writeFile(path.join(dir, "levelcaps.json"), json(levelcaps));
    const movesFile = path.join(dir, "move-overrides.json");
    if (Object.keys(moveOverrides).length) await writeFile(movesFile, json(moveOverrides));
    else await rm(movesFile, { force: true });
    if (species.length) {
      await writeFile(
        path.join(dataDir, "shared", `${hack.id}-species.json`),
        json({ source: `${SOURCE_REPO}@${SOURCE_COMMIT} patches.json (${hack.patch ?? hack.src})`, sourceVersion: SOURCE_COMMIT.slice(0, 7), generatedAt: new Date().toISOString(), species }),
      );
    }
    const matchedRoutes = routes.filter((r) => r.names.de !== r.names.en || routeByName.has(key(r.names.en))).length;
    console.log(
      `${hack.id}: ${routes.length} routes (${matchedRoutes} named from ${hack.base}), ${levelcaps.length} bosses, ` +
        `${species.length} species changed, ${Object.keys(moveOverrides).length} moves changed`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
