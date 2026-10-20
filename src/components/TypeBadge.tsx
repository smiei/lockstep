import type { Lang } from "@/lib/i18n/dictionary";
import { TYPE_LABELS, typeChipStyle } from "@/lib/pokemonTypes";

export function TypeBadge({ type, lang }: { type: string; lang: Lang }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-medium"
      style={typeChipStyle(type)}
    >
      {TYPE_LABELS[lang][type] ?? type}
    </span>
  );
}
