import { describe, it, expect } from "vitest";
import { externalImagesAllowed } from "@/lib/spriteConsent";

describe("externalImagesAllowed", () => {
  it("never asks on a private instance", () => {
    expect(externalImagesAllowed(false, null)).toBe(true);
    expect(externalImagesAllowed(false, "denied")).toBe(true);
    expect(externalImagesAllowed(false, "granted")).toBe(true);
  });

  it("requests nothing on a public instance until it is agreed to", () => {
    expect(externalImagesAllowed(true, null)).toBe(false);
    expect(externalImagesAllowed(true, "denied")).toBe(false);
    expect(externalImagesAllowed(true, "granted")).toBe(true);
  });
});
