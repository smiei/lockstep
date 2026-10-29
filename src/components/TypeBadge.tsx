import type { Lang } from "@/lib/i18n/dictionary";
import { TYPE_LABELS, typeChipStyle } from "@/lib/pokemonTypes";

export function TypeBadge({ type, lang }: { type: string; lang: Lang }) {
  return (
    <span
      className="inline-block rounded-sm px-1.5 py-0.5 text-xs font-semibold"
      style={typeChipStyle(type)}
    >
      {TYPE_LABELS[lang][type] ?? type}
    </span>
  );
}
