import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Familjen_Grotesk, Red_Hat_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Navigation } from "@/components/Navigation";
import { StickyNav } from "@/components/StickyNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BlindflugToggle } from "@/components/BlindflugToggle";
import { HeaderTitle } from "@/components/HeaderTitle";
import { RunSwitcher } from "@/components/RunSwitcher";
import { HeaderMenu } from "@/components/HeaderMenu";
import { NextCapCard } from "@/components/NextCapCard";
import { DialogProvider } from "@/components/DialogProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PublicFooter } from "@/components/PublicFooter";
import { SpriteConsentProvider } from "@/components/SpriteConsentProvider";
import { SpriteConsentBanner } from "@/components/SpriteConsentBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { ThemeColorSync } from "@/components/ThemeColorSync";
import { SessionWatch } from "@/components/SessionWatch";
import { TabOrderProvider } from "@/components/TabOrderProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { listCapSummaries, listRunsForHeader } from "@/lib/runs";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { getGameSummaries } from "@/lib/data";
import { uiScaleBootScript } from "@/lib/uiScale";
import { shellColorBootScript } from "@/lib/shellColor";
import { runtimeConfigFromEnv, runtimeConfigScript } from "@/lib/runtimeConfig";
import "./globals.css";

// The interface face and the label face of the collection world (DESIGN.md):
// a grotesk with some warmth for everything you read and press, a mono for
// the data a specimen label carries - numbers, BST, caps.
const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin", "latin-ext"],
});

const redHatMono = Red_Hat_Mono({
  variable: "--font-redhat-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  // Each tab sets its own title (src/lib/pageMetadata.ts); the template adds
  // the app name, the default covers pages that set none.
  title: { template: "%s · Lockstep", default: "Lockstep – Nuzlocke & SoulLink Tracker" },
  description: "Pokémon Nuzlocke and SoulLink tracker",
  applicationName: "Lockstep",
  // Home-screen label on iOS; it truncates around 12 characters, so the full
  // title would be cut mid-word.
  appleWebApp: { capable: true, title: "Lockstep" },
  // This app is wall-to-wall numbers (levels, catch rates, dex ids) and iOS
  // Safari auto-links digit runs as phone numbers - blue, underlined, and
  // they hijack the tap.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // The shell green in both themes: on a phone the page starts with the green
  // top bar in light and dark alike, so the browser chrome continues it. (It
  // used to be a light/dark media pair that followed --canvas; the top of the
  // page no longer changes with the theme.) Keep in step with --shell in
  // globals.css, ThemeColorSync and manifest.webmanifest.
  themeColor: "#0f3d30",
  // "cover": since Android 15, an installed standalone PWA is drawn
  // edge-to-edge with a TRANSPARENT status bar - the clock/battery glyphs sit
  // directly on the app's own pixels, coloured by the PHONE's system light/
  // dark setting, never by this page's theme-color or `dark` class. Without
  // "cover" the env(safe-area-inset-top) values below stay 0 and there is no
  // way to paint that strip at all, which is what left it showing the app's
  // own (possibly wrong-contrast) background - see .safe-area-top in
  // globals.css and the <div> it's applied to in this file.
  // Pinch-zoom stays on - it matters on these dense tables.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runs = await listRunsForHeader();
  const caps = await listCapSummaries(runs);
  const games = getGameSummaries();
  // DEFAULT_SHELL_COLOR / DEFAULT_LANGUAGE from the container, read per
  // request (see runtimeConfig.ts) - every content page is dynamic.
  const runtimeConfig = runtimeConfigFromEnv();

  return (
    <html
      lang="de"
      className={`${familjen.variable} ${redHatMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Reserves and colours exactly the strip Android 15 draws its own
            status-bar glyphs over. Their colour follows the PHONE's system
            scheme, not this app's theme - so this div is deliberately styled
            with a raw `prefers-color-scheme` media query in globals.css,
            never the `dark` class next-themes toggles. Zero height (and so
            invisible) anywhere env(safe-area-inset-top) is 0, which is every
            non-edge-to-edge context: desktop, a plain browser tab, iOS unless
            it turns out to need the same treatment (unverified - there is no
            device to check that on from here). */}
        <div aria-hidden className="safe-area-top" />
        {/* Hand-written instead of the app/manifest.ts file convention, and
            this is load-bearing: Next only ever puts crossOrigin on its
            auto-injected manifest link when VERCEL_ENV === "preview" (see
            next/dist/lib/metadata/metadata.js), so on a self-hosted server it
            is always omitted. The browser then fetches the manifest WITHOUT
            cookies, Cloudflare Access answers with a login redirect, the fetch
            fails, and the install prompt silently never appears.
            React 19 hoists these <link>s into <head>. */}
        {/* Captures beforeinstallprompt during HTML parse. On a warm repeat
            visit Chrome fires it before React hydrates, so a listener added
            in a useEffect misses it and the install entry in the gear menu
            intermittently never shows up. useInstallPrompt reads this stash.
            React 19 does not hoist inline scripts, so it stays here and runs
            in place. */}
        {/* Applies the stored UI size before the first paint, the same job
            next-themes' own inline script does for the theme. Without it the
            page renders at 100% and then jumps to the chosen size on
            hydration. React 19 does not hoist inline scripts, so both of these
            run here, in place, ahead of the content. */}
        {/* The server's defaults first: the shell-colour boot script and the
            language fallback read them. */}
        <script dangerouslySetInnerHTML={{ __html: runtimeConfigScript(runtimeConfig) }} />
        <script dangerouslySetInnerHTML={{ __html: uiScaleBootScript() }} />
        {/* Same for the shell colour (data-shell on <html>). */}
        <script dangerouslySetInnerHTML={{ __html: shellColorBootScript() }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var s=function(e){window.__nuzlockeInstallPrompt=e;' +
              'window.dispatchEvent(new Event("nuzlocke:installprompt"))};' +
              'window.addEventListener("beforeinstallprompt",function(e){' +
              'e.preventDefault();s(e)});' +
              'window.addEventListener("appinstalled",function(){s(null)})})();',
          }}
        />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        {/* All icon links point into /icons/, which is what makes a private
            branding override possible: mounting a folder with an icon.svg onto
            /app/branding makes docker-entrypoint.sh regenerate every file here
            at container start, without any of it touching the repo or the
            public image. The master would have auto-injected its own,
            unoverridable <link> if it still lived at src/app/icon.svg. */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <SpriteConsentProvider>
            <ToastProvider>
            <DialogProvider>
            <TabOrderProvider>
              {/* The shell: one green field that is a side rail from lg up and
                  a top bar plus the sticky tab strip below that. It is ONE set
                  of elements re-arranged by CSS, never rendered twice - the
                  gear menu, the run switcher and Blindflug all own dialogs,
                  a hidden file input or the hazard tape, and two copies would
                  double them.
                  Below lg the wrapper and the header are `display: contents`,
                  so the tab strip is a direct child of the page column and can
                  stay sticky against it (a sticky element cannot leave its
                  parent's box). From lg the wrapper is the sticky rail and the
                  header dissolves into it, its parts placed by `order`:
                  title, run switcher, tabs, next cap, then the utility buttons
                  at the foot. `.shell` re-points the colour tokens at the
                  green field for everything inside (globals.css).
                  lg:z-30 is load-bearing: a sticky element is a stacking
                  context of its own, so the dialogs that open from the rail
                  (new run, rename, import...) carry their z-50 only inside
                  it - without a z-index on the rail itself, the page's own
                  positioned buttons painted over those dialogs. 30 keeps it
                  under Modal (50) and Toast (60) at the root. */}
              <div className="flex min-h-full flex-1 flex-col lg:flex-row">
                <div className="shell contents lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-dvh lg:w-58 lg:shrink-0 lg:flex-col lg:self-start lg:overflow-y-auto lg:bg-shell lg:pb-4">
                  {/* The title row is deliberately NOT sticky on a phone: the
                      run switcher and the gear are occasional, the tabs are
                      constant. flex-wrap: on narrow screens the controls wrap
                      to a second line instead of widening the page. */}
                  <header className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-shell px-4 py-3 sm:px-6 lg:contents">
                    <div className="mr-auto min-w-0 lg:order-1 lg:mr-0 lg:px-5 lg:pt-6 lg:pb-5">
                      <HeaderTitle />
                    </div>
                    {/* On a phone the run switcher takes a row of its own
                        under the name and the buttons - it carries the run's
                        name, the one thing here worth the width. */}
                    <div className="order-3 w-full sm:order-none sm:w-auto lg:order-2 lg:w-auto lg:px-4 lg:pb-4">
                      <Suspense
                        fallback={
                          <div className="h-10 w-32 rounded-md border border-line lg:w-full" />
                        }
                      >
                        <RunSwitcher runs={runs} games={games} />
                      </Suspense>
                    </div>
                    {/* The next level cap as a chip in the phone's top bar;
                        from lg the rail's card carries it instead. */}
                    <div className="order-2 sm:order-none lg:hidden">
                      <Suspense fallback={null}>
                        <NextCapCard runs={runs} caps={caps} variant="chip" />
                      </Suspense>
                    </div>
                    <div className="order-2 flex items-center gap-2 sm:order-none lg:order-5 lg:px-4 lg:pt-3">
                      <Suspense fallback={<div className="h-10 w-10 rounded-md border border-line" />}>
                        <HeaderMenu runs={runs} games={games} />
                      </Suspense>
                      <ThemeToggle />
                      {/* Suspense because it reads ?run= via useSearchParams,
                          which would otherwise opt the statically prerendered
                          "/" out of static rendering - the same reason
                          RunSwitcher and Navigation are wrapped. */}
                      <Suspense fallback={<div className="h-10 w-10 rounded-md border border-line" />}>
                        <BlindflugToggle
                          runs={runs.map((run) => ({ id: run.id, accessKey: run.accessKey, settingsJson: run.settingsJson }))}
                        />
                      </Suspense>
                    </div>
                  </header>
                  <StickyNav className="lg:order-3">
                    {/* Exactly one tab's height on a phone (2px bottom border +
                        8px + 20px icon + 4px gap + 16px label + 8px), so the
                        strip does not jump when Navigation replaces the
                        fallback. In rem, not px, so it follows the UI-size
                        setting like the strip itself. */}
                    <Suspense fallback={<div className="h-[3.625rem] lg:h-80" />}>
                      <Navigation />
                    </Suspense>
                  </StickyNav>
                  {/* Rail only: a phone's top bar has no room for it, and the
                      Overview tab carries the same number. */}
                  <div className="hidden lg:order-4 lg:mt-auto lg:block lg:px-4 lg:pt-6">
                    <Suspense fallback={null}>
                      <NextCapCard runs={runs} caps={caps} />
                    </Suspense>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* 96rem: wide enough for the Team tab's drawer and its
                      side column side by side on a 1920px screen. */}
                  <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
                  <PublicFooter />
                </div>
              </div>
              <SpriteConsentBanner />
              <LiveRefresh />
              <ThemeColorSync />
              <ServiceWorkerRegistrar />
              {/* Watches a Cloudflare Access session, which only a private
                  instance sits behind. */}
              {!IS_PUBLIC_INSTANCE && <SessionWatch />}
            </TabOrderProvider>
            </DialogProvider>
            </ToastProvider>
            </SpriteConsentProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
