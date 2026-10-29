// Per-device shell colour: the side rail / top bar and the primary button.
// The parts that are NOT a hook, so layout.tsx (a server component) can import
// the boot script - same split as uiScale.ts / useUiScale.ts.
//
// Applied as `data-shell` on <html>; globals.css holds one variable set per
// colour (`:root[data-shell="red"]` ...). Green is the default and carries no
// attribute at all, so a page rendered before the script runs is already
// correct for most people.
//
// Per device like the UI size: one player's red rail has no business
// recolouring the other player's phone.
export const SHELL_COLOR_KEY = "nuzlocke:shellColor";

export const SHELL_COLORS = ["green", "red", "blue", "yellow"] as const;
export type ShellColor = (typeof SHELL_COLORS)[number];
export const SHELL_COLOR_DEFAULT: ShellColor = "green";

// The field colour of each set, for the swatches and the browser's
// theme-color. Keep in step with --shell in globals.css.
export const SHELL_HEX: Record<ShellColor, string> = {
  green: "#0f3d30",
  red: "#b8101b",
  blue: "#1e3a8a",
  yellow: "#ffcb05",
};

export function parseShellColor(value: unknown): ShellColor {
  return SHELL_COLORS.includes(value as ShellColor) ? (value as ShellColor) : SHELL_COLOR_DEFAULT;
}

// Sets or clears the attribute; the default leaves <html> untouched.
export function applyShellColor(root: { setAttribute(n: string, v: string): void; removeAttribute(n: string): void }, color: ShellColor): void {
  if (color === SHELL_COLOR_DEFAULT) root.removeAttribute("data-shell");
  else root.setAttribute("data-shell", color);
}

// Runs before first paint (layout.tsx), so the page does not flash green
// before switching. Stringified into the document: ES5-safe, self-contained,
// and it swallows everything - blocked storage must still render the page.
export function shellColorBootScript(): string {
  return (
    "(function(){try{var v=JSON.parse(localStorage.getItem(" +
    JSON.stringify(SHELL_COLOR_KEY) +
    "));var s=" +
    JSON.stringify(SHELL_COLORS.filter((c) => c !== SHELL_COLOR_DEFAULT)) +
    ';if(s.indexOf(v)>=0)document.documentElement.setAttribute("data-shell",v)}catch(e){}})();'
  );
}
