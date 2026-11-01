import { describe, it, expect } from "vitest";
import {
  ballHasCondition,
  computeCatchChance,
  getBallIdsForGeneration,
  heavyBallModifierGen7,
  isUltraBeast,
  type CatchInput,
} from "@/lib/catchrate";

// Reference values follow Bulbapedia's "Catch rate" article (Gen V-IX) and the
// single balls' pages. From Gen 5 the chance is about (a/255)^0.75; the tests
// compare against that closed form where flooring b changes nothing visible.
const base: CatchInput = {
  baseRate: 45,
  hpPercent: 100,
  level: 50,
  ball: "poke",
  status: "none",
  types: ["normal"],
  turn: 1,
};
const chance = (generation: number, patch: Partial<CatchInput> = {}, versionGroup?: string) =>
  computeCatchChance(generation, { ...base, ...patch }, versionGroup).chance;
const closedForm = (a: number) => Math.pow(a / 255, 0.75);

describe("Gen 5-9 shake formula", () => {
  it("Gen 5 (three checks) and Gen 6+ (four checks) both come to (a/255)^0.75", () => {
    // Full HP: a = rate / 3 = 15.
    for (const generation of [5, 6, 7]) {
      expect(chance(generation)).toBeCloseTo(closedForm(15), 3);
    }
    // At level 50 neither Gen 8's nor Gen 9's level bonus applies.
    expect(chance(8, { badges: 8 })).toBeCloseTo(closedForm(15), 3);
    expect(chance(9, { badges: 8 })).toBeCloseTo(closedForm(15), 3);
  });

  it("sleep and freeze give ×2.5", () => {
    const r = computeCatchChance(6, { ...base, status: "sleep" });
    expect(r.statusText).toBe("×2.5");
    expect(r.chance).toBeCloseTo(closedForm(37.5), 3);
  });

  it("guarantees the catch from a = 255", () => {
    expect(computeCatchChance(6, { ...base, baseRate: 255, hpPercent: 1, ball: "ultra" }).guaranteed).toBe(true);
  });
});

describe("Gen 5-9 balls", () => {
  it("Timer Ball: +1229/4096 per turn after the first, at most ×4", () => {
    expect(computeCatchChance(5, { ...base, ball: "timer", turn: 1 }).ballText).toBe("×1");
    expect(computeCatchChance(5, { ...base, ball: "timer", turn: 2 }).ballText).toBe("×1.3");
    expect(computeCatchChance(5, { ...base, ball: "timer", turn: 11 }).ballText).toBe("×4");
  });

  it("Nest Ball: (41 - level) / 10, cut off at 31 in Gen 5 and 30 from Gen 6", () => {
    expect(computeCatchChance(5, { ...base, ball: "nest", level: 1 }).ballText).toBe("×4");
    expect(computeCatchChance(5, { ...base, ball: "nest", level: 30 }).ballText).toBe("×1.1");
    expect(computeCatchChance(6, { ...base, ball: "nest", level: 30 }).ballText).toBe("×1");
    expect(computeCatchChance(6, { ...base, ball: "nest", level: 29 }).ballText).toBe("×1.2");
  });

  it("Gen 7 raises Net and Repeat to ×3.5 and lowers Dusk to ×3", () => {
    const water = { ...base, types: ["water"] };
    expect(computeCatchChance(6, { ...water, ball: "net" }).ballText).toBe("×3");
    expect(computeCatchChance(7, { ...water, ball: "net" }).ballText).toBe("×3.5");
    expect(computeCatchChance(7, { ...base, ball: "repeat" }).ballText).toBe("×3.5");
    expect(computeCatchChance(6, { ...base, ball: "dusk" }).ballText).toBe("×3.5");
    expect(computeCatchChance(7, { ...base, ball: "dusk" }).ballText).toBe("×3");
  });

  it("Lure Ball: ×5 in Gen 7, ×4 from Gen 8", () => {
    expect(computeCatchChance(7, { ...base, ball: "lure" }).ballText).toBe("×5");
    expect(computeCatchChance(8, { ...base, ball: "lure", badges: 8 }).ballText).toBe("×4");
  });

  it("Fast Ball reads base Speed from Gen 7, without a checkbox", () => {
    expect(ballHasCondition("fast", "sun-moon", 7)).toBe(false);
    expect(ballHasCondition("fast", "heartgold-soulsilver", 4)).toBe(true);
    expect(computeCatchChance(7, { ...base, ball: "fast", baseSpeed: 100 }).ballText).toBe("×4");
    expect(computeCatchChance(7, { ...base, ball: "fast", baseSpeed: 99 }).ballText).toBe("×1");
  });

  it("Dream Ball: guaranteed in Gen 5, ×4 against sleepers from Gen 8", () => {
    expect(computeCatchChance(5, { ...base, ball: "dream" }).guaranteed).toBe(true);
    expect(computeCatchChance(8, { ...base, ball: "dream", badges: 8 }).ballText).toBe("×1");
    expect(computeCatchChance(8, { ...base, ball: "dream", status: "sleep", badges: 8 }).ballText).toBe("×4");
  });

  it("Safari and Sport Ball lose their bonus in Gen 8, except BDSP's Great Marsh", () => {
    expect(computeCatchChance(8, { ...base, ball: "safari", badges: 8 }, "sword-shield").ballText).toBe("×1");
    expect(computeCatchChance(8, { ...base, ball: "sport", badges: 8 }, "sword-shield").ballText).toBe("×1");
    expect(
      computeCatchChance(8, { ...base, ball: "safari", badges: 8 }, "brilliant-diamond-and-shining-pearl").ballText,
    ).toBe("×1.5");
  });

  it("Ultra Beasts: ×5 with the Beast Ball, ×0.1 with any other ball but the Master Ball", () => {
    expect(isUltraBeast(793)).toBe(true);
    expect(isUltraBeast(800)).toBe(false);
    const ub = { ...base, ultraBeast: true };
    expect(computeCatchChance(7, { ...ub, ball: "beast" }).ballText).toBe("×5");
    expect(computeCatchChance(7, { ...ub, ball: "ultra" }).ballText).toBe("×0.1");
    expect(computeCatchChance(7, { ...ub, ball: "master" }).guaranteed).toBe(true);
    expect(computeCatchChance(7, { ...base, ball: "beast" }).ballText).toBe("×0.1");
  });

  it("Heavy Ball: Gen 7 brackets; Sun/Moon cannot catch at a rate of 0 or less, USUM lifts it to 1", () => {
    expect(heavyBallModifierGen7(99.9)).toBe(-20);
    expect(heavyBallModifierGen7(100)).toBe(0);
    expect(heavyBallModifierGen7(200)).toBe(20);
    expect(heavyBallModifierGen7(300)).toBe(30);
    // Beldum: rate 3, 95.2 kg.
    const beldum = { ...base, baseRate: 3, weight: 95.2, ball: "heavy" as const };
    expect(chance(7, beldum, "sun-moon")).toBe(0);
    expect(chance(7, beldum, "ultra-sun-ultra-moon")).toBeCloseTo(closedForm(1 / 3), 3);
  });
});

describe("ball lists", () => {
  it("each modern game offers what it hands out", () => {
    expect(getBallIdsForGeneration(5, "black-white")).toContain("dream");
    expect(getBallIdsForGeneration(6, "x-y")).not.toContain("dream");
    expect(getBallIdsForGeneration(7, "sun-moon")).toEqual(expect.arrayContaining(["beast", "heavy", "moon"]));
    expect(getBallIdsForGeneration(8, "sword-shield")).toEqual(expect.arrayContaining(["beast", "dream", "safari"]));
    expect(getBallIdsForGeneration(9, "scarlet-violet")).toEqual(expect.arrayContaining(["beast", "dream"]));
    const bdsp = getBallIdsForGeneration(8, "brilliant-diamond-and-shining-pearl");
    expect(bdsp).toContain("safari");
    expect(bdsp).not.toContain("beast");
    for (const generation of [5, 6, 7, 8, 9]) {
      const balls = getBallIdsForGeneration(generation);
      expect(new Set(balls).size).toBe(balls.length);
    }
  });
});

describe("Gen 8 and 9 level factors", () => {
  it("Gen 8: ×(30 - level)/10 below level 20", () => {
    const r = computeCatchChance(8, { ...base, level: 5, badges: 8 });
    expect(r.levelText).toBe("×2.5");
    expect(computeCatchChance(8, { ...base, level: 20, badges: 8 }).levelText).toBeUndefined();
  });

  it("Gen 8: ×0.1 without the eighth badge against a target above your level", () => {
    const over = computeCatchChance(8, { ...base, level: 30, ownLevel: 25, badges: 7 });
    expect(over.penaltyText).toBe("×0.1");
    expect(computeCatchChance(8, { ...base, level: 30, ownLevel: 30, badges: 7 }).penaltyText).toBeUndefined();
    expect(computeCatchChance(8, { ...base, level: 30, ownLevel: 25, badges: 8 }).penaltyText).toBeUndefined();
  });

  it("Sword/Shield: no ball can be thrown above 20 + 5 per badge, not even a Master Ball", () => {
    const blocked = computeCatchChance(8, { ...base, level: 31, badges: 2, ball: "master" }, "sword-shield");
    expect(blocked).toMatchObject({ guaranteed: false, chance: 0, throwLimit: 30 });
    expect(computeCatchChance(8, { ...base, level: 30, badges: 2 }, "sword-shield").throwLimit).toBeUndefined();
    expect(computeCatchChance(8, { ...base, level: 90, badges: 8 }, "sword-shield").throwLimit).toBeUndefined();
    // BDSP has no such limit.
    const bdsp = "brilliant-diamond-and-shining-pearl";
    expect(computeCatchChance(8, { ...base, level: 31, badges: 2 }, bdsp).throwLimit).toBeUndefined();
  });

  it("Gen 9: ×(36 - 2·level)/10 below level 13", () => {
    expect(computeCatchChance(9, { ...base, level: 1, badges: 8 }).levelText).toBe("×3.4");
    expect(computeCatchChance(9, { ...base, level: 12, badges: 8 }).levelText).toBe("×1.2");
    expect(computeCatchChance(9, { ...base, level: 13, badges: 8 }).levelText).toBeUndefined();
  });

  it("Gen 9: ×0.8 per missing badge beyond the obedience limit + 5", () => {
    // No badges: obedience 20, no penalty up to 25.
    expect(computeCatchChance(9, { ...base, level: 25, badges: 0 }).penaltyText).toBeUndefined();
    // Level 26 takes two badges to obey (limit 25 with one, 30 with two).
    expect(computeCatchChance(9, { ...base, level: 26, badges: 0 }).penaltyText).toBe("×0.64");
    // Level 70 with 7 badges: only the eighth lifts the limit.
    expect(computeCatchChance(9, { ...base, level: 70, badges: 7 }).penaltyText).toBe("×0.8");
  });
});
