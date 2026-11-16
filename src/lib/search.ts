import type { Pokemon } from "@/lib/data";
import type { Lang } from "@/lib/i18n/dictionary";
import { dexNumber, displayNameWithForm } from "@/lib/forms";

// What every search field compares: lower case, accents folded away
// ("flabebe" finds Flabébé), outer blanks gone. Client-safe and pure.
export function foldSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// A Pokémon matches its name in the page's language, its English name (the
// one a guide or a ROM hack's documentation uses) or, for a query of digits
// only, the start of its dex number ("25" finds Pikachu first, then 250-259).
export function matchesPokemon(pokemon: Pokemon, lang: Lang, query: string): boolean {
  const q = foldSearch(query);
  if (!q) return true;
  if (/^\d+$/.test(q)) {
    const dex = dexNumber(pokemon);
    return dex !== null && String(dex).startsWith(String(Number(q)));
  }
  return (
    foldSearch(displayNameWithForm(pokemon, lang)).includes(q) ||
    foldSearch(displayNameWithForm(pokemon, "en")).includes(q)
  );
}
