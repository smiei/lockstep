"use client";

import type { Player } from "@/generated/prisma/enums";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { catchRate, type PlayerCounts, type TeamSnapshotMember } from "@/lib/runStats";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import { PokemonSprite } from "@/components/PokemonSprite";
import { TrainerSprite } from "@/components/TrainerSprite";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageHeader, Section } from "@/components/ui/Page";

// One fight of the run and the stretch of the Journey up to it.
export type StatsFight = {
  key: string;
  // The fight the stretch runs up to; null = after the last fight.
  trainer: string | null;
  // TrainerSprite's slug source (cap.sprite ?? names.de).
  sprite: string | null;
  place: string | null;
  wonOn: string | null;
  open: boolean;
  perPlayer: { player: Player; counts: PlayerCounts }[];
  unattributedDeaths: number;
  // The player's own team that won it; null = not won, or won before 6.0.
  team: (TeamSnapshotMember & { name: string })[] | null;
};

export type StatsOutcome = { kind: "won" | "lost" | "running"; date: string | null };

// The three figures' signs, drawn like NavIcon (24 viewBox, 1.75 stroke): a
// catch is a plus in a ring, a miss an arrow that gets away, a death a
// headstone (the Memorial's); the awards add a crown and a shield.
const ICONS = {
  caught: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8v8M8 12h8",
  missed: "M4 12h11M11 7l5 5-5 5M19 5v14",
  deaths: "M7 21V10a5 5 0 0 1 10 0v11M5 21h14M12 9v5M10 11h4",
  crown: "M4 18h16M5 18l-1-10 5 4 3-6 3 6 5-4-1 10",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z",
} as const;
type Figure = "caught" | "missed" | "deaths";
const FIGURES: Figure[] = ["caught", "missed", "deaths"];
// Text tokens for numbers (DESIGN.md's Text Token Rule): green caught, amber
// missed, red death; a zero stays quiet.
const TONE: Record<Figure, string> = { caught: "text-success", missed: "text-warning", deaths: "text-danger" };

function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

// Catches piling up along the Journey, one point per fight, deaths as red
// dots on the line - the game-over timeline, per player.
function CatchCurve({ fights, player, label }: { fights: StatsFight[]; player: Player; label: string }) {
  const W = 400;
  const H = 120;
  const base = H - 12;
  const perFight = fights.map((fight) => fight.perPlayer.find((row) => row.player === player)?.counts);
  const points = perFight.map((counts, index) => ({
    index,
    // Running total: every catch up to and including this stretch.
    caught: perFight.slice(0, index + 1).reduce((sum, c) => sum + (c?.caught ?? 0), 0),
    deaths: counts?.deaths ?? 0,
  }));
  const top = Math.max(4, points[points.length - 1]?.caught ?? 0);
  const x = (i: number) => (points.length < 2 ? W / 2 : 10 + (i * (W - 40)) / (points.length - 1));
  // Headroom above the highest point for its figure (and a death dot).
  const y = (v: number) => base - (v * (base - 32)) / top;
  const line = points.map((p, k) => `${k ? "L" : "M"}${x(p.index).toFixed(1)},${y(p.caught).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      <line x1="0" x2={W} y1={base} y2={base} className="stroke-line" strokeWidth="1" />
      {points.length > 1 && (
        <>
          <path d={`${line} L${x(last.index)},${base} L${x(0)},${base} Z`} className="fill-success-bg" />
          <path d={line} fill="none" className="stroke-success-solid" strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      {points.map((p) => (
        <line key={`t${p.index}`} x1={x(p.index)} x2={x(p.index)} y1={base} y2={base + 4} className="stroke-line-strong" />
      ))}
      {points.map(
        (p) =>
          p.deaths > 0 && (
            <g key={`d${p.index}`}>
              <line x1={x(p.index)} x2={x(p.index)} y1={y(p.caught)} y2={base} className="stroke-danger-solid" strokeDasharray="2 3" />
              <circle cx={x(p.index)} cy={y(p.caught)} r={p.deaths > 1 ? 7 : 5} className="fill-danger-solid" />
              {p.deaths > 1 && (
                <text x={x(p.index)} y={y(p.caught) + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" className="fill-white font-mono">
                  {p.deaths}
                </text>
              )}
            </g>
          ),
      )}
      {last && (
        // Above the last point, clear of a death dot sitting on it.
        <text x={x(last.index)} y={y(last.caught) - (last.deaths > 0 ? 12 : 8)} textAnchor="middle" fontSize="13" fontWeight="600" className="fill-ink font-mono">
          {last.caught}
        </text>
      )}
    </svg>
  );
}

// The statistics page as a game-over screen: how the run stands, each
// player's score with their catches along the Journey, who earned which
// award, and the hall of fame - every fight with the team that won it and
// what each player caught, missed and lost on the way there.
export function StatsView({
  lang,
  runKey,
  runName,
  gameName,
  outcome,
  fightsWon,
  fightsTotal,
  players,
  totals,
  fights,
  unplacedDeaths,
  trainerSet,
}: {
  lang: Lang;
  runKey: string;
  runName: string;
  gameName: string;
  outcome: StatsOutcome;
  fightsWon: number;
  fightsTotal: number;
  players: Player[];
  totals: { player: Player; counts: PlayerCounts }[];
  // In Journey order.
  fights: StatsFight[];
  unplacedDeaths: number;
  // Folder under public/trainers/ for game-specific avatars.
  trainerSet: string;
}) {
  const t = translations[lang].stats;
  const playerLabel = usePlayerLabel();
  const solo = players.length < 2;
  const anything = totals.some(({ counts }) => counts.caught + counts.missed + counts.deaths > 0) || fightsWon > 0;

  const outcomeWord = { won: t.outcomeWon, lost: t.outcomeLost, running: t.outcomeRunning }[outcome.kind];
  const outcomeLine = outcome.date
    ? { won: t.wonAt, lost: t.lostAt, running: t.since }[outcome.kind](outcome.date)
    : null;

  // Awards, SoulLink only: the best of each figure, shared on a tie.
  const winners = (value: (c: PlayerCounts) => number | null, lowest = false) => {
    const scored = totals.flatMap(({ player, counts }) => {
      const v = value(counts);
      return v === null ? [] : [{ player, v }];
    });
    if (scored.length === 0) return [];
    const target = lowest ? Math.min(...scored.map((s) => s.v)) : Math.max(...scored.map((s) => s.v));
    return scored.filter((s) => s.v === target).map((s) => s.player);
  };
  const mostCaught = winners((c) => (c.caught > 0 ? c.caught : null));
  const awards = solo || !anything
    ? []
    : [
        { icon: "crown" as const, title: t.awardCatches, note: t.awardCatchesNote, who: mostCaught },
        { icon: "shield" as const, title: t.awardSurvivor, note: t.awardSurvivorNote, who: winners((c) => c.deaths, true) },
        { icon: "caught" as const, title: t.awardRate, note: t.awardRateNote, who: winners((c) => catchRate(c)) },
      ].filter((award) => award.who.length > 0);

  return (
    <div>
      <PageHeader title={t.heading}>
        <ButtonLink size="sm" href={`/overview?run=${runKey}`}>
          {translations[lang].nav.overview}
        </ButtonLink>
      </PageHeader>

      {/* The verdict, on the shell's own field (`.shell` re-points the ink
          tokens, so every shell colour keeps its contrast). */}
      <section className="shell mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-md bg-shell px-5 py-6 sm:px-8 sm:py-8">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-muted">
            {runName} · {gameName}
          </p>
          <h2 className="flex items-center gap-3 text-5xl font-bold leading-tight tracking-tight text-ink sm:text-6xl">
            {/* A won run wears the crown of the start page's hall of fame,
                a lost one the Memorial's headstone. */}
            {outcome.kind !== "running" && (
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${
                  outcome.kind === "won" ? "bg-gold-solid text-eff-on-light" : "bg-danger-solid text-danger-solid-ink"
                }`}
              >
                <Icon name={outcome.kind === "won" ? "crown" : "deaths"} className="h-7 w-7 sm:h-8 sm:w-8" />
              </span>
            )}
            {outcomeWord}
          </h2>
          {outcomeLine && <p className="mt-1 text-sm text-ink-muted">{outcomeLine}</p>}
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold leading-none tabular-nums text-ink">
            <span className="text-5xl">{fightsWon}</span>
            <span className="text-2xl text-ink-muted"> / {fightsTotal}</span>
          </p>
          <p className="mt-1.5 text-sm text-ink-muted">{t.fightsWon}</p>
        </div>
      </section>

      <p className="mb-6 max-w-prose text-sm text-ink-muted">{t.intro}</p>

      {!anything ? (
        <EmptyState title={t.empty} />
      ) : (
        <>
          {/* The score, one card per player. */}
          <ul className={`mb-6 grid gap-2.5 ${solo ? "" : "lg:grid-cols-2"}`}>
            {totals.map(({ player, counts }) => {
              const rate = catchRate(counts);
              const name = solo ? t.totals : playerLabel(player);
              return (
                <li key={player} className={`grid gap-5 rounded-md border border-line bg-panel p-4 sm:p-6 ${solo ? "lg:grid-cols-2 lg:items-center lg:gap-10" : ""}`}>
                  <div className="flex flex-col gap-5">
                    <h3 className="text-2xl font-bold tracking-tight text-ink">{name}</h3>
                    <dl className="grid grid-cols-3 gap-3">
                      {FIGURES.map((figure) => (
                        <div key={figure} className="flex min-w-0 flex-col-reverse gap-1.5">
                          <dt className="flex min-w-0 items-center gap-1 text-xs text-ink-muted" title={figure === "missed" ? t.missedHint : undefined}>
                            <Icon name={figure} className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 truncate">{t[figure]}</span>
                          </dt>
                          <dd className={`font-mono text-5xl font-semibold leading-none tabular-nums ${counts[figure] === 0 ? "text-ink-subtle" : TONE[figure]}`}>
                            {counts[figure]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div>
                      <div className="flex items-baseline justify-between gap-2 text-xs text-ink-muted">
                        <span>{t.rate}</span>
                        <span className="font-mono text-lg font-semibold tabular-nums text-ink">{rate === null ? "–" : `${rate} %`}</span>
                      </div>
                      {/* Caught and not caught, side by side. */}
                      <div className="mt-1.5 flex h-2.5 gap-px overflow-hidden rounded-sm bg-sunken" aria-hidden="true">
                        {rate !== null && <span className="bg-success-solid" style={{ width: `${rate}%` }} />}
                        {rate !== null && rate < 100 && <span className="flex-1 bg-warning-solid" />}
                      </div>
                    </div>
                  </div>
                  <figure className="min-w-0">
                    <figcaption className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs text-ink-muted">
                      <span>{t.chart}</span>
                      <span>{t.chartHint}</span>
                    </figcaption>
                    <CatchCurve fights={fights} player={player} label={t.chartAria(name)} />
                  </figure>
                </li>
              );
            })}
          </ul>
          {unplacedDeaths > 0 && <p className="-mt-4 mb-6 text-xs text-ink-muted">{t.unplaced(unplacedDeaths)}</p>}

          {awards.length > 0 && (
            <Section title={t.awards}>
              <ul className="grid gap-2.5 md:grid-cols-3">
                {awards.map((award) => (
                  <li key={award.title} className="flex items-center gap-3 rounded-md border border-gold-line bg-gold-bg p-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-solid text-eff-on-light">
                      <Icon name={award.icon} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-bold tracking-tight text-ink">{award.title}</p>
                      <p className="text-sm text-ink-muted">
                        <span className="font-semibold text-gold">{award.who.map(playerLabel).join(" & ")}</span> · {award.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title={t.hall}>
            <p className="-mt-1 mb-3 max-w-prose text-xs text-ink-muted">{t.hallHint}</p>
            <ol className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
              {fights.map((fight) => {
                const won = fight.wonOn !== null;
                return (
                  <li
                    key={fight.key}
                    className={`flex flex-col gap-3 rounded-md border bg-panel p-3 ${won ? "border-line" : "border-dashed border-line-strong"}`}
                  >
                    <div className="flex items-center gap-3">
                      {fight.sprite && (
                        <span className={`shrink-0 ${won ? "" : "opacity-60"}`}>
                          <TrainerSprite canonicalName={fight.sprite} displayName={fight.trainer ?? ""} trainerSet={trainerSet} size={48} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold tracking-tight text-ink">{fight.trainer ?? t.endSegment}</h3>
                        {fight.place && <p className="truncate text-xs text-ink-muted">{fight.place}</p>}
                      </div>
                      <span className={`shrink-0 font-mono text-xs tabular-nums ${won ? "text-success" : "text-ink-muted"}`}>
                        {fight.wonOn ?? (fight.open ? t.open : "")}
                      </span>
                    </div>
                    {won && (
                      fight.team && fight.team.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {players.map((player) => {
                            const members = fight.team!.filter((m) => m.player === player);
                            if (members.length === 0) return null;
                            return (
                              <div key={player} className="flex min-w-0 items-center gap-1">
                                {!solo && <span className="w-14 shrink-0 truncate text-xs font-semibold text-ink-muted">{playerLabel(player)}</span>}
                                <span className="flex min-w-0 flex-wrap">
                                  {members.map((m, i) => (
                                    <PokemonSprite key={`${m.routeId}-${i}`} pokemonId={m.pokemonId} bodyId={m.bodyPokemonId} name={m.name} size="sm" className="h-9 w-9" />
                                  ))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-muted">{t.noTeam}</p>
                      )
                    )}
                    {/* What each player caught, missed and lost on the way. */}
                    <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-2">
                      {fight.perPlayer.map(({ player, counts }) => (
                        <div key={player} className="flex items-center gap-2">
                          {!solo && <span className="text-xs font-semibold text-ink-muted">{playerLabel(player)}</span>}
                          <dl className="flex gap-2.5">
                            {FIGURES.map((figure) => (
                              <div key={figure} className={`flex items-center gap-0.5 ${counts[figure] === 0 ? "text-ink-subtle" : TONE[figure]}`}>
                                <dt>
                                  <Icon name={figure} className="h-3.5 w-3.5" />
                                  <span className="sr-only">{t[figure]}</span>
                                </dt>
                                <dd className="font-mono text-sm font-semibold tabular-nums">{counts[figure]}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))}
                      {fight.unattributedDeaths > 0 && (
                        <span className="text-xs text-danger">{t.unattributed(fight.unattributedDeaths)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        </>
      )}
    </div>
  );
}
