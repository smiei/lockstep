// Server-wide defaults chosen by whoever runs the container, through its
// environment (Docker / Unraid template):
//
//   DEFAULT_SHELL_COLOR = green | red | blue | yellow
//   DEFAULT_LANGUAGE    = de | en | fr | es | it
//
// They are defaults, never overrides: a device's own choice (the colour in the
// gear menu, the language cookie) always wins. layout.tsx reads them at
// request time and hands them to the browser as window.__LOCKSTEP_CONFIG__
// before the boot scripts run - a NEXT_PUBLIC_ variable would be frozen into
// the bundle at build time, so one published image could not serve every
// server's choice. Client-safe: no Node APIs beyond process.env.
import { SHELL_COLORS, SHELL_COLOR_DEFAULT, type ShellColor } from "@/lib/shellColor";
import { isLang, type Lang } from "@/lib/i18n/dictionary";

export type RuntimeConfig = {
  shellColor: ShellColor;
  // null = not set: the browser falls back to the device language.
  lang: Lang | null;
};

export const RUNTIME_CONFIG_GLOBAL = "__LOCKSTEP_CONFIG__";

const FALLBACK: RuntimeConfig = { shellColor: SHELL_COLOR_DEFAULT, lang: null };

export function runtimeConfigFromEnv(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  const shell = env.DEFAULT_SHELL_COLOR?.trim().toLowerCase();
  // "de-DE" and "DE" both mean German.
  const lang = env.DEFAULT_LANGUAGE?.trim().toLowerCase().slice(0, 2);
  return {
    shellColor: SHELL_COLORS.includes(shell as ShellColor) ? (shell as ShellColor) : SHELL_COLOR_DEFAULT,
    lang: isLang(lang) ? lang : null,
  };
}

// Both values are validated against fixed lists above, so the JSON cannot
// carry anything that would end the <script>.
export function runtimeConfigScript(config: RuntimeConfig): string {
  return `window.${RUNTIME_CONFIG_GLOBAL}=${JSON.stringify(config)};`;
}

export function clientRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") return FALLBACK;
  const raw = (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL];
  if (typeof raw !== "object" || raw === null) return FALLBACK;
  const { shellColor, lang } = raw as Record<string, unknown>;
  return {
    shellColor: SHELL_COLORS.includes(shellColor as ShellColor) ? (shellColor as ShellColor) : SHELL_COLOR_DEFAULT,
    lang: isLang(lang) ? lang : null,
  };
}

// The first of the device's preferred languages the app speaks, or null.
// Works on navigator.languages in the browser and on an Accept-Language
// header on the server, so both sides pick the same language.
export function pickLang(preferred: readonly string[]): Lang | null {
  for (const entry of preferred) {
    const code = entry.trim().toLowerCase().slice(0, 2);
    if (isLang(code)) return code;
  }
  return null;
}

export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag, q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}
