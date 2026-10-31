import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  SHELL_COLORS,
  SHELL_COLOR_KEY,
  SHELL_HEX,
  applyShellColor,
  parseShellColor,
  shellColorBootScript,
} from "@/lib/shellColor";

function fakeRoot() {
  const attrs: Record<string, string> = {};
  return {
    attrs,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    removeAttribute: (name: string) => {
      delete attrs[name];
    },
  };
}

function runBoot(stored: string | null, serverDefault?: string) {
  const root = fakeRoot();
  const localStorage = { getItem: (key: string) => (key === SHELL_COLOR_KEY ? stored : null) };
  const window = serverDefault ? { __LOCKSTEP_CONFIG__: { shellColor: serverDefault, lang: null } } : {};
  new Function("localStorage", "document", "window", shellColorBootScript())(localStorage, { documentElement: root }, window);
  return root.attrs;
}

describe("shellColorBootScript", () => {
  it("applies a stored non-default colour before first paint", () => {
    expect(runBoot(JSON.stringify("red"))).toEqual({ "data-shell": "red" });
  });

  it("leaves <html> alone for the default, garbage or nothing stored", () => {
    expect(runBoot(JSON.stringify("green"))).toEqual({});
    expect(runBoot(JSON.stringify("purple"))).toEqual({});
    expect(runBoot("not json")).toEqual({});
    expect(runBoot(null)).toEqual({});
  });

  it("falls back to the server's DEFAULT_SHELL_COLOR, but a device's own choice wins", () => {
    expect(runBoot(null, "blue")).toEqual({ "data-shell": "blue" });
    expect(runBoot("not json", "yellow")).toEqual({ "data-shell": "yellow" });
    // An explicit green on this device beats a blue server default.
    expect(runBoot(JSON.stringify("green"), "blue")).toEqual({});
    expect(runBoot(JSON.stringify("red"), "blue")).toEqual({ "data-shell": "red" });
  });
});

describe("scripts/generate-icons.mjs", () => {
  it("recolours the icon tile to each shell's own colour", () => {
    const script = readFileSync(path.join(process.cwd(), "scripts/generate-icons.mjs"), "utf-8");
    for (const color of SHELL_COLORS) {
      expect(script).toContain(`${color}: { tile: "${SHELL_HEX[color]}"`);
    }
  });
});

describe("parseShellColor / applyShellColor", () => {
  it("falls back to green", () => {
    expect(parseShellColor("blue")).toBe("blue");
    expect(parseShellColor(42)).toBe("green");
  });

  it("removes the attribute for the default", () => {
    const root = fakeRoot();
    applyShellColor(root, "yellow");
    expect(root.attrs).toEqual({ "data-shell": "yellow" });
    applyShellColor(root, "green");
    expect(root.attrs).toEqual({});
  });
});

describe("globals.css", () => {
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf-8");

  it("has a variable set for every non-default colour", () => {
    for (const color of SHELL_COLORS.filter((c) => c !== "green")) {
      expect(css).toContain(`:root[data-shell="${color}"]`);
    }
  });

  it("retints the page's neutral ramp per colour, in both themes", () => {
    // Without these the ground, trays and text greys stay green under a red
    // or blue shell.
    const tokens = ["canvas", "panel", "sunken", "hover", "line", "line-strong", "ink", "ink-muted", "ink-subtle", "focus", "chevron"];
    for (const color of SHELL_COLORS.filter((c) => c !== "green")) {
      for (const selector of [`:root[data-shell="${color}"] {`, `:root.dark[data-shell="${color}"] {`]) {
        // Every block under that selector (the shell set and the page ramp
        // are separate blocks), joined.
        const block = css
          .split(selector)
          .slice(1)
          .map((part) => part.split("}")[0])
          .join("\n");
        for (const token of tokens) expect(block, `${selector} --page-${token}`).toContain(`--page-${token}:`);
      }
    }
  });

  it("keeps the swatch hex values in step with --shell", () => {
    expect(css).toContain(`--shell: ${SHELL_HEX.green};`);
    for (const color of SHELL_COLORS.filter((c) => c !== "green")) {
      const block = css.split(`:root[data-shell="${color}"] {`)[1]?.split("}")[0] ?? "";
      expect(block).toContain(`--shell: ${SHELL_HEX[color]};`);
    }
  });
});
