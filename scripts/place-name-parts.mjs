// How an official pack's place name breaks down, shared by
// generate-place-names.mjs (what to look up) and localize-places.mjs (how to
// put it back together in another language):
//   "Union Cave (Lapras)"   -> place "Union Cave", note "Lapras"
//   "Aqua Hideout B1F"      -> place "Aqua Hideout", floor "B1F"
//   "Route 36 (Sudowoodo)"  -> place "Route 36", note "Sudowoodo"
// A leading qualifier ("Eevee Celadon City", "Salesman Route 4") is left in
// `place`; the lookup drops leading words until a page is found.

// The regions each official pack plays in, for regional page titles
// ("Victory Road (Kanto)") and the right one of two same-named places.
export const PACK_REGIONS = {
  "red-blue": ["kanto"],
  "gold-silver": ["johto", "kanto"],
  firered: ["kanto"],
  ruby: ["hoenn"],
  sapphire: ["hoenn"],
  emerald: ["hoenn"],
  "diamond-pearl": ["sinnoh"],
  platinum: ["sinnoh"],
  heartgold: ["johto", "kanto"],
  soulsilver: ["johto", "kanto"],
  black: ["unova"],
  white: ["unova"],
  "black-2-white-2": ["unova"],
  "x-y": ["kalos"],
  "omega-ruby": ["hoenn"],
  "alpha-sapphire": ["hoenn"],
  sun: ["alola"],
  moon: ["alola"],
  "ultra-sun": ["alola"],
  "ultra-moon": ["alola"],
  sword: ["galar"],
  shield: ["galar"],
  "brilliant-diamond-shining-pearl": ["sinnoh"],
  "scarlet-violet": ["paldea"],
};

const FLOOR = /\s+(B?\d+F|\d+F|B\dF)$/;

export function splitPlace(english) {
  let place = english.replace(/\s+/g, " ").trim();
  let note = null;
  let floor = null;
  const paren = place.match(/^(.*?)\s*\(([^)]*)\)$/);
  if (paren) {
    place = paren[1];
    note = paren[2];
  }
  const fl = place.match(FLOOR);
  if (fl) {
    floor = fl[1];
    place = place.slice(0, fl.index);
  }
  return { place, note, floor };
}
