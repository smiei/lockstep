// Fetches the localized names of every location PokeAPI knows, per region, into
// data/shared/location-names.json:
//   { source, generatedAt, regions: { <region>: { <english name>: { de, en, fr?, es?, it? } } } }
// scripts/import-nuzlocke-app.mjs names a pack's routes and boss places from it
// when no existing pack of ours has the place (new regions such as Kalos, new
// towns such as Black 2's Aspertia City). PokeAPI has German and French for
// nearly every place and Spanish/Italian for many; a missing language falls
// back to English at render time (localizeName).
// Run manually: node scripts/generate-location-names.mjs   (network, ~2 minutes)
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "shared", "location-names.json");
const API = "https://pokeapi.co/api/v2";
const LANGS = ["de", "en", "fr", "es", "it"];
const REGIONS = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  throw new Error(`fetch failed: ${url}`);
}

const regions = {};
for (const region of REGIONS) {
  const data = await get(`${API}/region/${region}`);
  const queue = [...data.locations];
  const names = {};
  const worker = async () => {
    while (queue.length) {
      const { url } = queue.shift();
      const location = await get(url);
      if (!location) continue;
      const localized = {};
      for (const n of location.names) if (LANGS.includes(n.language.name)) localized[n.language.name] = n.name;
      if (localized.en && !names[localized.en]) names[localized.en] = localized;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  regions[region] = Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b)));
  console.log(`${region}: ${Object.keys(names).length} places`);
}

await writeFile(
  OUT,
  JSON.stringify({ source: "https://pokeapi.co/api/v2/region/<region> -> location names", generatedAt: new Date().toISOString(), regions }, null, 2) + "\n",
);
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
