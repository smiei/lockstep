import { getEvolutions, getMoveTypeHistory, type GameInfo, type Pokemon } from "@/lib/data";
import {
  getDataGenerationForGame,
  getEffectivenessForGame,
  getFusionSpriteConfigForGame,
  getMovesForGame,
  getMovesetForGame,
  getPokemonFormsForGame,
  getPokemonListForGame,
} from "@/lib/gameData";
import { evolutionOptions } from "@/lib/runSettings";
import type { ResolvedRun } from "@/lib/runs";
import type { Lang } from "@/lib/i18n/dictionary";
import type { EffectivenessTable } from "@/lib/effectiveness";
import type { Moveset, MovesTable } from "@/lib/learnset";
import { BlindflugProvider } from "@/components/BlindflugProvider";
import { SpriteSetProvider } from "@/components/SpriteSetProvider";
import { CanonicalRun } from "@/components/CanonicalRun";
import { PlayerNamesProvider } from "@/components/PlayerNamesProvider";
import { PokemonDetailProvider, type ClauseLockInfo } from "@/components/PokemonDetailProvider";
import { prisma } from "@/lib/prisma";
import { clauseLocks } from "@/lib/speciesClause";
import { getBoundRoutes } from "@/lib/runPage";
import { getRoutesForRun } from "@/lib/runRoutes";
import { getPokemonByIdForGame } from "@/lib/gameData";
import { pokemonName, routeName } from "@/lib/i18n/localize";

// What the Pokédex card says about the Species Clause: every encounter of the
// run that uses up its family, for whom (src/lib/speciesClause.ts). Nothing
// with the clause switched off.
async function clauseLockInfo(run: ResolvedRun, game: GameInfo, lang: Lang): Promise<ClauseLockInfo[]> {
  if (!run.settings.speciesClause) return [];
  const [encounters, boundRouteOf, routes] = await Promise.all([
    prisma.encounter.findMany({ where: { runId: run.runId } }),
    getBoundRoutes(run.runId),
    getRoutesForRun(run.runId, run.gameId),
  ]);
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const encounterById = new Map(encounters.map((e) => [e.id, e]));
  return clauseLocks(encounters, { rules: run.settings, players: run.players, boundRouteOf }).map(
    ({ encounter: e, lockedFor }) => {
      const pokemon = getPokemonByIdForGame(game, e.pokemonId);
      // A fusion body and a split-off body sit on hidden routes; name the
      // place the catch belongs to instead.
      const headRouteId = e.fusedIntoId !== null ? encounterById.get(e.fusedIntoId)?.routeId : undefined;
      const routeId = boundRouteOf.get(e.routeId) ?? headRouteId ?? e.routeId;
      const route = routeById.get(routeId);
      const species = pokemon ? pokemonName(pokemon, lang) : `#${e.pokemonId}`;
      // A nickname alone would not say which member of the family it was.
      const nickname = run.settings.nicknames ? e.nickname : null;
      return {
        familyId: e.familyId,
        lockedFor,
        player: e.player,
        name: nickname ? `${nickname} (${species})` : species,
        route: route && !route.hidden ? routeName(route, lang) : null,
        status: e.status,
      };
    },
  );
}

// What every run-scoped page with Pokémon on it wraps its view in: the run's
// Blindflug rule, sprite set, player names, the address-bar/version report
// (CanonicalRun) and the Pokédex card any sprite can open. A server component,
// so the game data is read here once instead of being spelled out per page.
//
// The optional props are for a page that has already read that data for its
// own view - passing it on saves building the same table twice.
export async function RunProviders({
  run,
  game,
  lang,
  pokemonList,
  forms,
  moveData,
  effectiveness,
  children,
}: {
  run: ResolvedRun;
  game: GameInfo;
  lang: Lang;
  pokemonList?: Pokemon[];
  forms?: Pokemon[];
  moveData?: { movesets: Moveset; moves: MovesTable };
  effectiveness?: EffectivenessTable;
  children: React.ReactNode;
}) {
  const { settings } = run;
  return (
    <BlindflugProvider on={settings.blindflug} hideTypes={settings.blindflugTypes}>
      <SpriteSetProvider spriteSet={game.spriteSet} fusion={getFusionSpriteConfigForGame(game)}>
        <CanonicalRun runKey={run.runKey} version={run.version} solo={run.players.length < 2} />
        <PlayerNamesProvider names={settings.playerNames} lang={lang}>
          <PokemonDetailProvider
            pokemonList={pokemonList ?? getPokemonListForGame(game)}
            forms={forms ?? getPokemonFormsForGame(game)}
            evolutions={getEvolutions(evolutionOptions(run.gameId, settings))}
            moveData={moveData ?? { movesets: getMovesetForGame(game), moves: getMovesForGame(game, lang) }}
            moveTypeHistory={getMoveTypeHistory()}
            effectiveness={effectiveness ?? getEffectivenessForGame(game)}
            generation={getDataGenerationForGame(game)}
            dexLimit={game.dexLimit}
            lang={lang}
            clauseLocks={await clauseLockInfo(run, game, lang)}
            soloRun={run.players.length < 2}
          >
            {children}
          </PokemonDetailProvider>
        </PlayerNamesProvider>
      </SpriteSetProvider>
    </BlindflugProvider>
  );
}
