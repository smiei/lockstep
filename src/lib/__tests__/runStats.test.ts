import { describe, expect, it } from "vitest";
import { Player } from "@/generated/prisma/enums";
import {
  catchRate,
  computeRunStats,
  fallenByFight,
  parseTeamSnapshot,
  segmentAt,
  snapshotMembers,
  withFallen,
  type StatsCap,
  type TeamSnapshotMember,
} from "@/lib/runStats";

const { PLAYER1: P1, PLAYER2: P2 } = Player;
// Journey order: Brock (1), Misty (2), Surge (3). Brock won at t=100, Misty at t=200.
const CAPS: StatsCap[] = [
  { id: 1, defeatedAt: 100 },
  { id: 2, defeatedAt: 200 },
  { id: 3, defeatedAt: null },
];

describe("segmentAt", () => {
  it("is the first fight won after the moment", () => {
    expect(segmentAt(50, CAPS)).toBe(1);
    expect(segmentAt(150, CAPS)).toBe(2);
  });

  it("is the next open fight after the last win", () => {
    expect(segmentAt(250, CAPS)).toBe(3);
  });

  it("follows the order fights were won in, not the list order", () => {
    // Misty before Brock: something at t=50 belongs to Misty.
    expect(segmentAt(50, [{ id: 1, defeatedAt: 100 }, { id: 2, defeatedAt: 60 }])).toBe(2);
  });

  it("is the end once every fight is won", () => {
    expect(segmentAt(300, [{ id: 1, defeatedAt: 100 }])).toBe("end");
  });
});

describe("computeRunStats", () => {
  const stats = computeRunStats({
    caps: CAPS,
    players: [P1, P2],
    encounters: [
      { player: P1, at: 10, caught: true },
      { player: P2, at: 10, caught: false },
      { player: P1, at: 150, caught: true },
      { player: P2, at: 250, caught: true },
    ],
    deaths: [
      { player: P1, capId: 2, recorded: true, at: 160 },
      // Before death points were tracked: placed by time.
      { player: P2, capId: null, recorded: false, at: 20 },
      // Nobody knows when.
      { player: null, capId: null, recorded: false, at: null },
      // Recorded after the last fight was won.
      { player: null, capId: null, recorded: true, at: 900 },
    ],
  });
  const seg = (key: number | "end") => stats.segments.find((s) => s.key === key)!;

  it("counts catches and misses per segment and player", () => {
    expect(seg(1).perPlayer).toEqual([
      { player: P1, counts: { caught: 1, missed: 0, deaths: 0 } },
      { player: P2, counts: { caught: 0, missed: 1, deaths: 1 } },
    ]);
    expect(seg(2).perPlayer[0].counts).toEqual({ caught: 1, missed: 0, deaths: 1 });
    expect(seg(3).perPlayer[1].counts.caught).toBe(1);
  });

  it("keeps deaths without a player or a place apart", () => {
    expect(seg("end").unattributedDeaths).toBe(1);
    expect(stats.unplacedDeaths).toBe(1);
  });

  it("sums totals per player", () => {
    expect(stats.totals).toEqual([
      { player: P1, counts: { caught: 2, missed: 0, deaths: 1 } },
      { player: P2, counts: { caught: 1, missed: 1, deaths: 1 } },
    ]);
  });
});

describe("catchRate", () => {
  it("is a rounded percentage, null without encounters", () => {
    expect(catchRate({ caught: 2, missed: 1, deaths: 0 })).toBe(67);
    expect(catchRate({ caught: 0, missed: 0, deaths: 3 })).toBeNull();
  });
});

describe("parseTeamSnapshot", () => {
  it("reads members and drops malformed ones", () => {
    const json = JSON.stringify([
      { player: "PLAYER1", routeId: 3, pokemonId: 4, bodyPokemonId: null, nickname: "Ember" },
      { player: "PLAYER2", routeId: "x", pokemonId: 7 },
    ]);
    expect(parseTeamSnapshot(json)).toEqual([
      { player: P1, routeId: 3, pokemonId: 4, bodyPokemonId: null, nickname: "Ember" },
    ]);
  });

  it("is null for nothing or broken JSON", () => {
    expect(parseTeamSnapshot(null)).toBeNull();
    expect(parseTeamSnapshot("{")).toBeNull();
  });
});

describe("the fallen fill a winning team", () => {
  const enc = (id: number, player: Player, routeId: number, pokemonId: number, extra: { fusedIntoId?: number; caught?: boolean } = {}) => ({
    id,
    player,
    routeId,
    currentPokemonId: pokemonId,
    fusedIntoId: extra.fusedIntoId ?? null,
    nickname: null,
    caught: extra.caught ?? true,
  });
  const member = (player: Player, routeId: number, pokemonId: number): TeamSnapshotMember => ({
    player,
    routeId,
    pokemonId,
    bodyPokemonId: null,
    nickname: null,
  });

  it("folds a fused body into its host", () => {
    expect(snapshotMembers([enc(1, P1, 10, 25), enc(2, P1, 11, 1, { fusedIntoId: 1 })])).toEqual([
      { player: P1, routeId: 10, pokemonId: 25, bodyPokemonId: 1, nickname: null },
    ]);
  });

  it("groups recorded deaths by fight, newest first, caught Pokémon only", () => {
    const fallen = fallenByFight([
      { diedAt: new Date(100), capId: 5, encounters: [enc(1, P1, 10, 25), enc(2, P2, 10, 4)] },
      { diedAt: new Date(300), capId: 5, encounters: [enc(3, P1, 11, 7), enc(4, P2, 11, 1, { caught: false })] },
      { diedAt: new Date(200), capId: 6, encounters: [enc(5, P1, 12, 16)] },
      { diedAt: null, capId: 5, encounters: [enc(6, P1, 13, 19)] },
    ]);
    expect(fallen.get(5)?.map((m) => [m.player, m.routeId, m.diedAt])).toEqual([
      [P1, 11, 300],
      [P1, 10, 100],
      [P2, 10, 100],
    ]);
    expect(fallen.get(6)?.map((m) => m.routeId)).toEqual([12]);
  });

  it("fills only free slots, per player, newest death first", () => {
    const team = [1, 2, 3, 4, 5].map((r) => member(P1, r, r)).concat([member(P2, 1, 50)]);
    const fallen = [
      { ...member(P1, 20, 20), diedAt: 300 },
      { ...member(P1, 21, 21), diedAt: 200 },
      { ...member(P2, 20, 60), diedAt: 300 },
    ];
    const result = withFallen(team, fallen);
    expect(result.filter((m) => m.player === P1)).toHaveLength(6);
    expect(result.filter((m) => m.fallen).map((m) => [m.player, m.routeId])).toEqual([
      [P1, 20],
      [P2, 20],
    ]);
  });

  it("leaves a full team alone and never repeats a member", () => {
    const full = [1, 2, 3, 4, 5, 6].map((r) => member(P1, r, r));
    expect(withFallen(full, [{ ...member(P1, 9, 9), diedAt: 1 }]).some((m) => m.fallen)).toBe(false);
    expect(withFallen([member(P1, 1, 1)], [{ ...member(P1, 1, 1), diedAt: 1 }])).toHaveLength(1);
  });
});
