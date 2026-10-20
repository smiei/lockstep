"use client";

import type { EncounterView } from "@/lib/types";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { TypeBadge } from "@/components/TypeBadge";
import { PokemonSprite } from "@/components/PokemonSprite";
import { usePokemonDetail } from "@/components/PokemonDetailProvider";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import { SparkleIcon } from "@/components/ActionIcons";

// One Pokémon's display inside a link/team card: sprite on the left, the
// description (name, types, player/static line, rank·BST) and any extra
// controls (evolve/revert buttons via `children`) on the right. Shared so the
// Team tiles and the Links list render pixel-identically. Caught/killed
// status is deliberately not shown - the card's dead styling communicates it.
export function EncounterTile({
  encounter,
  isDead,
  isClassic,
  showRoute = false,
  lang,
  children,
}: {
  encounter: EncounterView;
  isDead: boolean;
  isClassic: boolean;
  // Infinite Fusion: the card spans several routes (a fusion group), so each
  // tile says which route its Pokémon came from.
  showRoute?: boolean;
  lang: Lang;
  children?: React.ReactNode;
}) {
  const t = translations[lang];
  const detail = usePokemonDetail();
  const playerLabel = usePlayerLabel();
  const infoParts = [
    ...(!isClassic ? [playerLabel(encounter.player)] : []),
    ...(showRoute ? [encounter.routeName] : []),
    ...(encounter.isStatic ? [t.links.staticTag] : []),
  ];
  const bodyId = encounter.body?.pokemonId ?? null;
  return (
    <div className="flex w-full items-center gap-3">
      {detail ? (
        <button
          type="button"
          // A fusion opens the fused sheet, not just its head.
          onClick={() => detail.open(encounter.pokemonId, bodyId)}
          title={encounter.pokemonName}
          aria-label={encounter.pokemonName}
          className="shrink-0 cursor-pointer rounded transition-opacity hover:opacity-80"
        >
          <PokemonSprite
            pokemonId={encounter.pokemonId}
            bodyId={bodyId}
            name={encounter.pokemonName}
            size="xl"
            className={isDead ? "opacity-50" : undefined}
          />
        </button>
      ) : (
        <PokemonSprite
          pokemonId={encounter.pokemonId}
          bodyId={bodyId}
          name={encounter.pokemonName}
          size="xl"
          className={`shrink-0 ${isDead ? "opacity-50" : ""}`}
        />
      )}
      <div className="flex min-w-0 flex-col items-start gap-1 text-left">
        {/* A dead Pokémon fades its picture and strikes its name through;
            the text itself stays readable. */}
        <span
          className={`font-medium ${isDead ? "text-ink-muted line-through" : "text-ink"}`}
        >
          {encounter.shiny && (
            <span className="mr-1 inline-flex align-[-2px] text-warning" title="Shiny">
              <SparkleIcon className="h-4 w-4" />
              <span className="sr-only">Shiny</span>
            </span>
          )}
          {encounter.nickname ?? encounter.pokemonName}
          {encounter.nickname && (
            <span className="ml-1.5 text-xs font-normal text-ink-subtle">
              ({encounter.pokemonName})
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-1">
          {encounter.types.map((type) => (
            <TypeBadge key={type} type={type} lang={lang} />
          ))}
        </div>
        {infoParts.length > 0 && (
          <span className="text-xs text-ink-subtle">
            {infoParts.join(" · ")}
          </span>
        )}
        <span className="text-xs text-ink-subtle">
          {encounter.body
            ? t.links.fusionSummary(encounter.summe)
            : t.links.rankSummary(encounter.rang, encounter.summe)}
        </span>
        {children}
      </div>
    </div>
  );
}
