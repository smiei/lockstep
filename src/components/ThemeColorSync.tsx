"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { SHELL_HEX, parseShellColor } from "@/lib/shellColor";

// Keeps <meta name="theme-color"> in step with the top of the page, which
// decides the browser chrome's colour (and, on iOS, the installed app's status
// bar).
//
// The static value in layout.tsx's `viewport` export cannot do this alone:
// the top of the page is the shell field in both themes (the phone's top bar,
// the desktop rail), and that field's colour is a per-device setting
// (`data-shell` on <html>, src/lib/shellColor.ts) the server never sees. So
// the wanted colour is read from the attribute the boot script already set.
function wantedColor(): string {
  return SHELL_HEX[parseShellColor(document.documentElement.getAttribute("data-shell") ?? "green")];
}

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const apply = () => {
      const wanted = wantedColor();
      // Collapse every theme-color tag to the one wanted value, so no
      // media-scoped default can win against it.
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        if (meta.getAttribute("content") !== wanted) meta.setAttribute("content", wanted);
      });
    };

    apply();

    // Setting it once is not enough. Next re-emits the tags from the `viewport`
    // export on every client-side navigation, which puts the static default
    // back. Watching <head> re-applies the value whenever Next rewrites or
    // replaces the tag, covering route changes and run switches alike. The
    // equality guard in apply() is what stops the observer from reacting to
    // its own write. The appearance dialog announces a colour change with
    // `nuzlocke:shellcolor` (useShellColor).
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    window.addEventListener("nuzlocke:shellcolor", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("nuzlocke:shellcolor", apply);
    };
  }, [resolvedTheme]);

  return null;
}
