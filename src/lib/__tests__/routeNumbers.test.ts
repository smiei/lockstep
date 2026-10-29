import { describe, it, expect } from "vitest";
import { formatCatalogueNumber, routeNumbers } from "@/lib/routeNumbers";

describe("routeNumbers", () => {
  it("numbers routes by display position, not by id", () => {
    // FireRed's list was reordered: ids are frozen, positions are not.
    const numbers = routeNumbers([{ id: 1 }, { id: 3 }, { id: 5 }, { id: 2 }]);
    expect([...numbers]).toEqual([
      [1, 1],
      [3, 2],
      [5, 3],
      [2, 4],
    ]);
  });

  it("skips hidden routes without shifting the rest", () => {
    // A free-team slot or a fusion body is not a place.
    const numbers = routeNumbers([{ id: 1 }, { id: -1, hidden: true }, { id: 3 }]);
    expect(numbers.get(-1)).toBeUndefined();
    expect(numbers.get(3)).toBe(2);
  });

  it("gives a spliced-in custom route the number of its slot", () => {
    const numbers = routeNumbers([{ id: 1 }, { id: -2 }, { id: 3 }]);
    expect(numbers.get(-2)).toBe(2);
    expect(numbers.get(3)).toBe(3);
  });
});

describe("formatCatalogueNumber", () => {
  it("pads to three digits", () => {
    expect(formatCatalogueNumber(4)).toBe("004");
    expect(formatCatalogueNumber(63)).toBe("063");
    expect(formatCatalogueNumber(1234)).toBe("1234");
  });
});
