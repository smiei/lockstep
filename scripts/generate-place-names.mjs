// Fetches the official names of every main-series place into
// data/shared/place-names.json:
//   { source, generatedAt, places: { <English name>: [{ page, regions, de, en, fr, es, it }] } }
// One English name can be several places (every region has a "Pokémon League"
// and a "Route 1"), told apart by `regions` (from the page's categories).
// Each language is a list of { name, games? }: a place renamed between
// games (Dark Cave is "Antre Noire" in Gold/Silver/Crystal's French, "Antre
// Noir" in HeartGold/SoulSilver's) keeps every variant with the PokéWiki game
// abbreviations it belongs to, and scripts/localize-places.mjs picks the one
// for each pack.
// Source: PokéWiki (facts: the official names), every page in
// "Kategorie:Ort", read through the MediaWiki API, 20
// pages per request, one request per second - the "In anderen Sprachen" table.
// (Bulbapedia has the same tables, but sits behind a bot check.)
// Numbered routes, Pokémon in a name and the packs' own suffixes are not looked
// up here; localize-places.mjs builds those by rule.
// Run manually: node scripts/generate-place-names.mjs   (network, ~2 minutes)
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "shared", "place-names.json");
const API = "https://www.pokewiki.de/api.php";
const USER_AGENT = "Lockstep place-name import (https://github.com/smiei/lockstep)";
// Not "Ort aus einem Hauptspiel": that one misses pages (Herzhofen). The
// regions the packs ask for keep anime-only places out.
const CATEGORY = "Kategorie:Ort";
const LANGS = ["de", "en", "fr", "es", "it"];
// PokéWiki's region categories -> the region ids of place-name-parts.mjs.
const REGIONS = {
  Kanto: "kanto",
  Johto: "johto",
  Hoenn: "hoenn",
  Sinnoh: "sinnoh",
  Einall: "unova",
  Kalos: "kalos",
  Alola: "alola",
  Galar: "galar",
  Paldea: "paldea",
  "Sevii Inseln": "kanto",
  "Sevii-Inseln": "kanto",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`PokéWiki: HTTP ${res.status}`);
  await sleep(1000);
  return res.json();
}

const clean = (text) =>
  text
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/''[^']*''/g, "")
    .replace(/<\/?small>/g, "")
    .replace(/\{\{tt\|([^|}]+)\|[^}]*\}\}/g, "$1")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

// "Antre Noire (<small>{{sk|Go|Si|K}}</small>)<br />Antre Noir (<small>{{sk|HG|SS}}</small>)"
// -> [{ name: "Antre Noire", games: ["Go","Si","K"] }, { name: "Antre Noir", games: ["HG","SS"] }]
// "PALLET TOWN ([[Spielgeneration|Gen.]] {{G|1}} bis {{G|3}})<br />Pallet Town"
// -> [{ name: "PALLET TOWN", gens: [1, 2, 3] }, { name: "Pallet Town" }]
function variants(raw) {
  return raw
    .split(/<br\s*\/?>/)
    .map((part) => {
      const games = [...part.matchAll(/\{\{sk\|([^}]*)\}\}/g)].flatMap((m) => m[1].split("|").map((g) => g.trim()));
      const genNumbers = [...part.matchAll(/\{\{G\|(\d)\}\}/g)].map((m) => Number(m[1]));
      const gens =
        genNumbers.length === 2 && /bis/.test(part)
          ? Array.from({ length: genNumbers[1] - genNumbers[0] + 1 }, (_, k) => genNumbers[0] + k)
          : genNumbers;
      // Brackets that only say which games or generations a name is from.
      const name = clean(
        part.replace(/\(([^()]*\{\{(sk|G)\|[^}]*\}\}[^()]*)\)/g, "").replace(/\{\{(sk|G)\|[^}]*\}\}/g, ""),
      );
      return { name, ...(games.length ? { games } : {}), ...(gens.length ? { gens } : {}) };
    })
    .filter((v) => v.name && !/[぀-ヿ一-鿿]/.test(v.name));
}

// The template's parameters, split at top-level "|" only (not inside [[ ]] or {{ }}).
function templateParams(body) {
  const params = {};
  let depth = 0;
  let current = "";
  const flush = () => {
    const eq = current.indexOf("=");
    if (eq > 0) params[current.slice(0, eq).trim()] = current.slice(eq + 1).trim();
    current = "";
  };
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      current += two;
      i++;
    } else if (two === "}}" || two === "]]") {
      depth--;
      current += two;
      i++;
    } else if (body[i] === "|" && depth === 0) flush();
    else current += body[i];
  }
  flush();
  return params;
}

function namesOf(text) {
  const start = text.indexOf("{{In anderen Sprachen");
  if (start < 0) return null;
  // The template ends at its own closing braces, counted from its start.
  let depth = 0;
  let end = start;
  for (; end < text.length; end++) {
    if (text.startsWith("{{", end)) {
      depth++;
      end++;
    } else if (text.startsWith("}}", end)) {
      depth--;
      end++;
      if (depth === 0) break;
    }
  }
  const params = templateParams(text.slice(start + "{{In anderen Sprachen".length, end - 1));
  const out = {};
  for (const lang of LANGS) {
    const raw = params[`Name_${lang}`];
    if (raw) {
      const list = variants(raw);
      if (list.length) out[lang] = list;
    }
  }
  return out.en ? out : null;
}

// Every page in the category.
const titles = [];
let cont = {};
do {
  const data = await api({ action: "query", list: "categorymembers", cmtitle: CATEGORY, cmlimit: "500", cmnamespace: "0", ...cont });
  titles.push(...data.query.categorymembers.map((m) => m.title));
  cont = data.continue ?? null;
} while (cont);
console.log(`${titles.length} pages in ${CATEGORY}`);

const places = {};
for (let i = 0; i < titles.length; i += 20) {
  const data = await api({
    action: "query",
    prop: "revisions|categories",
    rvprop: "content",
    rvslots: "main",
    cllimit: "max",
    titles: titles.slice(i, i + 20).join("|"),
  });
  for (const page of data.query.pages) {
    const text = page.revisions?.[0]?.slots?.main?.content;
    const names = text && namesOf(text);
    if (!names) continue;
    const regions = [
      ...new Set(
        (page.categories ?? [])
          .map((c) => REGIONS[c.title.replace(/^Kategorie:/, "").replace(/_/g, " ")])
          .filter(Boolean),
      ),
    ];
    for (const { name: en } of names.en) {
      (places[en] ??= []).push({ page: page.title, regions, ...names });
    }
  }
  if ((i / 20) % 10 === 0) console.log(`${Math.min(i + 20, titles.length)}/${titles.length}`);
}

await writeFile(
  OUT,
  JSON.stringify(
    {
      source: `PokéWiki, "${CATEGORY}", In anderen Sprachen (https://www.pokewiki.de)`,
      generatedAt: new Date().toISOString(),
      places: Object.fromEntries(Object.entries(places).sort(([a], [b]) => a.localeCompare(b))),
    },
    null,
    2,
  ) + "\n",
);
const shared = Object.values(places).filter((list) => list.length > 1).length;
console.log(`${Object.keys(places).length} English names, ${shared} of them on more than one page`);
