import { prisma } from "@/lib/prisma";
import { getEvolutionById, type GameInfo } from "@/lib/data";
import { getPokemonByIdForGame, isInDex } from "@/lib/gameData";
import { movepoolId } from "@/lib/forms";
import { boundRouteMap } from "@/lib/speciesClause";
import { resolveEncounterMon, type EncounterMonDeps } from "@/lib/encounterMon";
import { isFoldedDonor } from "@/lib/fusionGroups";
import type { EvolutionRuleOptions } from "@/lib/runSettings";
import type { Lang } from "@/lib/i18n/dictionary";
import type { Player } from "@/generated/prisma/client";
import type { TeamMember } from "@/components/TeamWeaknessesView";

// What several run-scoped pages read or build the same way. Server-only (it
// queries the database); the pure rules it leans on live in fusionGroups.ts,
// encounterMon.ts and speciesClause.ts.

// The level caps the run has beaten.
export async function getDefeatedCapIds(runId: number): Promise<Set<number>> {
  const rows = await prisma.levelCapProgress.findMany({
    where: { runId, defeated: true },
    select: { levelCapId: true },
  });
  return new Set(rows.map((row) => row.levelCapId));
}

// "Hidden route -> real route" for the Species Clause (boundRouteMap).
export async function getBoundRoutes(runId: number): Promise<Map<number, number>> {
  return boundRouteMap(
    await prisma.soulLink.findMany({ where: { runId }, select: { id: true, routeId: true, boundToId: true } }),
  );
}

export function encounterMonDepsFor(
  game: GameInfo,
  evoOptions: EvolutionRuleOptions,
  lang: Lang,
): EncounterMonDeps {
  return {
    pokemonById: (id) => getPokemonByIdForGame(game, id),
    evolvesTo: (id) => getEvolutionById(id, evoOptions)?.evolvesTo ?? [],
    inDex: (id) => isInDex(game, id),
    lang,
  };
}

// The species whose entry in a species-keyed table (learnsets) a Pokémon
// reads: formes with their own entry keep it, the rest fall back.
export function movepoolResolver(
  game: GameInfo,
  table: Record<string, unknown>,
): (pokemonId: number) => number {
  return (pokemonId) => {
    const pokemon = getPokemonByIdForGame(game, pokemonId);
    return pokemon ? movepoolId(pokemon, (id) => table[String(id)] !== undefined) : pokemonId;
  };
}

// Infinite Fusion: host encounter id -> its donor (the fusion body).
export function donorsByHost<E extends { fusedIntoId: number | null }>(encounters: E[]): Map<number, E> {
  return new Map(encounters.filter((e) => e.fusedIntoId !== null).map((e) => [e.fusedIntoId as number, e]));
}

type TeamEncounter = {
  id: number;
  player: Player;
  currentPokemonId: number;
  soulLinkId: number | null;
  fusedIntoId: number | null;
};

// Every player's battle units on the given links, in link order: a donor is
// folded into its host, and a host's name and types are the fused ones (see
// fusionGroups.ts). Which links count as "the team" is the caller's choice.
export function teamsOf(
  links: { encounters: TeamEncounter[] }[],
  players: Player[],
  ctx: {
    visibleEncounterIds: Set<number>;
    donorByHostId: Map<number, { currentPokemonId: number }>;
    deps: EncounterMonDeps;
    movepoolOf: (pokemonId: number) => number;
  },
): { player: Player; members: TeamMember[] }[] {
  const byPlayer = new Map<Player, TeamMember[]>(players.map((player) => [player, []]));
  for (const link of links) {
    for (const e of link.encounters) {
      if (isFoldedDonor(e, ctx.visibleEncounterIds)) continue;
      const mon = resolveEncounterMon(
        e.currentPokemonId,
        ctx.donorByHostId.get(e.id)?.currentPokemonId,
        ctx.deps,
      );
      if (!mon) continue;
      byPlayer.get(e.player)?.push({
        encounterId: e.id,
        pokemonId: e.currentPokemonId,
        speciesId: ctx.movepoolOf(e.currentPokemonId),
        name: mon.name,
        types: mon.types,
        bodyId: mon.bodyId,
        bodySpeciesId: mon.bodyId !== null ? ctx.movepoolOf(mon.bodyId) : null,
      });
    }
  }
  return players.map((player) => ({ player, members: byPlayer.get(player) ?? [] }));
}
