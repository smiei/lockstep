import type { Lang } from "@/lib/i18n/dictionary";

export const TYPE_LABELS: Record<Lang, Record<string, string>> = {
  de: {
    normal: "Normal",
    fire: "Feuer",
    water: "Wasser",
    electric: "Elektro",
    grass: "Pflanze",
    ice: "Eis",
    fighting: "Kampf",
    poison: "Gift",
    ground: "Boden",
    flying: "Flug",
    psychic: "Psycho",
    bug: "Käfer",
    rock: "Gestein",
    ghost: "Geist",
    dragon: "Drache",
    dark: "Unlicht",
    steel: "Stahl",
    fairy: "Fee",
    // Curse's pre-Gen-6 type ("???" in-game) - see move-type-history.json.
    unknown: "???",
  },
  en: {
    normal: "Normal",
    fire: "Fire",
    water: "Water",
    electric: "Electric",
    grass: "Grass",
    ice: "Ice",
    fighting: "Fighting",
    poison: "Poison",
    ground: "Ground",
    flying: "Flying",
    psychic: "Psychic",
    bug: "Bug",
    rock: "Rock",
    ghost: "Ghost",
    dragon: "Dragon",
    dark: "Dark",
    steel: "Steel",
    fairy: "Fairy",
    unknown: "???",
  },
  fr: {
    normal: "Normal",
    fire: "Feu",
    water: "Eau",
    electric: "Électrik",
    grass: "Plante",
    ice: "Glace",
    fighting: "Combat",
    poison: "Poison",
    ground: "Sol",
    flying: "Vol",
    psychic: "Psy",
    bug: "Insecte",
    rock: "Roche",
    ghost: "Spectre",
    dragon: "Dragon",
    dark: "Ténèbres",
    steel: "Acier",
    fairy: "Fée",
    unknown: "???",
  },
  es: {
    normal: "Normal",
    fire: "Fuego",
    water: "Agua",
    electric: "Eléctrico",
    grass: "Planta",
    ice: "Hielo",
    fighting: "Lucha",
    poison: "Veneno",
    ground: "Tierra",
    flying: "Volador",
    psychic: "Psíquico",
    bug: "Bicho",
    rock: "Roca",
    ghost: "Fantasma",
    dragon: "Dragón",
    dark: "Siniestro",
    steel: "Acero",
    fairy: "Hada",
    unknown: "???",
  },
  it: {
    normal: "Normale",
    fire: "Fuoco",
    water: "Acqua",
    electric: "Elettro",
    grass: "Erba",
    ice: "Ghiaccio",
    fighting: "Lotta",
    poison: "Veleno",
    ground: "Terra",
    flying: "Volante",
    psychic: "Psico",
    bug: "Coleottero",
    rock: "Roccia",
    ghost: "Spettro",
    dragon: "Drago",
    dark: "Buio",
    steel: "Acciaio",
    fairy: "Folletto",
    unknown: "???",
  },
};

export const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
  // Curse's pre-Gen-6 "???" type - a defunct oddity, not a real battling type.
  unknown: "#68A090",
};

const TYPE_FALLBACK_COLOR = "#666666";
const LIGHT_INK = "#ffffff";
const DARK_INK = "#18181b"; // --ink / --eff-on-light

function relativeLuminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Background + text colour of a type chip. The fills are the series' canonical
// colours, and most of them are light: white text on them measured as low as
// 1.5:1 (Electric). So the text colour is picked per type - white where it
// clears WCAG's 4.5:1 (Fighting, Poison, Ghost, Dragon, Dark), dark ink
// everywhere else - instead of darkening colours players recognise on sight.
export function typeChipStyle(type: string): { backgroundColor: string; color: string } {
  const backgroundColor = TYPE_COLORS[type] ?? TYPE_FALLBACK_COLOR;
  const color = contrastRatio(backgroundColor, LIGHT_INK) >= 4.5 ? LIGHT_INK : DARK_INK;
  return { backgroundColor, color };
}
