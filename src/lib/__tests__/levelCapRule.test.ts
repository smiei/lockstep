import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { applyCapRule, capKind, teamLevel } from "@/lib/levelCapRule";
import type { LevelCap } from "@/lib/data";

const names = (en: string) => ({ de: en, en });
const cap = (over: Partial<LevelCap>): LevelCap => ({
  id: 1,
  names: names("Boss"),
  location: names("Route 1"),
  badge: null,
  max_level: 30,
  ...over,
});

describe("capKind", () => {
  it("reads a gym off the badge and the League off the Elite Four block", () => {
    expect(capKind(cap({ badge: names("Boulder Badge") }))).toBe("gym");
    expect(capKind(cap({ location: names("Elite Four") }))).toBe("league");
    expect(capKind(cap({}))).toBe("other");
  });

  it("lets the pack say otherwise", () => {
    expect(capKind(cap({ kind: "gym" }))).toBe("gym");
    expect(capKind(cap({ badge: names("Badge"), kind: "other" }))).toBe("other");
  });
});

describe("applyCapRule", () => {
  const caps = [
    cap({ id: 1 }),
    cap({ id: 2, badge: names("Badge"), max_level: 14 }),
    cap({ id: 3, location: names("Elite Four"), max_level: 50 }),
    cap({ id: 4, kind: "gym", max_level: 12 }),
  ];

  it("leaves every level alone while the rule is off", () => {
    expect(applyCapRule(caps, { capsGymsOnly: false })).toBe(caps);
  });

  it("keeps the fight but not its level for rivals and villains", () => {
    const out = applyCapRule(caps, { capsGymsOnly: true });
    expect(out.map((c) => c.id)).toEqual([1, 2, 3, 4]);
    expect(out.map((c) => c.max_level)).toEqual([null, 14, 50, 12]);
    // The skipped fight keeps its level for display, the capped ones get none.
    expect(out.map((c) => c.skippedLevel)).toEqual([30, undefined, undefined, undefined]);
    // The pack's own list is not touched.
    expect(caps[0].max_level).toBe(30);
  });
});

describe("teamLevel", () => {
  it("stays the rule's distance under the cap, never below level 1", () => {
    expect(teamLevel(30, 2)).toBe(28);
    expect(teamLevel(30, 0)).toBe(30);
    expect(teamLevel(2, 5)).toBe(1);
  });
});

// With the rule on, a run must still meet caps on its way: every pack has
// gyms (or what stands in for them) and a League the rule can tell apart.
describe("every pack under the gym-only rule", () => {
  const root = path.join(process.cwd(), "data/games");
  for (const id of readdirSync(root)) {
    it(id, () => {
      const caps = JSON.parse(readFileSync(path.join(root, id, "levelcaps.json"), "utf-8")) as LevelCap[];
      const kept = applyCapRule(caps, { capsGymsOnly: true }).filter((c) => c.max_level !== null);
      const kinds = kept.map(capKind);
      expect(kinds.filter((k) => k === "gym").length, "gyms").toBeGreaterThanOrEqual(8);
      expect(kinds.filter((k) => k === "league").length, "league").toBeGreaterThanOrEqual(4);
      expect(kinds).not.toContain("other");
    });
  }
});
