"use client";

import { useCallback } from "react";
import { usePersistentState } from "@/lib/usePersistentState";
import {
  SHELL_COLOR_DEFAULT,
  SHELL_COLOR_KEY,
  applyShellColor,
  parseShellColor,
  type ShellColor,
} from "@/lib/shellColor";

// Reads and writes the per-device shell colour. The constants and the boot
// script live in shellColor.ts so layout.tsx (a server component) can reach
// them. Applied in the setter, not in an effect: on a cold load the boot script
// has already set the attribute.
export function useShellColor(): [ShellColor, (color: ShellColor) => void] {
  const [raw, setRaw] = usePersistentState<string>(SHELL_COLOR_KEY, SHELL_COLOR_DEFAULT);
  const color = parseShellColor(raw);

  const setColor = useCallback(
    (next: ShellColor) => {
      const parsed = parseShellColor(next);
      setRaw(parsed);
      try {
        applyShellColor(document.documentElement, parsed);
        // The browser chrome follows (ThemeColorSync listens for this).
        window.dispatchEvent(new Event("nuzlocke:shellcolor"));
      } catch {
        // DOM unavailable - the boot script applies it on the next load.
      }
    },
    [setRaw],
  );

  return [color, setColor];
}
