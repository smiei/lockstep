// Fetches the localized names of the gym badges that no older pack of ours
// carries (Kalos, Galar, Paldea, and the few Hoenn/Unova badges the base
// games' packs lack) into data/shared/badge-names.json:
//   { source, generatedAt, regions: { <region>: { <English leader name>: { de, en, fr, es, it } } } }
// Keyed by leader, not by badge: English badge names repeat across regions
// (Kalos' and Paldea's "Bug Badge", Kalos' and Galar's "Fairy Badge").
// Source: the "In anderen Sprachen" table on each badge's PokéWiki page
// (facts: the official names in each language), read through the MediaWiki
// API, one request per second. scripts/import-nuzlocke-app.mjs gives a gym
// leader's level cap its badge from it.
// Run manually: node scripts/generate-badge-names.mjs   (network, ~40 seconds)
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "shared", "badge-names.json");
const API = "https://www.pokewiki.de/api.php";
const USER_AGENT = "Lockstep badge-name import (https://github.com/smiei/lockstep)";

// Leader (as nuzlocke.app names them) -> German PokéWiki page of the badge.
const BADGES = {
  hoenn: { Wallace: "Schauerorden" },
  unova: { Cheren: "Grundorden", Roxie: "Giftorden", Marlon: "Wellenorden" },
  kalos: {
    Viola: "Krabbelorden",
    Grant: "Wallorden",
    Korrina: "Rauforden",
    Ramos: "Blattorden",
    Clemont: "Ampere-Orden",
    Valerie: "Feenorden",
    Valeria: "Feenorden",
    Olympia: "Psi-Orden",
    Wulfric: "Eisbergorden",
  },
  galar: {
    Milo: "Pflanzen-Orden",
    Nessa: "Wasser-Orden",
    Kabu: "Feuer-Orden",
    Bea: "Kampf-Orden",
    Allister: "Geister-Orden",
    Opal: "Feen-Orden",
    Gordie: "Gesteins-Orden",
    Melony: "Eis-Orden",
    Piers: "Unlicht-Orden",
    Raihan: "Drachen-Orden",
  },
  paldea: {
    Katy: "Käfer-Arenaorden",
    Brassius: "Pflanzen-Arenaorden",
    Iono: "Elektro-Arenaorden",
    Kofu: "Wasser-Arenaorden",
    Larry: "Normal-Arenaorden",
    Ryme: "Geister-Arenaorden",
    Tulip: "Psycho-Arenaorden",
    Grusha: "Eis-Arenaorden",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A value may list an anime-only variant after a line break; the first one
// is the games' name.
const clean = (value) =>
  value
    .split(/<br\s*\/?>/)[0]
    .replace(/''[^']*''/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .trim();

async function namesOf(page) {
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${page}: HTTP ${res.status}`);
  const text = (await res.json()).parse?.wikitext?.["*"] ?? "";
  const start = text.indexOf("{{In anderen Sprachen");
  if (start < 0) throw new Error(`${page}: no "In anderen Sprachen" table`);
  const table = text.slice(start, text.indexOf("\n}}", start));
  const names = {};
  for (const lang of ["de", "en", "fr", "es", "it"]) {
    const match = table.match(new RegExp(`\\|\\s*Name_${lang}\\s*=([^\\n]+)`));
    if (!match) throw new Error(`${page}: no ${lang} name`);
    names[lang] = clean(match[1]);
  }
  return names;
}

const cache = new Map();
const regions = {};
for (const [region, leaders] of Object.entries(BADGES)) {
  regions[region] = {};
  for (const [leader, page] of Object.entries(leaders)) {
    if (!cache.has(page)) {
      cache.set(page, await namesOf(page));
      await sleep(1000);
    }
    regions[region][leader] = cache.get(page);
  }
}

await writeFile(
  OUT,
  JSON.stringify(
    {
      source: "PokéWiki badge pages, \"In anderen Sprachen\" table (https://www.pokewiki.de)",
      generatedAt: new Date().toISOString(),
      regions,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${cache.size} badges for ${Object.values(regions).reduce((n, r) => n + Object.keys(r).length, 0)} leaders`);
