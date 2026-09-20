import { notFound } from "next/navigation";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import { legalText, type LegalKind } from "@/lib/legal";
import { PageHeader } from "@/components/ui/Page";

// /impressum and /datenschutz: the operator's own text, verbatim (src/lib/legal.ts).
// A page nobody configured is a 404 rather than an empty promise.
export async function LegalPage({ kind }: { kind: LegalKind }) {
  const text = legalText(kind);
  if (text === null) notFound();
  const t = translations[await getLang()].legal;
  return (
    <div>
      <PageHeader title={kind === "imprint" ? t.imprint : t.privacy} />
      <div className="max-w-prose whitespace-pre-line break-words text-sm text-ink-muted">{text}</div>
    </div>
  );
}
