// Fetches the localized names of the boss trainers in the game packs that have
// only English ones (packs imported from nuzlocke.app for regions no older
// pack covers) into data/shared/trainer-names.json:
//   { source, generatedAt, names: { <English person name>: { de, fr, es, it } } }
// Source: the "Names" table on each character's Bulbapedia page (facts: the
// official names in each language), read through the MediaWiki API, one
// request per second. A person without a page or table keeps the English
// name. scripts/import-nuzlocke-app.mjs builds the bosses' names from it.
// Run manually: node scripts/generate-trainer-names.mjs   (network, ~3 minutes)
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { personNames } from "./trainer-name-parts.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "shared", "trainer-names.json");
const API = "https://bulbapedia.bulbagarden.net/w/api.php";
const USER_AGENT = "Lockstep trainer-name import (https://github.com/smiei/lockstep)";

// Bulbapedia page of a person whose plain name is a disambiguation page or
// someone else.
const PAGE = {
  May: "May (game)",
  Shadow: "Shadow (Team Plasma)",
  Rose: "Rose",
  Mars: "Mars",
  Saturn: "Saturn",
  Hugh: "Hugh",
  Ingo: "Ingo",
  Emmet: "Emmet",
  Grant: "Grant",
  Ryuki: "Ryuki",
  Penny: "Penny",
  Clive: "Clive",
  Aarune: "Aarune",
};

// Which "Names" table row belongs to which of our languages.
const LANG_LABELS = {
  de: /\bGerman\b/,
  fr: /\b(European )?French\b/,
  es: /\b(European )?Spanish\b/,
  it: /\bItalian\b/,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (cell) =>
  cell
    .replace(/<ref[^>]*\/>|<ref[^>]*>.*?<\/ref>/g, "")
    .replace(/\{\{tt\|([^|}]+)\|[^}]*\}\}/g, "$1")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'''?|''/g, "")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function namesOf(person) {
  const page = PAGE[person] ?? person;
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.parse?.wikitext?.["*"];
  if (!text) return null;
  const start = text.search(/==\s*Names\s*==/);
  if (start < 0) return null;
  const table = text.slice(start, text.indexOf("|}", start));
  const found = {};
  for (const row of table.split(/\n\|-/)) {
    const cells = row.split(/\n\|/).map((c) => c.replace(/^[^|\n]*\|(?![|])/, (m) => (m.includes("=") ? "" : m)));
    if (cells.length < 3) continue;
    const label = clean(cells[1]);
    const name = clean(cells[2].split("||")[0]);
    if (!name || /[぀-ヿ一-鿿]/.test(name)) continue;
    // The games' (European) names, never a regional anime or manga variant.
    const european = label.replace(/(Latin American|Canadian|Brazilian) [A-Za-z]+/g, "");
    for (const [lang, re] of Object.entries(LANG_LABELS)) {
      if (!found[lang] && re.test(european)) found[lang] = name;
    }
  }
  return Object.keys(found).length ? found : null;
}

// Every boss name an imported pack still has only in English.
const wanted = new Set();
for (const dir of await readdir(path.join(root, "data", "games"))) {
  let caps;
  try {
    caps = JSON.parse(await readFile(path.join(root, "data", "games", dir, "levelcaps.json"), "utf-8"));
  } catch {
    continue;
  }
  for (const cap of caps) if (cap.names.de === cap.names.en) for (const person of personNames(cap.names.en)) wanted.add(person);
}

let existing = {};
try {
  existing = JSON.parse(await readFile(OUT, "utf-8")).names;
} catch {
  // first run
}
const names = { ...existing };
const missing = [];
for (const person of [...wanted].sort()) {
  if (names[person]) continue;
  const found = await namesOf(person).catch(() => null);
  if (found) names[person] = found;
  else missing.push(person);
  await sleep(1000);
}

await writeFile(
  OUT,
  JSON.stringify(
    {
      source: "Bulbapedia character pages, Names table (https://bulbapedia.bulbagarden.net)",
      generatedAt: new Date().toISOString(),
      names: Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b))),
    },
    null,
    2,
  ) + "\n",
);
console.log(`${Object.keys(names).length} people named, ${missing.length} without a table: ${missing.join(", ")}`);
