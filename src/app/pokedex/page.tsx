import { getGameOrDefault } from "@/lib/data";
import {
  getPokemonListForGame,
} from "@/lib/gameData";
import { prisma } from "@/lib/prisma";
import { resolveRunId } from "@/lib/runs";
import { clauseView } from "@/lib/speciesClause";
import { getBoundRoutes } from "@/lib/runPage";
import { getLang } from "@/lib/i18n/getLang";
import { tabMetadata } from "@/lib/pageMetadata";
import { translations } from "@/lib/i18n/dictionary";
import { PokedexTable } from "@/components/PokedexTable";
import { RunProviders } from "@/components/RunProviders";
import { RunLanding } from "@/components/RunLanding";
import { PageHeader } from "@/components/ui/Page";

// Run-scoped: the Pokédex reflects the current run's game (dex scope, sprites,
// generation, and the game's evolution methods for the detail card).
export const dynamic = "force-dynamic";

export const generateMetadata = tabMetadata("pokedex");

export default async function PokedexPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const resolvedRun = await resolveRunId(run);
  if (!resolvedRun) return <RunLanding />;
  const { runId, players, gameId, settings } = resolvedRun;

  const lang = await getLang();
  const game = getGameOrDefault(gameId);
  const pokemon = getPokemonListForGame(game);
  // Evolution families the Species Clause has used up (src/lib/speciesClause.ts),
  // for the availability filter. The Pokédex belongs to no player, so a family
  // only counts once no player may catch it any more.
  const lockedFamilyIds = [
    ...clauseView(await prisma.encounter.findMany({ where: { runId } }), {
      rules: settings,
      players,
      boundRouteOf: await getBoundRoutes(runId),
    }).lockedForAll(),
  ];

  return (
    <RunProviders run={resolvedRun} game={game} lang={lang} pokemonList={pokemon}>
      <div>
        <PageHeader title={translations[lang].pokedex.heading} />
        <PokedexTable pokemon={pokemon} lockedFamilyIds={lockedFamilyIds} />
      </div>
    </RunProviders>
  );
}
