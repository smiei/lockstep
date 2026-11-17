"use client";

import type { Player } from "@/generated/prisma/enums";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { catchRate, type PlayerCounts, type TeamSnapshotMember } from "@/lib/runStats";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import { PokemonSprite } from "@/components/PokemonSprite";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader, Section } from "@/components/ui/Page";
import { LabelRow, SpecimenLabel } from "@/components/ui/SpecimenLabel";

export type StatsSegmentRow = {
  key: string;
  // The fight the segment runs up to; null = after the last fight.
  label: string | null;
  wonOn: string | null;
  open: boolean;
  perPlayer: { player: Player; counts: PlayerCounts }[];
  unattributedDeaths: number;
};

export type StatsHallEntry = {
  id: number;
  label: string;
  wonOn: string;
  // null = won before the team was recorded.
  team: (TeamSnapshotMember & { name: string })[] | null;
};

const sumCounts = (rows: { counts: PlayerCounts }[]): PlayerCounts =>
  rows.reduce(
    (acc, { counts }) => ({
      caught: acc.caught + counts.caught,
      missed: acc.missed + counts.missed,
      deaths: acc.deaths + counts.deaths,
    }),
    { caught: 0, missed: 0, deaths: 0 },
  );

// The statistics page: the run's figures per player, the same figures along
// the Journey, and the team each fight was won with.
export function StatsView({
  lang,
  runKey,
  players,
  totals,
  segments,
  unplacedDeaths,
  hall,
}: {
  lang: Lang;
  runKey: string;
  players: Player[];
  totals: { player: Player; counts: PlayerCounts }[];
  segments: StatsSegmentRow[];
  unplacedDeaths: number;
  hall: StatsHallEntry[];
}) {
  const t = translations[lang].stats;
  const playerLabel = usePlayerLabel();
  const solo = players.length < 2;
  const total = sumCounts(totals);
  const isEmpty = total.caught + total.missed + total.deaths === 0;

  // Totals as a sheet: one row per figure, one column per player plus the
  // run's total (a solo run shows only the total).
  const columns = solo ? [{ key: "total", label: t.totals, counts: total }] : [
    ...totals.map(({ player, counts }) => ({ key: player, label: playerLabel(player), counts })),
    { key: "total", label: t.totals, counts: total },
  ];
  const rate = (counts: PlayerCounts) => {
    const value = catchRate(counts);
    return value === null ? "–" : `${value} %`;
  };
  const figures: { label: string; hint?: string; value: (c: PlayerCounts) => string }[] = [
    { label: t.caught, value: (c) => String(c.caught) },
    { label: t.missed, hint: t.missedHint, value: (c) => String(c.missed) },
    { label: t.rate, value: rate },
    { label: t.deaths, value: (c) => String(c.deaths) },
  ];

  return (
    <div>
      <PageHeader title={t.heading}>
        <ButtonLink size="sm" href={`/overview?run=${runKey}`}>
          {translations[lang].nav.overview}
        </ButtonLink>
      </PageHeader>
      <p className="mb-6 max-w-prose text-sm text-ink-muted">{t.intro}</p>

      {isEmpty ? (
        <EmptyState title={t.empty} />
      ) : (
        <>
          <Section title={t.totals}>
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-strong bg-sunken text-left">
                    <th scope="col" className="px-4 py-2 font-semibold text-ink">
                      <span className="sr-only">{t.totals}</span>
                    </th>
                    {columns.map((column) => (
                      <th key={column.key} scope="col" className="px-4 py-2 text-right font-semibold text-ink">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {figures.map((figure) => (
                    <tr key={figure.label}>
                      <th scope="row" className="px-4 py-2 text-left font-medium text-ink">
                        {figure.label}
                        {figure.hint && <span className="block text-xs font-normal text-ink-muted">{figure.hint}</span>}
                      </th>
                      {columns.map((column) => (
                        <td key={column.key} className="whitespace-nowrap px-4 py-2 text-right font-mono tabular-nums text-ink">
                          {figure.value(column.counts)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Section>

          {/* The Journey as rows; per player the three counts. */}
          <Section title={t.timeline}>
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {!solo && (
                    <tr className="bg-sunken text-left">
                      <td />
                      {players.map((player) => (
                        <th
                          key={player}
                          scope="colgroup"
                          colSpan={3}
                          className="border-l border-line px-3 pt-2 text-center font-semibold text-ink"
                        >
                          {playerLabel(player)}
                        </th>
                      ))}
                    </tr>
                  )}
                  <tr className="border-b border-line-strong bg-sunken text-left text-xs text-ink-muted">
                    <th scope="col" className="px-4 py-2 font-semibold">
                      {t.section}
                    </th>
                    {players.map((player) => (
                      <PlayerHeads key={player} t={t} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {segments.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" className="min-w-48 px-4 py-2 text-left font-medium text-ink">
                        {row.label ? t.segment(row.label) : t.endSegment}
                        <span className="block text-xs font-normal text-ink-muted">
                          {row.wonOn ? t.wonOn(row.wonOn) : row.open ? t.open : ""}
                          {row.unattributedDeaths > 0 && ` · ${t.unattributed(row.unattributedDeaths)}`}
                        </span>
                      </th>
                      {row.perPlayer.map(({ player, counts }) => (
                        <PlayerCells key={player} counts={counts} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {unplacedDeaths > 0 && <p className="mt-2 text-xs text-ink-muted">{t.unplaced(unplacedDeaths)}</p>}
          </Section>
        </>
      )}

      <Section title={t.hall}>
        <p className="mb-3 max-w-prose text-xs text-ink-muted">{t.hallHint}</p>
        {hall.length === 0 ? (
          <p className="text-sm text-ink-muted">{t.hallEmpty}</p>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {hall.map((entry) => (
              <li key={entry.id} className="flex flex-col rounded-sm border border-line bg-panel p-3">
                {entry.team === null ? (
                  <p className="py-2 text-sm text-ink-muted">{t.noTeam}</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {players.map((player) => {
                      const members = entry.team!.filter((m) => m.player === player);
                      if (members.length === 0) return null;
                      return (
                        <div key={player} className="flex flex-wrap items-center gap-1">
                          {!solo && (
                            <span className="w-full text-xs font-semibold text-ink-muted">{playerLabel(player)}</span>
                          )}
                          {members.map((m, i) => (
                            <PokemonSprite
                              key={`${m.routeId}-${i}`}
                              pokemonId={m.pokemonId}
                              bodyId={m.bodyPokemonId}
                              name={m.name}
                              size="md"
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                <SpecimenLabel className="mt-auto">
                  <LabelRow strong left={entry.label} />
                  <LabelRow left={t.wonOn(entry.wonOn)} />
                </SpecimenLabel>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function PlayerHeads({ t }: { t: (typeof translations)[Lang]["stats"] }) {
  return (
    <>
      <th scope="col" className="border-l border-line px-3 py-2 text-right font-semibold">
        {t.caught}
      </th>
      <th scope="col" className="px-3 py-2 text-right font-semibold" title={t.missedHint}>
        {t.missed}
      </th>
      <th scope="col" className="px-3 py-2 text-right font-semibold">
        {t.deaths}
      </th>
    </>
  );
}

function PlayerCells({ counts }: { counts: PlayerCounts }) {
  // A zero is quiet, so the rows where something happened stand out.
  const cell = (value: number, tone: string) => (
    <span className={value === 0 ? "text-ink-subtle" : tone}>{value}</span>
  );
  return (
    <>
      <td className="border-l border-line px-3 py-2 text-right font-mono tabular-nums">{cell(counts.caught, "text-ink")}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">{cell(counts.missed, "text-ink")}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">{cell(counts.deaths, "text-danger")}</td>
    </>
  );
}
