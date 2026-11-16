// Fetches the localized names of the boss trainers in the game packs that have
// only English ones (packs imported from nuzlocke.app for regions no older
// pack covers) into data/shared/trainer-names.json:
//   { source, generatedAt, names: { <English person name>: { de, fr, es, it } } }
// Source: the "In anderen Sprachen" table on each character's PokéWiki page
// (facts: the official names in each language), read through the MediaWiki
// API, one request per second - the same source and table as
// generate-badge-names.mjs. PokéWiki redirects a character's English name to
// the German page; the table's own English name is what confirms the redirect
// reached the right person. A person without a page or table keeps the English
// name. scripts/import-nuzlocke-app.mjs builds the bosses' names from it.
//
// An entry already in the file is never overwritten: the file is curated. Its
// older entries came from Bulbapedia's "Names" tables, and where the two wikis
// disagree neither is always right (PokéWiki has "Naburo" for Kabu's Spanish
// "Naboru", and gives Rose and Kukui with their titles). --check lists the
// differences for a person to judge.
// Run manually (network, one second per request):
//   node scripts/generate-trainer-names.mjs           adds the people not in the file yet
//   node scripts/generate-trainer-names.mjs --check   looks everybody up, lists differences, writes nothing
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { personNames } from "./trainer-name-parts.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "shared", "trainer-names.json");
const API = "https://www.pokewiki.de/api.php";
const USER_AGENT = "Lockstep trainer-name import (https://github.com/smiei/lockstep)";
const LANGS = ["de", "fr", "es", "it"];
const check = process.argv.includes("--check");

// A person the table names in full where the packs use the short form.
const ENGLISH = { N: "Natural Harmonia Gropius" };
// How many links of a page that is not the person's own are tried.
const MAX_LINKS = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A value may list another medium's variant after a line break or in a note;
// the first one is the games' name.
const clean = (value) =>
  value
    .split(/<br\s*\/?>/)[0]
    .replace(/<ref[^>]*\/>|<ref[^>]*>.*?<\/ref>/g, "")
    .replace(/''[^']*''/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
const same = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" }) === 0;
// "Chairman Rose" and "Prof. Kukui" are Rose and Kukui.
const isPerson = (english, person) =>
  english
    .split(/\s*[\/,]\s*/)
    .some((name) => same(name, ENGLISH[person] ?? person) || same(name.split(" ").at(-1) ?? "", person));

async function wikitext(page) {
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  await sleep(1000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { title: data.parse?.title ?? page, text: data.parse?.wikitext?.["*"] ?? "" };
}

// The names in a page's table if the table is this person's, else why not.
function readTable({ title, text }, person) {
  if (!text) return { reason: "no page" };
  const start = text.indexOf("{{In anderen Sprachen");
  if (start < 0) return { reason: `no table on "${title}"` };
  const table = text.slice(start, text.indexOf("\n}}", start));
  const field = (lang) => {
    const match = table.match(new RegExp(`\\|\\s*Name_${lang}\\s*=([^\\n]+)`));
    return match ? clean(match[1]) : "";
  };
  const english = field("en");
  if (!isPerson(english, person)) return { reason: `"${title}" is ${english || "somebody without an English name"}` };
  const names = {};
  for (const lang of LANGS) {
    const name = field(lang);
    if (name) names[lang] = name;
  }
  return Object.keys(names).length ? { names } : { reason: `empty table on "${title}"` };
}

// { names } or { reason } - why a person stays English. An English name often
// leads to a disambiguation page, or to a namesake whose page points to the
// person in its first lines; either way the right page is one link away.
async function namesOf(person) {
  const first = await wikitext(person);
  const direct = readTable(first, person);
  if (direct.names || !first.text) return direct;
  const links = [...first.text.slice(0, 2500).matchAll(/\[\[([^\]|#]+)/g)]
    .map((match) => match[1].trim())
    .filter((title) => !/^(Datei|Kategorie|Bild|File):/i.test(title) && !/\((TCG|Animecharakter)\)/.test(title));
  for (const title of [...new Set(links)].slice(0, MAX_LINKS)) {
    const linked = readTable(await wikitext(title), person);
    if (linked.names) return linked;
  }
  return direct;
}

// Every boss name an official pack still has only in English. ROM hacks and
// fan games show English names everywhere, and their own trainers have no
// page to find.
const pokemon = new Set(
  JSON.parse(await readFile(path.join(root, "data", "pokemon.json"), "utf-8")).map((entry) => entry.names.en),
);
const wanted = new Set();
for (const dir of await readdir(path.join(root, "data", "games"))) {
  let caps;
  try {
    const game = JSON.parse(await readFile(path.join(root, "data", "games", dir, "game.json"), "utf-8"));
    if ((game.kind ?? "official") !== "official") continue;
    caps = JSON.parse(await readFile(path.join(root, "data", "games", dir, "levelcaps.json"), "utf-8"));
  } catch {
    continue;
  }
  for (const cap of caps) {
    if (cap.names.de !== cap.names.en) continue;
    // A totem Pokémon is not a person: its names come from pokemon.json.
    for (const person of personNames(cap.names.en)) if (!pokemon.has(person)) wanted.add(person);
  }
}

let existing = {};
try {
  existing = JSON.parse(await readFile(OUT, "utf-8")).names;
} catch {
  // first run
}
// --check also covers the people already in the file: the packs that needed
// them have their names by now and no longer ask for them.
const people = check ? [...new Set([...wanted, ...Object.keys(existing)])] : [...wanted].filter((p) => !existing[p]);
const names = { ...existing };
const missing = [];
let differences = 0;
for (const person of people.sort()) {
  const found = await namesOf(person).catch((error) => ({ reason: String(error.message ?? error) }));
  if (found.names) {
    for (const lang of LANGS) {
      const before = existing[person]?.[lang];
      if (before !== undefined && before !== found.names[lang]) {
        differences++;
        console.log(`${person} ${lang}: file "${before}", PokéWiki "${found.names[lang] ?? ""}"`);
      }
    }
    names[person] ??= found.names;
  } else {
    missing.push(`${person} (${found.reason})`);
  }
}

console.log(`${people.length} looked up, ${differences} values differ from the file, ${missing.length} not found:`);
for (const line of missing) console.log(`  ${line}`);
if (check) process.exit(0);

await writeFile(
  OUT,
  JSON.stringify(
    {
      source:
        "PokéWiki character pages, \"In anderen Sprachen\" table (https://www.pokewiki.de); entries from before 2026-11-16 were read from Bulbapedia's \"Names\" tables and checked against PokéWiki",
      generatedAt: new Date().toISOString(),
      names: Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b))),
    },
    null,
    2,
  ) + "\n",
);
console.log(`${Object.keys(names).length} people named`);
