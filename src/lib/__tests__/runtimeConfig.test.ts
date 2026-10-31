import { describe, it, expect } from "vitest";
import {
  parseAcceptLanguage,
  pickLang,
  runtimeConfigFromEnv,
  runtimeConfigScript,
} from "@/lib/runtimeConfig";

describe("runtimeConfigFromEnv", () => {
  it("reads DEFAULT_SHELL_COLOR and DEFAULT_LANGUAGE, tolerant of case and region", () => {
    expect(runtimeConfigFromEnv({ DEFAULT_SHELL_COLOR: " Blue ", DEFAULT_LANGUAGE: "en-GB" })).toEqual({
      shellColor: "blue",
      lang: "en",
    });
  });

  it("falls back to green and no language for missing or unknown values", () => {
    expect(runtimeConfigFromEnv({})).toEqual({ shellColor: "green", lang: null });
    expect(runtimeConfigFromEnv({ DEFAULT_SHELL_COLOR: "purple", DEFAULT_LANGUAGE: "pl" })).toEqual({
      shellColor: "green",
      lang: null,
    });
  });

  it("serialises into a script that cannot break out of its <script> tag", () => {
    const script = runtimeConfigScript(runtimeConfigFromEnv({ DEFAULT_SHELL_COLOR: "</script>", DEFAULT_LANGUAGE: "</script>" }));
    expect(script).not.toContain("</script>");
    expect(script).toBe('window.__LOCKSTEP_CONFIG__={"shellColor":"green","lang":null};');
  });
});

describe("device language", () => {
  it("orders Accept-Language by quality and picks the first language the app speaks", () => {
    const header = "pl-PL,pl;q=0.9,en-US;q=0.8,de;q=0.7";
    expect(parseAcceptLanguage(header)).toEqual(["pl-PL", "pl", "en-US", "de"]);
    expect(pickLang(parseAcceptLanguage(header))).toBe("en");
    expect(pickLang(parseAcceptLanguage("de;q=0.5, it"))).toBe("it");
  });

  it("returns null when nothing matches", () => {
    expect(pickLang(parseAcceptLanguage(null))).toBeNull();
    expect(pickLang(["pl", "ja"])).toBeNull();
  });
});
