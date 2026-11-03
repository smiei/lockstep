"use client";

import type { Lang } from "@/lib/i18n/dictionary";
import { TYPE_LABELS, typeChipStyle } from "@/lib/pokemonTypes";
import { useHideTypes } from "@/components/BlindflugProvider";

// A Pokémon's (or a move's) type as a coloured chip. Gone entirely under the
// "hide Pokémon types too" blind-flight rule; the type chart draws its own
// headers and stays.
export function TypeBadge({ type, lang }: { type: string; lang: Lang }) {
  const hidden = useHideTypes();
  if (hidden) return null;
  return (
    <span
      className="inline-block rounded-sm px-1.5 py-0.5 text-xs font-semibold"
      style={typeChipStyle(type)}
    >
      {TYPE_LABELS[lang][type] ?? type}
    </span>
  );
}
