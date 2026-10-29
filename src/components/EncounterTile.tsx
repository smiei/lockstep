"use client";

import type { EncounterView } from "@/lib/types";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { TypeBadge } from "@/components/TypeBadge";
import { PokemonSprite } from "@/components/PokemonSprite";
import { usePokemonDetail } from "@/components/PokemonDetailProvider";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import { SparkleIcon } from "@/components/ActionIcons";

// One Pokémon's display inside a team tray or a Box entry: sprite, name,
// types, player/route/static line, rank·BST, plus any extra controls
// (evolve/revert buttons via `children`). Caught/killed status is deliberately
// not shown - the tray's dead styling communicates it.
//
// `specimen` is the Team drawer's upright layout: the sprite on top as the
// specimen, everything centred under it, so two catches of one route stand
// side by side in their tray. `compact` is the Box column's: one dense row -
// a small sprite, the text, and the controls beside it. `row` is the plain
// sprite-beside-text layout.
export function EncounterTile({
  encounter,
  isDead,
  isClassic,
  showRoute = false,
  variant = "row",
  lang,
  children,
}: {
  encounter: EncounterView;
  isDead: boolean;
  isClassic: boolean;
  // Infinite Fusion: the card spans several routes (a fusion group), so each
  // tile says which route its Pokémon came from.
  showRoute?: boolean;
  variant?: "row" | "compact" | "specimen";
  lang: Lang;
  children?: React.ReactNode;
}) {
  const t = translations[lang];
  const detail = usePokemonDetail();
  const playerLabel = usePlayerLabel();
  const specimen = variant === "specimen";
  const compact = variant === "compact";
  const infoParts = [
    ...(!isClassic ? [playerLabel(encounter.player)] : []),
    ...(showRoute ? [encounter.routeName] : []),
    ...(encounter.isStatic ? [t.links.staticTag] : []),
  ];
  // A level evolution within the current cap, said in words - the green
  // Entwickeln button alone was easy to miss.
  const ready = isDead ? [] : encounter.evolvesTo.filter((target) => target.available);
  const bodyId = encounter.body?.pokemonId ?? null;
  const spriteSize = specimen ? "lg" : compact ? "base" : "xl";
  const sprite = (
    <PokemonSprite
      pokemonId={encounter.pokemonId}
      bodyId={bodyId}
      name={encounter.pokemonName}
      size={spriteSize}
      // A dead Pokémon fades its picture only; the text stays readable.
      className={isDead ? "opacity-50 grayscale" : undefined}
    />
  );
  const spriteSlot = detail ? (
    <button
      type="button"
      // A fusion opens the fused sheet, not just its head.
      onClick={() => detail.open(encounter.pokemonId, bodyId)}
      title={encounter.pokemonName}
      aria-label={encounter.pokemonName}
      className="shrink-0 cursor-pointer rounded transition-opacity hover:opacity-80"
    >
      {sprite}
    </button>
  ) : (
    <div className="shrink-0">{sprite}</div>
  );

  // A dead Pokémon strikes its name through; the text itself stays readable.
  const name = (
    <span
      className={`max-w-full font-semibold ${specimen ? "text-base leading-tight" : ""} ${
        isDead ? "text-ink-muted line-through" : "text-ink"
      }`}
    >
      {encounter.shiny && (
        <span className="mr-1 inline-flex align-[-2px] text-warning" title="Shiny">
          <SparkleIcon className="h-4 w-4" />
          <span className="sr-only">Shiny</span>
        </span>
      )}
      {encounter.nickname ?? encounter.pokemonName}
      {encounter.nickname && !specimen && (
        <span className="ml-1.5 text-xs font-normal text-ink-subtle">({encounter.pokemonName})</span>
      )}
    </span>
  );
  const types = encounter.types.map((type) => <TypeBadge key={type} type={type} lang={lang} />);
  // A label never parts from its figure: the space before a number ("Rang
  // #379", "BST 200") is a no-break space, so a wrap only falls between pairs.
  const summaryText = (
    encounter.body
      ? t.links.fusionSummary(encounter.summe)
      : t.links.rankSummary(encounter.rang, encounter.summe)
  ).replace(/ (?=[#\d])/g, " ");
  const summary = (
    <span className={`font-mono text-xs tabular-nums text-ink-subtle ${specimen ? "text-balance" : ""}`}>
      {summaryText}
    </span>
  );
  const readyLine = ready.length > 0 && (
    <span className="text-xs font-semibold text-success">
      {t.links.evolveReady(ready.map((target) => target.name).join(" / "))}
    </span>
  );
  const info = infoParts.length > 0 && (
    <span className="text-xs text-ink-subtle">{infoParts.join(" · ")}</span>
  );

  if (compact) {
    // Three lines at most: name with its types (and "static"), then
    // player · rank · BST, then the readiness line when there is one.
    // Every "·" is glued to the pair after it with a no-break space, so a wrap
    // starts a line with the separator instead of leaving it hanging.
    const rowInfo = [
      ...(!isClassic ? [playerLabel(encounter.player)] : []),
      ...(showRoute ? [encounter.routeName] : []),
    ];
    const lead = rowInfo.length > 0 ? `${rowInfo.join(" · ")} · ` : "";
    return (
      <div className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-1">
        {spriteSlot}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {name}
            {types}
            {encounter.isStatic && <span className="text-xs text-ink-subtle">{t.links.staticTag}</span>}
          </div>
          {/* The player in the interface face, the figures in the label's
              mono - the narrower mix keeps the line on one row beside the
              button at desktop widths. */}
          <span className="text-xs text-ink-subtle">
            {lead}
            <span className="font-mono tabular-nums">{summaryText.replace(/ · /g, " · ")}</span>
          </span>
          {readyLine}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    );
  }

  return (
    <div
      className={
        specimen
          ? "flex w-full min-w-0 flex-col items-center gap-1 text-center"
          : "flex w-full items-center gap-3"
      }
    >
      {spriteSlot}
      <div
        className={`flex min-w-0 flex-col gap-1 ${specimen ? "w-full items-center" : "items-start text-left"}`}
      >
        {name}
        {encounter.nickname && specimen && (
          <span className="-mt-1 max-w-full truncate text-xs text-ink-subtle">
            {encounter.pokemonName}
          </span>
        )}
        <div className={`flex flex-wrap gap-1 ${specimen ? "justify-center" : ""}`}>{types}</div>
        {info}
        {summary}
        {/* In the drawer the readiness line goes under the buttons: above
            them it pushed one specimen's buttons below its neighbour's. */}
        {!specimen && readyLine}
        {children}
        {specimen && readyLine}
      </div>
    </div>
  );
}
