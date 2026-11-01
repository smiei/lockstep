import { describe, it, expect } from "vitest";
import { badgeSlug, hasBadgeArtwork } from "@/lib/badges";

describe("badgeSlug", () => {
  it("lowercases and dashes multi-word names", () => {
    expect(badgeSlug("Boulder Badge")).toBe("boulder-badge");
    expect(badgeSlug("Rising Badge")).toBe("rising-badge");
  });

  it("strips characters outside a-z0-9 and collapses runs to a single dash", () => {
    expect(badgeSlug("Soul  Badge!")).toBe("soul-badge");
  });

  it("has no leading or trailing dash", () => {
    expect(badgeSlug(" Earth Badge ")).toBe("earth-badge");
  });
});

describe("hasBadgeArtwork", () => {
  it("knows the badges the downloaded sheet has, and nothing past it", () => {
    expect(hasBadgeArtwork("Boulder Badge")).toBe(true);
    expect(hasBadgeArtwork("Legend Badge")).toBe(true);
    // Kalos, Galar, Paldea, and Black 2/White 2's own: the default medal.
    expect(hasBadgeArtwork("Iceberg Badge")).toBe(false);
    expect(hasBadgeArtwork("Water Badge")).toBe(false);
    expect(hasBadgeArtwork("Gym Badge (Bug)")).toBe(false);
    expect(hasBadgeArtwork("Toxic Badge")).toBe(false);
  });
});
