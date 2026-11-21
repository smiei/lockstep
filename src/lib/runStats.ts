import type { Player } from "@/generated/prisma/enums";

// The statistics page's arithmetic (Overview -> Statistics). Client-safe and
// pure. The run's timeline is its Journey: one segment per fight, "up to
// Brock", "up to Misty" ... plus one after the last fight. An event (a catch,
// a miss, a death) belongs to the segment of the fight that was still ahead
// of the team when it happened.

// One member of the team that won a fight (LevelCapProgress.teamJson). By
// route rather than encounter id, so a backup restores it unchanged.
export type TeamSnapshotMember = {
  player: Player;
  routeId: number;
  pokemonId: number;
  // Infinite Fusion: the fused body.
  bodyPokemonId: number | null;
  nickname: string | null;
};

// Reads a stored snapshot; null for none or for anything malformed.
export function parseTeamSnapshot(json: string | null | undefined): TeamSnapshotMember[] | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return null;
    const members = value.filter(
      (m): m is TeamSnapshotMember =>
        typeof m === "object" &&
        m !== null &&
        typeof m.player === "string" &&
        typeof m.routeId === "number" &&
        typeof m.pokemonId === "number",
    );
    return members.map((m) => ({
      player: m.player,
      routeId: m.routeId,
      pokemonId: m.pokemonId,
      bodyPokemonId: typeof m.bodyPokemonId === "number" ? m.bodyPokemonId : null,
      nickname: typeof m.nickname === "string" ? m.nickname : null,
    }));
  } catch {
    return null;
  }
}

// The encounter fields a snapshot is made of.
export type SnapshotEncounter = {
  id: number;
  player: Player;
  routeId: number;
  currentPokemonId: number;
  fusedIntoId: number | null;
  nickname: string | null;
};

// Encounters as team members, the way the Team tab shows them: a fused body
// is folded into its host (when both are in the list) and the rest stay
// single members, in the given order.
export function snapshotMembers(encounters: readonly SnapshotEncounter[]): TeamSnapshotMember[] {
  const ids = new Set(encounters.map((e) => e.id));
  const donorOf = new Map(
    encounters.filter((e) => e.fusedIntoId !== null).map((e) => [e.fusedIntoId as number, e]),
  );
  return encounters
    .filter((e) => !(e.fusedIntoId !== null && ids.has(e.fusedIntoId)))
    .map((e) => ({
      player: e.player,
      routeId: e.routeId,
      pokemonId: e.currentPokemonId,
      bodyPokemonId: donorOf.get(e.id)?.currentPokemonId ?? null,
      nickname: e.nickname,
    }));
}

export const TEAM_SIZE = 6;

// A Pokémon that died in a fight, for filling the team that won it.
export type FallenMember = TeamSnapshotMember & { diedAt: number };

// The Pokémon that fell in each fight (src/lib/deathPoint.ts: a death belongs
// to the fight that was still open), newest death first. Only recorded
// deaths of caught Pokémon count.
export function fallenByFight(
  links: readonly {
    diedAt: Date | null;
    capId: number | null;
    encounters: readonly (SnapshotEncounter & { caught: boolean })[];
  }[],
): Map<number, FallenMember[]> {
  const byFight = new Map<number, { diedAt: number; encounter: SnapshotEncounter }[]>();
  for (const link of links) {
    if (link.diedAt === null || link.capId === null) continue;
    const list = byFight.get(link.capId) ?? [];
    for (const encounter of link.encounters) {
      if (encounter.caught) list.push({ diedAt: link.diedAt.getTime(), encounter });
    }
    byFight.set(link.capId, list);
  }
  const result = new Map<number, FallenMember[]>();
  for (const [capId, list] of byFight) {
    // Newest first; a fused pair folds into its host with the host's time.
    list.sort((a, b) => b.diedAt - a.diedAt);
    const diedAtOf = new Map(list.map((item) => [item.encounter.id, item.diedAt]));
    const members = snapshotMembers(list.map((item) => item.encounter));
    const hostIds = list
      .map((item) => item.encounter)
      .filter((e) => !(e.fusedIntoId !== null && diedAtOf.has(e.fusedIntoId)))
      .map((e) => e.id);
    result.set(
      capId,
      members.map((member, i) => ({ ...member, diedAt: diedAtOf.get(hostIds[i]) ?? 0 })),
    );
  }
  return result;
}

// The team that won a fight, its free slots filled with the Pokémon that fell
// in that fight - they were part of the team until the fight took them. Each
// player's free slots take that player's newest deaths first.
export function withFallen(
  team: readonly TeamSnapshotMember[],
  fallen: readonly FallenMember[],
): (TeamSnapshotMember & { fallen: boolean })[] {
  const result = team.map((member) => ({ ...member, fallen: false }));
  const taken = new Map<Player, number>();
  for (const member of team) taken.set(member.player, (taken.get(member.player) ?? 0) + 1);
  const inTeam = new Set(team.map((m) => `${m.player}:${m.routeId}`));
  for (const member of fallen) {
    const count = taken.get(member.player) ?? 0;
    if (count >= TEAM_SIZE || inTeam.has(`${member.player}:${member.routeId}`)) continue;
    taken.set(member.player, count + 1);
    result.push({
      player: member.player,
      routeId: member.routeId,
      pokemonId: member.pokemonId,
      bodyPokemonId: member.bodyPokemonId,
      nickname: member.nickname,
      fallen: true,
    });
  }
  return result;
}

// A fight of the run, in Journey order.
export type StatsCap = { id: number; defeatedAt: number | null };

export type StatsEncounter = {
  player: Player;
  // When the route was played (RouteEntry.seenAt, else Encounter.createdAt).
  at: number;
  caught: boolean;
};

export type StatsDeath = {
  // Who lost theirs (SoulLink.deathPlayer); null = not recorded.
  player: Player | null;
  // The fight it belongs to (src/lib/deathPoint.ts), when recorded.
  capId: number | null;
  recorded: boolean;
  at: number | null;
};

// "end" = after the last fight.
export type SegmentKey = number | "end";

export type PlayerCounts = { caught: number; missed: number; deaths: number };

export type StatsSegment = {
  key: SegmentKey;
  // Per player, in the run's player order.
  perPlayer: { player: Player; counts: PlayerCounts }[];
  // A death in SoulLink with no "who" recorded still counts for the segment.
  unattributedDeaths: number;
};

export type RunStats = {
  segments: StatsSegment[];
  totals: { player: Player; counts: PlayerCounts }[];
  // Deaths that predate death-point tracking and have no time either.
  unplacedDeaths: number;
};

const empty = (): PlayerCounts => ({ caught: 0, missed: 0, deaths: 0 });

// The segment a moment belongs to: the first fight (by when it was won) won
// after it; past the last win, the first fight still open in Journey order;
// with every fight won, "end".
export function segmentAt(at: number, caps: readonly StatsCap[]): SegmentKey {
  const wonAfter = caps
    .filter((cap) => cap.defeatedAt !== null && cap.defeatedAt > at)
    .sort((a, b) => (a.defeatedAt as number) - (b.defeatedAt as number))[0];
  if (wonAfter) return wonAfter.id;
  return caps.find((cap) => cap.defeatedAt === null)?.id ?? "end";
}

export function computeRunStats(input: {
  caps: readonly StatsCap[];
  players: readonly Player[];
  encounters: readonly StatsEncounter[];
  deaths: readonly StatsDeath[];
}): RunStats {
  const { caps, players } = input;
  const keys: SegmentKey[] = [...caps.map((cap) => cap.id), "end"];
  const bySegment = new Map(
    keys.map((key) => [
      key,
      { perPlayer: new Map(players.map((p) => [p, empty()])), unattributedDeaths: 0 },
    ]),
  );
  const totals = new Map(players.map((p) => [p, empty()]));
  const known = new Set(players);

  for (const e of input.encounters) {
    if (!known.has(e.player)) continue;
    const segment = bySegment.get(segmentAt(e.at, caps))!;
    const field = e.caught ? "caught" : "missed";
    segment.perPlayer.get(e.player)![field]++;
    totals.get(e.player)![field]++;
  }

  let unplacedDeaths = 0;
  for (const d of input.deaths) {
    const key: SegmentKey | null = d.recorded
      ? (d.capId ?? "end")
      : d.at !== null
        ? segmentAt(d.at, caps)
        : null;
    const segment = key === null ? undefined : bySegment.get(key);
    if (!segment) {
      unplacedDeaths++;
    } else if (d.player && known.has(d.player)) {
      segment.perPlayer.get(d.player)!.deaths++;
    } else {
      segment.unattributedDeaths++;
    }
    if (d.player && known.has(d.player)) totals.get(d.player)!.deaths++;
  }

  return {
    segments: keys.map((key) => {
      const segment = bySegment.get(key)!;
      return {
        key,
        perPlayer: players.map((player) => ({ player, counts: segment.perPlayer.get(player)! })),
        unattributedDeaths: segment.unattributedDeaths,
      };
    }),
    totals: players.map((player) => ({ player, counts: totals.get(player)! })),
    unplacedDeaths,
  };
}

// Caught out of every encounter that had an outcome, 0-100; null without any.
export function catchRate(counts: PlayerCounts): number | null {
  const total = counts.caught + counts.missed;
  return total === 0 ? null : Math.round((counts.caught / total) * 100);
}
