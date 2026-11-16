"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";

// Shown while a route's server render is in flight. There was no loading UI
// anywhere before, and every content page is force-dynamic behind a Cloudflare
// tunnel: tapping a tab left the whole UI frozen on the OLD page - old content,
// old active tab - until the new HTML arrived. That wait is the single largest
// contributor to the app feeling unresponsive.
//
// With this file the navigation commits immediately, so the tab strip moves and
// this skeleton appears at once. It also makes Next's `useLinkStatus` hook
// unnecessary here: the bundled docs describe it as being for dynamic routes
// that do NOT have a loading file.
//
// Not shown on `router.refresh()` (LiveRefresh fires one on every SSE message):
// a refresh re-renders in place and does not re-suspend an already-resolved
// boundary, so a partner's edit will not flash a skeleton.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-hover motion-reduce:animate-none ${className}`} />;
}

export default function Loading() {
  // A client component for this one line: the label follows the chosen
  // language, which a loading file cannot read from the request.
  const { lang } = useLanguage();
  return (
    <div role="status" aria-busy="true" aria-label={translations[lang].errorPage.loading}>
      <Bar className="mb-6 h-7 w-48" />
      <div className="space-y-3">
        <Bar className="h-20 w-full" />
        <Bar className="h-20 w-full" />
        <Bar className="h-20 w-full opacity-70" />
        <Bar className="h-20 w-full opacity-40" />
      </div>
    </div>
  );
}
