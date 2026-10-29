"use client";

import { useId, useState, type ReactNode } from "react";
import { Player, RunMode } from "@/generated/prisma/enums";
import type { EffectivenessTable } from "@/lib/effectiveness";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import type { LocalizedNames } from "@/lib/i18n/localize";
import { localizeName } from "@/lib/i18n/localize";
import type { ProgressStats } from "@/lib/progress";
import { TeamWeaknessesView, type TeamMember } from "@/components/TeamWeaknessesView";
import { BlindflugNotice, useBlindflug } from "@/components/BlindflugProvider";
import { TypeBadge } from "@/components/TypeBadge";
import { PokemonSprite } from "@/components/PokemonSprite";
import { ProgressBar } from "@/components/ProgressBar";
import { BadgeIcon } from "@/components/BadgeIcon";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import { usePokemonDetail } from "@/components/PokemonDetailProvider";
import { DeathPointPicker, type DeathPointOption } from "@/components/DeathPointPicker";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader, Section } from "@/components/ui/Page";
import { LabelRow, SpecimenLabel } from "@/components/ui/SpecimenLabel";

export type OverviewStats = {
  perPlayer: {
    player: Player;
    caught: number;
    bankSumme: number;
    bankSummeMax: number;
    teamSumme: number;
    teamSummeMax: number;
  }[];
  totalDeaths: number;
  teamSumme: number;
  teamSummeMax: number;
  capCurrent: number | null;
  capNext: number | null;
  // The fight the next cap belongs to - the run sheet's headline.
  nextCap: { names: LocalizedNames; location: LocalizedNames } | null;
};

// One count per player of the run, in player order.
export type OverviewDeathTally = { byPlayer: { player: Player; count: number }[]; unattributed: number };

export type OverviewBadge = { id: number; badge: LocalizedNames; defeated: boolean };

export type OverviewMemorialEntry = {
  soulLinkId: number;
  routeName: string;
  // name = nickname when set (else species); species carries the species name
  // in parentheses when a nickname is shown. Infinite Fusion: bodyId is set
  // for a fusion, whose name/species are then "Head / Body".
  pokemon: { id: number; bodyId: number | null; name: string; species: string | null }[];
  deathPlayer: Player | null;
  deathCause: string | null;
  // Journey milestone the run had reached when this died, plus its label.
  deathLevelCapId: number | null;
  deathPointLabel: string | null;
  // false = predates death-point tracking; those sort first and invite an edit.
  recorded: boolean;
  sortIndex: number;
  diedAt: number | null;
};

// A card heading with an "i" that folds an explanation out underneath. The
// explanation used to sit in a `title` on a plain <span>: hover only, so a
// phone or a keyboard never reached it, and the "i" was read out as part of
// the heading.
function InfoHeading({
  title,
  info,
  toggleLabel,
}: {
  title: ReactNode;
  info: string;
  toggleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const infoId = useId();
  return (
    <>
      <div className="mb-2 flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={infoId}
          aria-label={toggleLabel}
          title={info}
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-serif text-xs italic transition-colors ${
            open ? "border-ink-muted bg-hover text-ink" : "border-line-strong text-ink-muted hover:bg-hover hover:text-ink"
          }`}
        >
          <span aria-hidden="true">i</span>
        </button>
      </div>
      <p id={infoId} hidden={!open} className="mb-2 text-xs text-ink-muted">
        {info}
      </p>
    </>
  );
}

export function OverviewView({
  runKey,
  lang,
  mode,
  teams,
  table,
  attackTypes,
  offensiveGaps,
  coverageLevel,
  stats,
  deathTally,
  memorial,
  routeProgress,
  levelCapProgress,
  levelCapMarkerAt,
  badges,
  deathPointOptions,
  hasMoveData = true,
}: {
  runKey: string;
  lang: Lang;
  mode: RunMode;
  teams: { player: Player; members: TeamMember[] }[];
  table: EffectivenessTable;
  attackTypes: string[];
  offensiveGaps: { player: Player; gaps: string[] }[];
  coverageLevel: number;
  stats: OverviewStats;
  deathTally: OverviewDeathTally | null;
  memorial: OverviewMemorialEntry[];
  routeProgress: ProgressStats;
  levelCapProgress: ProgressStats;
  levelCapMarkerAt: number | null;
  badges: OverviewBadge[];
  deathPointOptions: DeathPointOption[];
  // False for a game pack without learnset data (Infinite Fusion): every
  // type would otherwise read as an offensive gap.
  hasMoveData?: boolean;
}) {
  const t = translations[lang].overview;
  const blindflug = useBlindflug();
  const tLinks = translations[lang].links;
  const playerLabel = usePlayerLabel();
  const detail = usePokemonDetail();
  const isClassic = mode === RunMode.CLASSIC;

  const sum = (pick: (row: OverviewStats["perPlayer"][number]) => number) =>
    stats.perPlayer.reduce((acc, row) => acc + pick(row), 0);
  const totalCaught = sum((r) => r.caught);
  const bankSumme = sum((r) => r.bankSumme);
  const bankSummeMax = sum((r) => r.bankSummeMax);

  const tHeader = translations[lang].header;
  // "now → max"; below sm the "→ max" half drops to a second line inside the
  // cell, which is what keeps three columns of ranges inside a phone's width.
  const range = (now: number, max: number): ReactNode =>
    max > now ? (
      <>
        {now}
        <span className="block sm:inline"> → {max}</span>
      </>
    ) : (
      String(now)
    );
  const deathsOf = (player: Player) =>
    deathTally?.byPlayer.find((entry) => entry.player === player)?.count ?? 0;
  // The run sheet's table: one row per figure, one column per player plus the
  // total (a solo run shows only the total). Figures are strings so a "now →
  // max" range and a count share one cell shape. `alarm` = a death count,
  // shown in the label red once it is above zero.
  const sheetRows: { label: string; hint?: string; perPlayer: ReactNode[]; total: ReactNode; alarm?: boolean }[] = [
    {
      label: t.caughtTotal,
      perPlayer: stats.perPlayer.map((r) => String(r.caught)),
      total: String(totalCaught),
    },
    {
      label: t.totalDeaths,
      perPlayer: stats.perPlayer.map((r) => String(deathsOf(r.player))),
      total: String(stats.totalDeaths),
      alarm: true,
    },
    {
      label: t.teamBst,
      hint: t.teamBstColHint,
      perPlayer: stats.perPlayer.map((r) => range(r.teamSumme, r.teamSummeMax)),
      total: range(stats.teamSumme, stats.teamSummeMax),
    },
    {
      label: t.bankBst,
      hint: t.bankBstColHint,
      perPlayer: stats.perPlayer.map((r) => range(r.bankSumme, r.bankSummeMax)),
      total: range(bankSumme, bankSummeMax),
    },
  ];

  // Nothing caught and nobody lost: the table would be a wall of zeros and the
  // coverage sections empty frames. Say what to do instead.
  const isFreshRun = totalCaught === 0 && stats.totalDeaths === 0;

  return (
    <div>
      <PageHeader title={t.heading} />

      {/* The run sheet: one panel instead of a progress section, five loose
          tiles and a badge row further down. Top: the next level cap - the
          number checked before every gym - beside progress and badges. Below:
          the run's figures as a table, one column per player and a total, so
          the comparison reads across a row instead of between tiles. */}
      <section aria-label={t.dashboard} className="mb-8 overflow-hidden rounded-md border border-line bg-panel">
        <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">{tHeader.nextCap}</p>
            {stats.nextCap && stats.capNext !== null ? (
              <div className="mt-1 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-bold tracking-tight text-ink">
                    {localizeName(stats.nextCap.names, lang)}
                  </p>
                  <p className="truncate text-sm text-ink-muted">
                    {localizeName(stats.nextCap.location, lang)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-5xl font-semibold leading-none tabular-nums text-ink">
                    {stats.capNext}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{t.sheetTeamUpTo(stats.capNext - 2)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-lg font-bold text-ink">{tHeader.allCapsDone}</p>
            )}
            {stats.capCurrent !== null && (
              <p className="mt-3 font-mono text-xs tabular-nums text-ink-subtle">
                {t.sheetLastCap(stats.capCurrent, stats.capCurrent - 2)}
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-x-10">
              <div>
                <div className="mb-1 text-xs font-medium text-ink-muted">{t.encounterProgress}</div>
                <ProgressBar
                  size="md"
                  done={routeProgress.done}
                  total={routeProgress.total}
                  percent={routeProgress.percent}
                />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-ink-muted">{t.battleProgress}</div>
                <ProgressBar
                  size="md"
                  done={levelCapProgress.done}
                  total={levelCapProgress.total}
                  percent={levelCapProgress.percent}
                  markerAt={levelCapMarkerAt ?? undefined}
                  markerTitle={translations[lang].levelcaps.eliteFourMarker}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline gap-3 text-xs font-medium text-ink-muted">
                <span>{t.badgesHeading}</span>
                {badges.length > 0 && (
                  <span className="font-mono tabular-nums">
                    {badges.filter((b) => b.defeated).length} / {badges.length}
                  </span>
                )}
              </div>
              {badges.length === 0 ? (
                <p className="text-sm text-ink-muted">{t.badgesEmpty}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <BadgeIcon
                      key={b.id}
                      nameEn={b.badge.en}
                      label={localizeName(b.badge, lang)}
                      earned={b.defeated}
                      size={32}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!isFreshRun && (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-sm">
              {!isClassic && (
                <thead>
                  <tr className="bg-sunken text-left">
                    <th scope="col" className="px-3 py-2 sm:px-5">
                      <span className="sr-only">{t.dashboard}</span>
                    </th>
                    {stats.perPlayer.map((row) => (
                      <th key={row.player} scope="col" className="px-2 py-2 text-right text-xs font-semibold text-ink sm:px-4 sm:text-sm">
                        {playerLabel(row.player)}
                      </th>
                    ))}
                    <th scope="col" className="py-2 pl-2 pr-3 text-right text-xs font-semibold text-ink sm:px-5 sm:text-sm">
                      {t.sheetTotal}
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-line">
                {sheetRows.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      title={row.hint}
                      className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted sm:whitespace-nowrap sm:px-5 sm:text-sm"
                    >
                      {row.label}
                    </th>
                    {!isClassic &&
                      row.perPlayer.map((value, i) => (
                        <td
                          key={i}
                          className={`whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums sm:px-4 sm:text-sm ${row.alarm && value !== "0" ? "text-danger" : "text-ink"}`}
                        >
                          {value}
                        </td>
                      ))}
                    <td
                      className={`whitespace-nowrap py-2.5 pl-2 pr-3 text-right font-mono text-xs font-semibold tabular-nums sm:px-5 sm:text-sm ${row.alarm && row.total !== "0" ? "text-danger" : "text-ink"}`}
                    >
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deathTally && deathTally.unattributed > 0 && (
              <p className="border-t border-line px-4 py-2 text-xs text-ink-subtle sm:px-5">
                {t.deathTallyUnattributed(deathTally.unattributed)}
              </p>
            )}
          </div>
        )}
      </section>

      {isFreshRun ? (
        <EmptyState title={t.emptyRun} hint={t.emptyRunHint} />
      ) : (
        <>
          {/* Team coverage: defensive (reused) + offensive gaps. The
              heading stays under Blindflug so the tab does not silently
              lose a section - only its contents go. */}
          <Section title={t.coverage}>
            {blindflug ? (
              <BlindflugNotice />
            ) : (
            <>
            <Card className="mb-4">
              <TeamWeaknessesView
                lang={lang}
                mode={mode}
                teams={teams}
                table={table}
                attackTypes={attackTypes}
              />
            </Card>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              {offensiveGaps.map(
                (o) =>
                  teams.find((tm) => tm.player === o.player && tm.members.length > 0) && (
                    <Card key={o.player} className="min-w-[260px] flex-1">
                      <InfoHeading
                        title={
                          <>
                            {t.offensiveGaps}
                            {!isClassic && (
                              <span className="font-normal text-ink-subtle">
                                {" "}
                                · {playerLabel(o.player)}
                              </span>
                            )}
                          </>
                        }
                        info={t.offensiveGapsInfo(coverageLevel)}
                        toggleLabel={t.offensiveGapsInfoToggle}
                      />
                      {!hasMoveData ? (
                        <p className="text-xs text-ink-subtle">
                          {translations[lang].typen.noMoveData}
                        </p>
                      ) : o.gaps.length === 0 ? (
                        <p className="text-sm text-success">{t.noGaps}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {o.gaps.map((ty) => (
                            <span key={ty} className="inline-flex items-center gap-1">
                              <TypeBadge type={ty} lang={lang} />
                            </span>
                          ))}
                        </div>
                      )}
                      {hasMoveData && (
                        <p className="mt-2 text-xs text-ink-subtle">{t.offensiveHint}</p>
                      )}
                    </Card>
                  ),
              )}
            </div>
            </>
            )}
          </Section>
        </>
      )}

      {/* Memorial / graveyard */}
      {/* Each loss is a withdrawn specimen: a plain tray, its Pokémon, and
          the death label under them (SpecimenLabel `dead`, the same one the
          Team tab's Memorial column uses). */}
      <Section title={t.memorial}>
        {memorial.length === 0 ? (
          <p className="text-sm text-ink-muted">{t.memorialEmpty}</p>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {memorial.map((m) => (
              <li
                key={m.soulLinkId}
                className="flex flex-col rounded-sm border border-line bg-panel p-3"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {m.pokemon.map((p, i) => {
                    // Sprite + name together open the Pokédex card, same as
                    // the sprite does on the Team/Encounter tabs.
                    const body = (
                      <>
                        <PokemonSprite
                          pokemonId={p.id}
                          bodyId={p.bodyId}
                          name={p.species ?? p.name}
                          size="md"
                          className="opacity-50 grayscale"
                        />
                        <span className="text-sm font-medium text-ink">
                          {p.name}
                          {p.species && <span className="text-ink-subtle"> ({p.species})</span>}
                        </span>
                      </>
                    );
                    return detail ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => detail.open(p.id, p.bodyId)}
                        title={p.species ?? p.name}
                        className="flex min-h-10 cursor-pointer items-center gap-1 rounded-md transition-opacity hover:opacity-70"
                      >
                        {body}
                      </button>
                    ) : (
                      <span key={i} className="flex items-center gap-1">
                        {body}
                      </span>
                    );
                  })}
                </div>
                <SpecimenLabel dead className="mt-auto">
                  <LabelRow strong left={m.routeName} right={tLinks.dead} />
                  {(m.deathPlayer || m.deathCause) && (
                    <p className="font-medium text-danger">
                      {m.deathPlayer && tLinks.deadBy(playerLabel(m.deathPlayer))}
                      {m.deathPlayer && m.deathCause ? " · " : ""}
                      {m.deathCause}
                    </p>
                  )}
                </SpecimenLabel>
                <div className="mt-2">
                  <DeathPointPicker
                    runKey={runKey}
                    lang={lang}
                    soulLinkId={m.soulLinkId}
                    current={m.deathLevelCapId}
                    recorded={m.recorded}
                    options={deathPointOptions}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
