import { getGameOrDefault } from "@/lib/data";
import {
  getPokemonListForGame,
} from "@/lib/gameData";
import { prisma } from "@/lib/prisma";
import { resolveRunId } from "@/lib/runs";
import { getBoundRoutes } from "@/lib/runPage";
import { getRoutesForRun } from "@/lib/runRoutes";
import { getLang } from "@/lib/i18n/getLang";
import { tabMetadata } from "@/lib/pageMetadata";
import { TrackerView } from "@/components/TrackerView";
import { RunProviders } from "@/components/RunProviders";
import { RunLanding } from "@/components/RunLanding";

// Shared, constantly-mutated state (two players editing concurrently) - never
// serve a build-time snapshot, always hit the DB fresh.
export const dynamic = "force-dynamic";

export const generateMetadata = tabMetadata("tracker");

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const resolvedRun = await resolveRunId(run);
  if (!resolvedRun) return <RunLanding />;
  const { runId, runKey, players, gameId, settings } = resolvedRun;

  const lang = await getLang();
  const game = getGameOrDefault(gameId);
  const routes = await getRoutesForRun(runId, gameId);
  const pokemonList = getPokemonListForGame(game);
  const encounters = await prisma.encounter.findMany({ where: { runId } });
  const boundRoutes = [...(await getBoundRoutes(runId))];

  return (
    <RunProviders run={resolvedRun} game={game} lang={lang} pokemonList={pokemonList}>
      <div>
        <TrackerView
          runKey={runKey}
          players={players}
          boundRoutes={boundRoutes}
          lang={lang}
          settings={settings}
          routes={routes}
          pokemonList={pokemonList}
          encounters={encounters}
          fusionEnabled={Boolean(game.fusion)}
          englishOnly={game.kind === "romhack"}
        />
      </div>
    </RunProviders>
  );
}
