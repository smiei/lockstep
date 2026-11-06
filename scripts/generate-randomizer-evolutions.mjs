// Generates a game pack's evolution-overrides.json for the three randomizer
// rules, by replaying what the Universal Pokemon Randomizer ZX does to
// evolutions in Gen 1-7 (romhandlers/Gen1-7RomHandler.java and
// AbstractRomHandler.condenseLevelEvolutions; checked against its master
// branch on 2026-11-06) on top of data/evolutions.json.
//
//   node scripts/generate-randomizer-evolutions.mjs <gameId>...           compare with the pack's file
//   node scripts/generate-randomizer-evolutions.mjs <gameId>... --write   (re)write it
//
// What the randomizer does, and what of it this file can express:
// - "Change Impossible Evolutions": a trade becomes level 37, a trade with an
//   item becomes "level up holding it" (Slowpoke's King's Rock a Water Stone,
//   since it already has a level evolution), Karrablast/Shelmet need the
//   other in the party. Evolutions by move are only changed when movesets are
//   randomized - left out, like in the Gen 3/4 lists.
// - "Make Evolutions Easier": every level evolution above 40 drops to 40, and
//   to 30 if the result evolves again. Sun/Moon also get a level-35 way for
//   the place-bound ones (Crabrawler, Magneton, Nosepass, Charjabug). Not
//   expressible: the happiness needed drops from 220 to 160, and with wild
//   Pokemon randomized "with another species in the party" turns into level 35
//   (assumed off here, as in the existing Black/White list).
// - "Remove Time-Based Evolutions": Eevee's Espeon/Umbreon become Sun/Moon
//   Stone, every other day/night condition is dropped; Gen 7's Rockruff takes
//   a Sun Stone to Midday, a Moon Stone to Midnight and a Dusk Stone to Dusk
//   Lycanroc (the formes' edges come from data/form-evolutions.json).
import fs from "node:fs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const games = args.filter((a) => !a.startsWith("--"));
if (games.length === 0) {
  console.error("usage: node scripts/generate-randomizer-evolutions.mjs <gameId>... [--write]");
  process.exit(1);
}

const evolutions = JSON.parse(fs.readFileSync("data/evolutions.json", "utf8"));
const pokemon = JSON.parse(fs.readFileSync("data/pokemon.json", "utf8"));
const byId = new Map(evolutions.map((e) => [e.id, e]));
const nameDe = (id) => pokemon.find((p) => p.id === id)?.names?.de ?? String(id);

// Evolutions PokeAPI lists second, which data/evolutions.json (one method per
// species) does not keep: Feebas's Prism Scale trade from Gen 5 on.
const EXTRA_TRADES = [{ from: 349, to: 350, item: "prism-scale", minGeneration: 5 }];
const KARRABLAST = 588;
const SHELMET = 616;
const SLOWPOKE = 79;
const EEVEE = 133;
const ROCKRUFF = 744;
// Lycanroc's three formes and the stone each takes without the time of day.
const LYCANROC_STONES = { 745: "sun-stone", 10126: "moon-stone", 10152: "dusk-stone" };
// HeartGold/SoulSilver: evolutions bound to a Sinnoh place, as the
// randomizer rewrites them (Glaceon takes a Dawn Stone there, not an Ice one).
const HGSS_PLACE_BOUND = {
  462: { kind: "level", level: 40 },
  476: { kind: "level", level: 40 },
  470: { kind: "item", item: "leaf-stone" },
  471: { kind: "item", item: "dawn-stone" },
};

// Gold/Silver/Crystal: the original four trades and Poliwhirl level 37,
// Slowpoke a Water Stone, Seadra level 40, the new single-stage trades
// (Onix, Scyther, Porygon) level 30.
function gen2Trade(from, item) {
  if (from === SLOWPOKE) return { kind: "item", item: "water-stone" };
  if (from === 117) return { kind: "level", level: 40 }; // Seadra
  if (from === 61 || !item) return { kind: "level", level: 37 }; // Poliwhirl, the original four
  return { kind: "level", level: 30 };
}

// Gen 3 has no "level up holding an item", so each trade-item evolution gets
// a fixed replacement of its own.
function gen3Trade(from, item) {
  if (!item) return { kind: "level", level: 37 };
  if (from === 61) return { kind: "level", level: 37 }; // Poliwhirl
  if (from === SLOWPOKE) return { kind: "item", item: "water-stone" };
  if (from === 117) return { kind: "level", level: 40 }; // Seadra
  if (from === 366 && item === "deep-sea-tooth") return { kind: "level", level: 30 };
  if (from === 366) return { kind: "item", item: "water-stone" }; // Clamperl's Deep Sea Scale
  return { kind: "level", level: 30 }; // Onix, Scyther, Porygon
}

// Sun/Moon: level 35 as a second way for evolutions bound to a snowy or
// electrified place.
const SUN_MOON_PLACE_BOUND = [740, 738, 462, 476];

function generate(gameId) {
  const game = JSON.parse(fs.readFileSync(`data/games/${gameId}/game.json`, "utf8"));
  if (game.generation < 1 || game.generation > 7) throw new Error(`${gameId}: only Gen 1-7 are modelled`);
  const gen3 = game.generation === 3;
  const gen2 = game.generation === 2;
  const gen1 = game.generation === 1;
  const inDex = (id) => id >= 1 && id <= game.dexLimit;
  const evolvesFurther = (id) => (byId.get(id)?.evolvesTo ?? []).some(inDex);
  const out = [];
  const add = (category, from, to, method) =>
    out.push({ from, to, comment: `${nameDe(from)} -> ${nameDe(to)}`, method, category });

  const edges = evolutions
    .filter((e) => e.evolvesFrom && e.method && inDex(e.id) && inDex(e.evolvesFrom))
    .map((e) => ({ from: e.evolvesFrom, to: e.id, method: e.method }));

  // Change Impossible Evolutions
  const impossible = new Map();
  for (const { from, to, method } of edges) {
    if (method.kind !== "trade") continue;
    let next;
    if (gen1) {
      next = { kind: "level", level: 37 };
    } else if (gen2) {
      next = gen2Trade(from, method.item);
    } else if (gen3) {
      next = gen3Trade(from, method.item);
    } else if (from === KARRABLAST || from === SHELMET) {
      next = { kind: "levelWith", name: nameDe(from === KARRABLAST ? SHELMET : KARRABLAST) };
    } else if (method.item && from === SLOWPOKE) {
      next = { kind: "item", item: "water-stone" };
    } else if (method.item) {
      next = { kind: "levelHeld", item: method.item };
    } else {
      next = { kind: "level", level: 37 };
    }
    impossible.set(to, next);
    add("impossible", from, to, next);
  }
  // Not trades, but out of reach without one in these games.
  for (const { from, to, method } of edges) {
    let next = null;
    if (game.versionGroup === "firered-leafgreen") {
      // No clock in FireRed/LeafGreen, and no Pokéblocks for Feebas.
      if (method.kind === "happiness" && method.time) next = { kind: "item", item: method.time === "day" ? "sun-stone" : "moon-stone" };
      if (method.kind === "beauty") next = { kind: "level", level: 35 };
    } else if (game.versionGroup === "heartgold-soulsilver") {
      // No Pokéblocks/Poffins, no Mt. Coronet, no Moss or Ice Rock in Johto.
      if (method.kind === "beauty") next = { kind: "level", level: 35 };
      if (HGSS_PLACE_BOUND[to]) next = HGSS_PLACE_BOUND[to];
    }
    if (next) {
      impossible.set(to, next);
      add("impossible", from, to, next);
    }
  }
  for (const extra of EXTRA_TRADES) {
    if (game.generation >= extra.minGeneration && inDex(extra.to)) {
      add("impossible", extra.from, extra.to, { kind: "levelHeld", item: extra.item });
    }
  }

  // Make Evolutions Easier (runs after the impossible ones, on their result)
  for (const { from, to, method } of edges) {
    const current = impossible.get(to) ?? method;
    if (current.kind !== "level") continue;
    const cap = evolvesFurther(to) ? 30 : 40;
    if (current.level > cap) add("easier", from, to, { kind: "level", level: cap });
  }
  if (game.versionGroup === "sun-moon") {
    for (const to of SUN_MOON_PLACE_BOUND) {
      const e = byId.get(to);
      if (e && inDex(to)) add("easier", e.evolvesFrom, to, { kind: "level", level: 35 });
    }
  }

  // Remove Time-Based Evolutions
  for (const { from, to, method } of edges) {
    if (method.kind === "happiness" && method.time) {
      if (from === EEVEE) add("timeBased", from, to, { kind: "item", item: method.time === "day" ? "sun-stone" : "moon-stone" });
      else add("timeBased", from, to, { kind: "happiness" });
    } else if (method.kind === "levelHeld" && method.time) {
      add("timeBased", from, to, { kind: "levelHeld", item: method.item });
    }
  }
  if (game.generation === 7) {
    for (const [to, item] of Object.entries(LYCANROC_STONES)) {
      add("timeBased", ROCKRUFF, Number(to), { kind: "item", item });
    }
  }

  const order = { impossible: 0, easier: 1, timeBased: 2 };
  return out.sort((a, b) => order[a.category] - order[b.category] || a.from - b.from || a.to - b.to);
}

const key = (e) => `${e.category} ${e.from}->${e.to} ${JSON.stringify(e.method)}`;
for (const gameId of games) {
  const generated = generate(gameId);
  const file = `data/games/${gameId}/evolution-overrides.json`;
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  const had = new Set(existing.map(key));
  const now = new Set(generated.map(key));
  const added = generated.filter((e) => !had.has(key(e)));
  const removed = existing.filter((e) => !now.has(key(e)));
  const counts = {};
  for (const e of generated) counts[e.category] = (counts[e.category] ?? 0) + 1;
  console.log(`${gameId}: ${generated.length} ${JSON.stringify(counts)}  +${added.length} -${removed.length}`);
  for (const e of added) console.log(`  + ${e.category} ${e.comment} ${JSON.stringify(e.method)}`);
  for (const e of removed) console.log(`  - ${e.category} ${e.comment} ${JSON.stringify(e.method)}`);
  if (write) fs.writeFileSync(file, JSON.stringify(generated, null, 2) + "\n");
}
