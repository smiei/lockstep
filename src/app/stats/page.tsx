import type { Metadata } from "next";
import { getGameOrDefault, getLevelCaps } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { resolveRunId } from "@/lib/runs";
import { getRoutesForRun } from "@/lib/runRoutes";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import { localizeName, pokemonName } from "@/lib/i18n/localize";
import { getPokemonByIdForGame } from "@/lib/gameData";
import { levelCapsInRun } from "@/lib/regions";
import { effectiveDeathCapId } from "@/lib/deathPoint";
import { failedRouteIdsOf, formedLinks, groupSoulLinks } from "@/lib/fusionGroups";
import { computeRunStats, parseTeamSnapshot, type StatsDeath, type StatsEncounter } from "@/lib/runStats";
import { EncounterStatus, LinkStatus } from "@/generated/prisma/client";
import { RunProviders } from "@/components/RunProviders";
import { RunLanding } from "@/components/RunLanding";
import { StatsView, type StatsFight } from "@/components/StatsView";

// The run's statistics (linked from the Overview, not a tab of its own):
// catches, misses and deaths along the Journey, and the team each fight was
// won with. The arithmetic lives in src/lib/runStats.ts.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: translations[await getLang()].stats.heading };
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run } = await searchParams;
  const resolvedRun = await resolveRunId(run);
  if (!resolvedRun) return <RunLanding />;
  const { runId, runKey, mode, players, gameId, settings } = resolvedRun;
  const game = getGameOrDefault(gameId);
  const lang = await getLang();

  const [encounters, progress, routeEntries, links, routes] = await Promise.all([
    prisma.encounter.findMany({ where: { runId } }),
    prisma.levelCapProgress.findMany({ where: { runId } }),
    prisma.routeEntry.findMany({ where: { runId } }),
    prisma.soulLink.findMany({ where: { runId }, include: { encounters: true } }),
    getRoutesForRun(runId, gameId),
  ]);

  // The Journey the run plays (an excluded Kanto is not part of it).
  const caps = levelCapsInRun(getLevelCaps(gameId), settings);
  const progressById = new Map(progress.map((row) => [row.levelCapId, row]));
  const statsCaps = caps.map((cap) => {
    const row = progressById.get(cap.id);
    return { id: cap.id, defeatedAt: row?.defeated ? (row.defeatedAt ?? row.updatedAt).getTime() : null };
  });

  // Encounters on places, not on the hidden slots of free-team members and
  // fusion bodies. A route's time is when it was first entered.
  const hiddenRouteIds = new Set(routes.filter((route) => route.hidden).map((route) => route.id));
  const seenAt = new Map(routeEntries.map((entry) => [entry.routeId, entry.seenAt.getTime()]));
  const statsEncounters: StatsEncounter[] = encounters
    .filter((e) => !hiddenRouteIds.has(e.routeId) && !e.isFusionBody)
    .map((e) => ({
      player: e.player,
      at: seenAt.get(e.routeId) ?? e.createdAt.getTime(),
      caught: e.status === EncounterStatus.CAUGHT,
    }));

  // Deaths as the Memorial counts them: one per fusion group of formed links.
  const runCapIds = caps.map((cap) => cap.id);
  const deadLinks = formedLinks(links, failedRouteIdsOf(mode, encounters)).filter(
    (link) => link.status === LinkStatus.DEAD,
  );
  const deadById = new Map(deadLinks.map((link) => [link.id, link]));
  const deaths: StatsDeath[] = groupSoulLinks(
    deadLinks.map((link) => link.id),
    deadLinks.flatMap((link) => link.encounters),
    deadLinks,
  ).map((group) => {
    const first = deadById.get(group[0])!;
    const recorded = first.diedAt !== null;
    return {
      player: first.deathPlayer,
      capId: recorded ? effectiveDeathCapId(first, runCapIds) : null,
      recorded,
      at: first.diedAt?.getTime() ?? null,
    };
  });

  const stats = computeRunStats({ caps: statsCaps, players, encounters: statsEncounters, deaths });

  const capById = new Map(caps.map((cap) => [cap.id, cap]));
  const dateOf = (ms: number) => new Date(ms).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });

  // The run's fights for the page, in Journey order: every stretch up to the
  // fight the run is at, plus any later one that already has something in it
  // or was won (fights can be won out of order), each with the team that won it.
  const currentIndex = statsCaps.findIndex((cap) => cap.defeatedAt === null);
  const fights: StatsFight[] = stats.segments.flatMap((segment, index) => {
    const cap = segment.key === "end" ? null : capById.get(segment.key)!;
    const defeatedAt = cap ? (statsCaps[index]?.defeatedAt ?? null) : null;
    const hasData =
      segment.unattributedDeaths > 0 ||
      segment.perPlayer.some(({ counts }) => counts.caught + counts.missed + counts.deaths > 0);
    const reached = segment.key === "end" ? currentIndex === -1 : currentIndex === -1 || index <= currentIndex;
    if (!reached && !hasData && defeatedAt === null) return [];
    const row = cap ? progressById.get(cap.id) : undefined;
    return [
      {
        key: String(segment.key),
        trainer: cap ? localizeName(cap.names, lang) : null,
        sprite: cap ? (cap.sprite ?? cap.names.de) : null,
        place: cap ? localizeName(cap.location, lang) : null,
        wonOn: defeatedAt !== null ? dateOf(defeatedAt) : null,
        approx: defeatedAt !== null && !row?.defeatedAt,
        badge: cap?.badge ? { en: cap.badge.en, label: localizeName(cap.badge, lang) } : null,
        open: cap !== null && defeatedAt === null,
        perPlayer: segment.perPlayer,
        unattributedDeaths: segment.unattributedDeaths,
        team:
          defeatedAt !== null
            ? (parseTeamSnapshot(row?.teamJson)?.map((member) => {
                const pokemon = getPokemonByIdForGame(game, member.pokemonId);
                const species = pokemon ? pokemonName(pokemon, lang) : `#${member.pokemonId}`;
                return { ...member, name: settings.nicknames && member.nickname ? `${member.nickname} (${species})` : species };
              }) ?? null)
            : null,
      },
    ];
  });

  // The banner: won, lost or still on the road, and since when.
  const runRow = await prisma.run.findUnique({
    where: { id: runId },
    select: { name: true, createdAt: true, wonAt: true, lostAt: true },
  });
  const outcome = runRow?.wonAt
    ? { kind: "won" as const, date: dateOf(runRow.wonAt.getTime()) }
    : runRow?.lostAt
      ? { kind: "lost" as const, date: dateOf(runRow.lostAt.getTime()) }
      : { kind: "running" as const, date: runRow ? dateOf(runRow.createdAt.getTime()) : null };

  return (
    <RunProviders run={resolvedRun} game={game} lang={lang}>
      <StatsView
        lang={lang}
        runKey={runKey}
        runName={runRow?.name ?? ""}
        gameName={localizeName(game.names, lang)}
        outcome={outcome}
        fightsWon={statsCaps.filter((cap) => cap.defeatedAt !== null).length}
        fightsTotal={statsCaps.length}
        players={players}
        totals={stats.totals}
        fights={fights}
        unplacedDeaths={stats.unplacedDeaths}
        trainerSet={game.trainerSet ?? game.id}
      />
    </RunProviders>
  );
}
