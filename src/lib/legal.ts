import { IS_PUBLIC_INSTANCE } from "@/lib/instance";

// The legal notice and privacy policy a public site has to offer, kept OUT of
// the repository on purpose: they carry the operator's name and address, and
// this repository is public. Each one comes from the deployment's environment,
// either as a link to a page that already exists (LEGAL_*_URL - most people
// who host this already have an imprint on their own site) or as the text
// itself (LEGAL_*_TEXT, shown on /impressum or /datenschutz). A URL wins when
// both are set. Server-only: read from process.env at request time.
export type LegalKind = "imprint" | "privacy";

const CONFIG = {
  imprint: { path: "/impressum", url: "LEGAL_IMPRINT_URL", text: "LEGAL_IMPRINT_TEXT" },
  privacy: { path: "/datenschutz", url: "LEGAL_PRIVACY_URL", text: "LEGAL_PRIVACY_TEXT" },
} as const;

function httpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function legalText(kind: LegalKind): string | null {
  if (!IS_PUBLIC_INSTANCE) return null;
  const text = process.env[CONFIG[kind].text]?.trim();
  return text ? text : null;
}

// Where the footer's link goes, or null when neither variable is set - a
// private instance never shows one.
export function legalLink(kind: LegalKind): { href: string; external: boolean } | null {
  if (!IS_PUBLIC_INSTANCE) return null;
  const url = httpUrl(process.env[CONFIG[kind].url]);
  if (url) return { href: url, external: true };
  return legalText(kind) ? { href: CONFIG[kind].path, external: false } : null;
}
