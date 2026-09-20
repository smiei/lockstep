import Link from "next/link";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { legalLink, type LegalKind } from "@/lib/legal";

const KINDS: LegalKind[] = ["imprint", "privacy"];

// Only a public instance has one: the fan-project notice and the two legal
// links (src/lib/legal.ts). A private instance is one group's own server.
export async function PublicFooter() {
  if (!IS_PUBLIC_INSTANCE) return null;
  const t = translations[await getLang()].legal;
  const links = KINDS.flatMap((kind) => {
    const link = legalLink(kind);
    return link ? [{ kind, ...link }] : [];
  });
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 text-xs text-ink-subtle sm:px-6">
      <p className="max-w-prose">{t.disclaimer}</p>
      {links.length > 0 && (
        <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {links.map(({ kind, href, external }) =>
            external ? (
              <a key={kind} href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
                {t[kind]}
              </a>
            ) : (
              <Link key={kind} href={href} className="underline hover:text-ink">
                {t[kind]}
              </Link>
            ),
          )}
        </nav>
      )}
    </footer>
  );
}
