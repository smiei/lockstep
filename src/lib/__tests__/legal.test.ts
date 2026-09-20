import { afterEach, describe, expect, it, vi } from "vitest";

// IS_PUBLIC_INSTANCE is read when src/lib/instance.ts is first imported, so
// each case sets the environment and loads a fresh copy of the module.
async function loadLegal(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("@/lib/legal");
}

afterEach(() => vi.unstubAllEnvs());

const PUBLIC = { NEXT_PUBLIC_INSTANCE_MODE: "public" };

describe("legal pages", () => {
  it("are not offered by a private instance, whatever the environment says", async () => {
    const { legalLink, legalText } = await loadLegal({ LEGAL_IMPRINT_TEXT: "Jane Doe", LEGAL_PRIVACY_URL: "https://example.com/p" });
    expect(legalText("imprint")).toBeNull();
    expect(legalLink("imprint")).toBeNull();
    expect(legalLink("privacy")).toBeNull();
  });

  it("link to the operator's text on this site", async () => {
    const { legalLink, legalText } = await loadLegal({ ...PUBLIC, LEGAL_IMPRINT_TEXT: "  Jane Doe\nMain St 1  ", LEGAL_PRIVACY_TEXT: "We store little." });
    expect(legalText("imprint")).toBe("Jane Doe\nMain St 1");
    expect(legalLink("imprint")).toEqual({ href: "/impressum", external: false });
    expect(legalLink("privacy")).toEqual({ href: "/datenschutz", external: false });
  });

  it("prefer a link to a page that already exists", async () => {
    const { legalLink } = await loadLegal({ ...PUBLIC, LEGAL_IMPRINT_URL: "https://example.com/imprint", LEGAL_IMPRINT_TEXT: "Jane Doe" });
    expect(legalLink("imprint")).toEqual({ href: "https://example.com/imprint", external: true });
  });

  it("ignore an address that is not a web link", async () => {
    const { legalLink } = await loadLegal({ ...PUBLIC, LEGAL_IMPRINT_URL: "javascript:alert(1)", LEGAL_PRIVACY_URL: "not a url" });
    expect(legalLink("imprint")).toBeNull();
    expect(legalLink("privacy")).toBeNull();
  });

  it("show nothing for a page nobody configured", async () => {
    const { legalLink, legalText } = await loadLegal(PUBLIC);
    expect(legalLink("imprint")).toBeNull();
    expect(legalText("privacy")).toBeNull();
  });
});
