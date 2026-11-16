import {
  getGameOrDefault,
  getLevelCaps,
} from "@/lib/data";
import {
  getCatchRatesForGame,
  getEffectivenessForGame,
  getPokemonListForGame,
  getPokemonFormsForGame,
  getMovesForGame,
  getAttackTypesForGame,
  getMovesetForGame,
  getLearnsetForGame,
} from "@/lib/gameData";
import { explosiveMove } from "@/lib/learnset";
import { prisma } from "@/lib/prisma";
import { resolveRunId } from "@/lib/runs";
import { clauseView } from "@/lib/speciesClause";
import { evolutionOptions } from "@/lib/runSettings";
import {
  donorsByHost,
  encounterMonDepsFor,
  getBoundRoutes,
  getDefeatedCapIds,
  movepoolResolver,
  teamsOf,
} from "@/lib/runPage";
import { getRoutesForRun } from "@/lib/runRoutes";
import { getLang } from "@/lib/i18n/getLang";
import { tabMetadata } from "@/lib/pageMetadata";
import { routeName } from "@/lib/i18n/localize";
import { failedRouteIdsOf, formedLinks, groupTeamPositions } from "@/lib/fusionGroups";
import { LinkStatus } from "@/generated/prisma/client";
import { RunProviders } from "@/components/RunProviders";
import { RunLanding } from "@/components/RunLanding";
import type { OpenSlot } from "@/components/CatchRateView";
import { AnalyzeView } from "@/components/AnalyzeView";

// Run-scoped: the combined Kampf & Fang tab uses the run's game (type chart,
// dex, sprites, catch mechanics, level-up movesets) and its current team for
// the battle matchup / the quick-catch dropdowns.
export const dynamic = "force-dynamic";

export const generateMetadata = tabMetadata("typen");

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const resolvedRun = await resolveRunId(run);
  if (!resolvedRun) return <RunLanding />;
  const { runId, runKey, mode, players, gameId, settings } = resolvedRun;

  const lang = await getLang();
  const game = getGameOrDefault(gameId);
  const learnsetTable = getLearnsetForGame(game);
  const pokemonList = getPokemonListForGame(game);
  // Formes are pickable HERE (unlike in the Pokédex or an encounter): scouting
  // a Wash Rotom or a Deoxys Attack is exactly what this tab is for. Species-
  // keyed tables (catch rates, learnsets, explosiveMap) are looked up via
  // baseSpeciesId, so a forme inherits its species' values.
  const formEntries = getPokemonFormsForGame(game);
  const pickableList = [...pokemonList, ...formEntries];
  const moveset = getMovesetForGame(game);
  const moves = getMovesForGame(game, lang);
  const evoOptions = evolutionOptions(gameId, settings);

  const catchRates = Object.fromEntries(
    getCatchRatesForGame(game).map((entry) => [entry.id, entry.catch_rate]),
  );

  const encounters = await prisma.encounter.findMany({ where: { runId } });

  // Gym badges the run holds (Gen 8/9's catch formula reads them): the
  // defeated level caps that award one, as on the Overview's badge row.
  const defeatedCapIds = await getDefeatedCapIds(runId);
  const badgesEarned = getLevelCaps(gameId).filter(
    (cap) => cap.badge !== null && defeatedCapIds.has(cap.id),
  ).length;

  // Species Clause (src/lib/speciesClause.ts) - the calculator only warns,
  // never blocks. The picker belongs to no player, so it marks what nobody may
  // catch any more; each quick-catch panel warns for its own player on top.
  const clause = clauseView(encounters, {
    rules: settings,
    players,
    boundRouteOf: await getBoundRoutes(runId),
  });
  const lockedFamilyIds = [...clause.lockedForAll()];
  const lockedFamilyIdsByPlayer = Object.fromEntries(
    players.map((player) => [player, [...clause.lockedFamilies(player)]]),
  );

  // Open (route, player) slots for the quick-catch dropdown: pairs without an
  // encounter yet. Statics honor the run's "statics" rule; Classic lists only
  // Player 1.
  const routes = (await getRoutesForRun(runId, gameId)).filter(
    (r) => !r.hidden && (settings.statics || r.type === "route"),
  );
  const openSlots: OpenSlot[] = [];
  for (const player of players) {
    for (const route of routes) {
      const taken = encounters.some((e) => e.routeId === route.id && e.player === player);
      if (!taken) openSlots.push({ routeId: route.id, player, routeName: routeName(route, lang) });
    }
  }

  // Precompute which obtainable Pokémon can go boom (self-destruct/explosion)
  // so the Trainer view can warn about the selected opponent.
  const explosiveMap: Record<number, { name: string; level: number }> = {};
  for (const p of pokemonList) {
    const boom = explosiveMove(moveset, moves, p.id, lang);
    if (boom) explosiveMap[p.id] = { name: boom.name, level: boom.level };
  }

  // Current team per player for the battle matchup.
  // A link only forms when EVERY player catches: a route with a Fled/Killed
  // encounter never produced a link, so its surviving catch is boxed and must
  // not show up as a team member here either (the Team tab hides it too).
  const failedRouteIds = failedRouteIdsOf(mode, encounters);
  const aliveLinks = formedLinks(
    await prisma.soulLink.findMany({
      where: { runId, status: LinkStatus.ALIVE },
      include: { encounters: true },
    }),
    failedRouteIds,
  );
  // Infinite Fusion: "on the team" is asked of the fusion group, whose slot
  // can sit on either route's link; a donor is folded into its host, and a
  // host's name/types are the fused ones - see src/lib/fusionGroups.ts.
  // Without fusions every group is one link and this is its own teamPosition.
  const groupPositions = groupTeamPositions(aliveLinks);
  const teamLinks = aliveLinks
    .filter((link) => groupPositions.get(link.id) != null)
    .sort(
      (a, b) =>
        (groupPositions.get(a.id) ?? 0) - (groupPositions.get(b.id) ?? 0) ||
        (a.teamPosition ?? Number.MAX_SAFE_INTEGER) - (b.teamPosition ?? Number.MAX_SAFE_INTEGER),
    );
  const teams = teamsOf(teamLinks, players, {
    visibleEncounterIds: new Set(aliveLinks.flatMap((link) => link.encounters.map((e) => e.id))),
    donorByHostId: donorsByHost(encounters),
    deps: encounterMonDepsFor(game, evoOptions, lang),
    movepoolOf: movepoolResolver(game, learnsetTable),
  });

  const effectiveness = getEffectivenessForGame(game);
  const attackTypes = getAttackTypesForGame(game);

  return (
    <RunProviders
      run={resolvedRun}
      game={game}
      lang={lang}
      pokemonList={pokemonList}
      forms={formEntries}
      moveData={{ movesets: moveset, moves }}
      effectiveness={effectiveness}
    >
      <AnalyzeView
        runKey={runKey}
        mode={mode}
        players={players}
        pokemonList={pickableList}
        // The real battle-mechanics generation (ball list, catch formula),
        // deliberately NOT dataGeneration - see CatchRateView's use of it.
        generation={game.generation}
        // A hack's own capture engine stands in for the version group,
        // which only the catch calculator reads here.
        versionGroup={game.catchEngine ?? game.versionGroup}
        missingBalls={game.missingBalls}
        badgesEarned={badgesEarned}
        effectiveness={effectiveness}
        attackTypes={attackTypes}
        catchRates={catchRates}
        lockedFamilyIds={lockedFamilyIds}
        lockedFamilyIdsByPlayer={lockedFamilyIdsByPlayer}
        openSlots={openSlots}
        learnset={learnsetTable}
        teams={teams}
        explosiveMap={explosiveMap}
        settings={settings}
        fusionEnabled={Boolean(game.fusion)}
      />
    </RunProviders>
  );
}
