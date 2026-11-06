import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { applyRegionRule, hasKanto, levelCapsInRun } from "@/lib/regions";
import { mergeRoutes } from "@/lib/customRoutes";
import type { LevelCap, Route } from "@/lib/data";

const route = (id: number, extra: Partial<Route> = {}): Route => ({
  id,
  names: { de: `R${id}`, en: `R${id}` },
  type: "route",
  ...extra,
});

const routes = [route(1), route(2, { region: "kanto" }), route(3, { postgame: true })];

describe("applyRegionRule", () => {
  it("leaves the routes alone while Kanto is part of the run", () => {
    expect(applyRegionRule(routes, { includeKanto: true })).toEqual(routes);
  });

  it("turns Kanto into post-game when the run leaves it out", () => {
    const out = applyRegionRule(routes, { includeKanto: false });
    expect(out.map((r) => Boolean(r.postgame))).toEqual([false, true, true]);
  });
});

describe("levelCapsInRun", () => {
  const caps = [{ id: 1 }, { id: 2, region: "kanto" as const }];
  it("drops the Kanto fights only when Kanto is excluded", () => {
    expect(levelCapsInRun(caps, { includeKanto: true })).toHaveLength(2);
    expect(levelCapsInRun(caps, { includeKanto: false }).map((c) => c.id)).toEqual([1]);
  });
});

describe("custom routes", () => {
  it("take the region and post-game flag of the route they follow", () => {
    const merged = mergeRoutes(routes, [
      { routeId: -1, name: "A", type: "route", afterRouteId: 2 },
      { routeId: -2, name: "B", type: "route", afterRouteId: 3 },
      { routeId: -3, name: "C", type: "route", afterRouteId: 1 },
      { routeId: -4, name: "slot", type: "route", afterRouteId: 2, hidden: true },
    ]);
    const byId = new Map(merged.map((r) => [r.id, r]));
    expect(byId.get(-1)?.region).toBe("kanto");
    expect(byId.get(-2)?.postgame).toBe(true);
    expect(byId.get(-3)?.region).toBeUndefined();
    expect(byId.get(-4)?.region).toBeUndefined();
  });
});

describe("HeartGold / SoulSilver packs", () => {
  const read = <T,>(game: string, file: string): T =>
    JSON.parse(fs.readFileSync(`data/games/${game}/${file}`, "utf-8")) as T;

  for (const game of ["heartgold", "soulsilver"]) {
    it(`${game}: Johto, then Kanto from Vermilion City, then the roaming legendaries`, () => {
      const list = read<Route[]>(game, "routes.json");
      expect(hasKanto(list)).toBe(true);
      const firstKanto = list.findIndex((r) => r.region === "kanto");
      expect(list[firstKanto - 1].names.en).toBe("Victory Road");
      expect(list[firstKanto].names.en).toBe("Vermilion City");
      // One contiguous block per part.
      const parts = list.map((r) => (r.postgame ? 2 : r.region === "kanto" ? 1 : 0));
      expect([...parts].sort()).toEqual(parts);
      expect(list.filter((r) => r.postgame).map((r) => r.id).sort((a, b) => a - b)).toEqual([67, 68, 120]);
      // Places without any encounter were dropped.
      for (const id of [18, 22, 47, 66]) expect(list.some((r) => r.id === id)).toBe(false);
    });

    it(`${game}: the Kanto fights run from Lt. Surge to Red`, () => {
      const caps = read<LevelCap[]>(game, "levelcaps.json");
      const kanto = caps.filter((c) => c.region === "kanto").map((c) => c.names.en);
      expect(kanto[0]).toBe("Lt. Surge");
      expect(kanto.at(-1)).toBe("Red");
    });
  }

  it("gold-silver follows the same order: Johto, Kanto after Victory Road, the roaming dogs post-game", () => {
    const list = read<Route[]>("gold-silver", "routes.json");
    const firstKanto = list.findIndex((r) => r.region === "kanto");
    expect(list[firstKanto - 1].names.en).toBe("Victory Road");
    const parts = list.map((r) => (r.postgame ? 2 : r.region === "kanto" ? 1 : 0));
    expect([...parts].sort()).toEqual(parts);
    expect(list.filter((r) => r.postgame).map((r) => r.names.en)).toEqual(["Raikou/Entei/Suicune (Roaming)"]);
    const caps = read<LevelCap[]>("gold-silver", "levelcaps.json");
    expect(caps.find((c) => c.region === "kanto")?.names.en).toBe("Lt. Surge");
  });

  for (const game of ["sacred-gold", "storm-silver"]) {
    it(`${game}: Johto, Kanto from Vermilion City, Cerulean Cave post-game`, () => {
      const list = read<Route[]>(game, "routes.json");
      const firstKanto = list.findIndex((r) => r.region === "kanto");
      expect(list[firstKanto].names.en).toBe("Vermilion City");
      const parts = list.map((r) => (r.postgame ? 2 : r.region === "kanto" ? 1 : 0));
      expect([...parts].sort()).toEqual(parts);
      expect(list.filter((r) => r.postgame).map((r) => r.names.en)).toEqual(["Cerulean Cave", "Cerulean Cave (Mewtwo)"]);
    });
  }

  it("swaps Lugia and Ho-Oh: the version's own legendary is in Johto, the other in Kanto", () => {
    const region = (game: string, id: number) => read<Route[]>(game, "routes.json").find((r) => r.id === id)?.region;
    // 33 = Bell Tower (Ho-Oh), 40 = Whirl Islands (Lugia)
    expect(region("heartgold", 33)).toBeUndefined();
    expect(region("heartgold", 40)).toBe("kanto");
    expect(region("soulsilver", 40)).toBeUndefined();
    expect(region("soulsilver", 33)).toBe("kanto");
  });
});
