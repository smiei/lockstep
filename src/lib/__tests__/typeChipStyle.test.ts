import { describe, expect, it } from "vitest";
import { TYPE_COLORS, contrastRatio, typeChipStyle } from "@/lib/pokemonTypes";

describe("typeChipStyle", () => {
  it("gives every type chip text that clears WCAG AA (4.5:1)", () => {
    for (const type of Object.keys(TYPE_COLORS)) {
      const { backgroundColor, color } = typeChipStyle(type);
      expect(contrastRatio(backgroundColor, color), type).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the canonical fill and only picks the text colour", () => {
    expect(typeChipStyle("electric")).toEqual({ backgroundColor: TYPE_COLORS.electric, color: "#18181b" });
    expect(typeChipStyle("dark")).toEqual({ backgroundColor: TYPE_COLORS.dark, color: "#ffffff" });
  });

  it("falls back to a readable grey for a type it does not know", () => {
    const { backgroundColor, color } = typeChipStyle("no-such-type");
    expect(contrastRatio(backgroundColor, color)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#71717a", "#ffffff")).toBeCloseTo(4.83, 2);
  });
});
