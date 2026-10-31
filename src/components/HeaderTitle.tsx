"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";

// The original logo's colours and the shell variables they follow, so the
// logo takes the device's shell colour (gear menu) live: tile -> --shell,
// label -> --shell-ink-muted, dots -> --shell-ink. On the rail the tile then
// melts into the field, exactly as the green logo always did on the green
// rail. A private logo (branding mount) built on these colours follows too;
// anything else in it stays as drawn. Keep in step with SHELL_RECOLOR in
// scripts/generate-icons.mjs.
const TINT: Record<string, string> = {
  "#0f3d30": "var(--shell)",
  "#dcebe1": "var(--shell-ink-muted)",
  "#ffffff": "var(--shell-ink)",
  "#fff": "var(--shell-ink)",
};

// Fetched once per page load. /icons/logo.svg is the untinted master the
// icon generator writes next to icon.svg - icon.svg itself may already carry
// the server's DEFAULT_SHELL_COLOR, which would leave nothing to find here.
let logoPromise: Promise<string | null> | null = null;
function loadLogo(): Promise<string | null> {
  logoPromise ??= fetch("/icons/logo.svg")
    .then((res) => (res.ok ? res.text() : null))
    .then((text) => (text ? tint(text) : null))
    .catch(() => null);
  return logoPromise;
}

// The file can come from a private branding mount, so it goes in as markup
// only after scripts, foreign content and event handlers are stripped.
function tint(text: string): string | null {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName !== "svg" || doc.querySelector("parsererror")) return null;
  svg.querySelectorAll("script, foreignObject").forEach((node) => node.remove());
  for (const el of [svg, ...Array.from(svg.querySelectorAll("*"))]) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on") || /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
    for (const prop of ["fill", "stroke"]) {
      const color = TINT[el.getAttribute(prop)?.toLowerCase() ?? ""];
      if (color) {
        el.removeAttribute(prop);
        (el as SVGElement).style.setProperty(prop, color);
      }
    }
  }
  svg.setAttribute("width", "32");
  svg.setAttribute("height", "32");
  svg.setAttribute("aria-hidden", "true");
  return new XMLSerializer().serializeToString(svg);
}

export function HeaderTitle() {
  const { lang } = useLanguage();
  const t = translations[lang].header;
  // /icons/ is a build artefact (scripts/generate-icons.mjs via npm's prebuild
  // hook) that docker-entrypoint.sh regenerates at container start whenever a
  // private branding folder is mounted or DEFAULT_SHELL_COLOR is set - so this
  // shows the app's own logo wherever it runs, without any artwork entering
  // the repo or the image. Until the tinted copy is ready (and if it cannot
  // be read at all, e.g. a bitmap logo) the plain file stands in; it is
  // hidden rather than left as a broken-image glyph if it is missing.
  const [logoFailed, setLogoFailed] = useState(false);
  const [tinted, setTinted] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadLogo().then((svg) => {
      if (alive) setTinted(svg);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-2">
      {tinted ? (
        <span
          aria-hidden
          className="block h-8 w-8 shrink-0 overflow-hidden rounded-md"
          dangerouslySetInnerHTML={{ __html: tinted }}
        />
      ) : (
        !logoFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/icons/icon.svg"
            alt=""
            width={32}
            height={32}
            onError={() => setLogoFailed(true)}
            className="h-8 w-8 shrink-0 rounded-md"
          />
        )
      )}
      {/* Deliberately not an <h1>: the app name is chrome, repeated on every
          page. The page title carries the <h1> (see ui/Page.tsx PageHeader). */}
      <p className="truncate text-xl font-bold tracking-tight text-ink lg:text-2xl">
        <span className="sm:hidden">{t.titleShort}</span>
        <span className="hidden sm:inline">{t.titleFull}</span>
      </p>
    </div>
  );
}
