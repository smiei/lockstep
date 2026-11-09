// Puts the official badge names (data/shared/badge-names.json, from PokéWiki
// via generate-badge-names.mjs) into every pack's levelcaps.json.
// A badge is found by its leader and English name, by its English name alone
// when the leader is not in the table; a name that two regions share with
// different translations (Kalos' and Galar's "Fairy Badge") is settled by the
// pack's region. Packs that show a badge in English in every language (the ROM
// hacks) keep it so. A language the table lacks keeps the pack's own value.
// Run manually: node scripts/apply-badge-names.mjs [--check]   (no network)
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PACK_REGIONS } from "./place-name-parts.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["de", "en", "fr", "es", "it"];
const check = process.argv.includes("--check");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const table = (await readJson(path.join(root, "data", "shared", "badge-names.json"))).regions;
const entries = Object.entries(table).flatMap(([region, leaders]) =>
  Object.entries(leaders).map(([leader, names]) => ({ region, leader, names })),
);

const same = (a, b) => LANGS.every((l) => a[l] === b[l]);
const distinct = (list) => list.filter((e, i) => list.findIndex((o) => same(o.names, e.names)) === i);

function lookup(leader, english, regions) {
  let found = entries.filter((e) => e.leader === leader && e.names.en === english);
  if (found.length === 0) found = distinct(entries.filter((e) => e.names.en === english));
  if (found.length > 1 && regions) found = found.filter((e) => regions.includes(e.region));
  return distinct(found);
}

const gamesDir = path.join(root, "data", "games");
let changed = 0;
const unresolved = [];
for (const pack of (await readdir(gamesDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const file = path.join(gamesDir, pack, "levelcaps.json");
  let caps;
  try {
    caps = await readJson(file);
  } catch {
    continue;
  }
  let packChanged = false;
  for (const cap of caps) {
    const badge = cap.badge;
    if (!badge) continue;
    // English in every language: a ROM hack's own display, left as it is.
    if (LANGS.every((l) => badge[l] === badge.en)) continue;
    const found = lookup(cap.names?.en, badge.en, PACK_REGIONS[pack]);
    if (found.length !== 1) {
      unresolved.push(`${pack}: ${cap.names?.en} / ${badge.en} (${found.length} matches)`);
      continue;
    }
    for (const lang of LANGS) {
      const want = found[0].names[lang];
      if (want === undefined || badge[lang] === want) continue;
      console.log(`${pack}: ${badge.en} ${lang} "${badge[lang]}" -> "${want}"`);
      badge[lang] = want;
      packChanged = true;
      changed++;
    }
  }
  if (packChanged && !check) await writeFile(file, JSON.stringify(caps, null, 2) + "\n");
}
for (const line of unresolved) console.log(`unresolved: ${line}`);
console.log(`${changed} names ${check ? "would change" : "changed"}, ${unresolved.length} unresolved`);
if (check && (changed > 0 || unresolved.length > 0)) process.exit(1);
