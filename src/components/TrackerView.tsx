"use client";

import { useState, useTransition } from "react";
import type { Route, Pokemon } from "@/lib/data";
import type { Encounter, Player } from "@/generated/prisma/client";
import { EncounterStatus } from "@/generated/prisma/enums";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { routeName } from "@/lib/i18n/localize";
import { isRouteDone, computeRouteProgress } from "@/lib/progress";
import { exportRouteOrder } from "@/lib/actions";
import { formatActionError } from "@/lib/actionErrors";
import { EncounterEditor } from "@/components/EncounterEditor";
import { CustomRoutesDialog } from "@/components/CustomRoutesDialog";
import { DebugOrderDialog } from "@/components/DebugOrderDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { ProgressBar } from "@/components/ProgressBar";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import type { RunSettings } from "@/lib/runSettings";
import { useDebugMode } from "@/lib/useDebugMode";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { ChevronDownIcon } from "@/components/ActionIcons";
import { formatCatalogueNumber, routeNumbers } from "@/lib/routeNumbers";
import { UnverifiedDataNote } from "@/components/UnverifiedDataNote";

// Tailwind only sees whole class names, so the column count per player count
// is spelled out rather than built from a number. Three players on two
// columns would leave an empty, line-coloured cell (the columns are divided
// by the grid's 1px gaps over bg-line), so the third spans the row there.
const EDITOR_GRID: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 sm:[&>*:last-child]:col-span-2 lg:grid-cols-3 lg:[&>*:last-child]:col-span-1",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function TrackerView({
  runKey,
  players,
  boundRoutes,
  lang,
  settings,
  routes,
  pokemonList,
  encounters,
  fusionEnabled = false,
  unverifiedData = false,
}: {
  runKey: string;
  // The run's players in order - one in Classic, 2-4 in SoulLink.
  players: Player[];
  // Hidden route -> the route it belongs to (split-off fusion bodies), for
  // the Species Clause - see boundRouteMap in src/lib/speciesClause.ts.
  boundRoutes: [number, number][];
  lang: Lang;
  settings: RunSettings;
  routes: Route[];
  pokemonList: Pokemon[];
  encounters: Encounter[];
  // Infinite Fusion: a catch can already BE a fusion, so each row offers a
  // second species (the body).
  fusionEnabled?: boolean;
  // The pack's routes and names are not checked yet (game.json dataStatus).
  unverifiedData?: boolean;
}) {
  const playerLabel = usePlayerLabel();
  const tTracker = translations[lang].tracker;
  const tLinks = translations[lang].links;
  const isClassic = players.length === 1;
  // Post-game areas (Sevii 4-7, Cerulean Cave) are collapsed by default so
  // the main-game list stays tidy until the league is beaten.
  const [showPostgame, setShowPostgame] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  // The route the user last edited. "Open only" keeps it on screen even once it
  // is complete, so filling in a species no longer makes the row vanish before
  // the nickname, shiny flag or status can be set. Exactly one extra row, and
  // it moves along as you work down the list.
  //
  // This replaces the "Bestätigen" button that used to solve the same problem
  // by deferring the save - which in turn needed a whole draft-broadcast
  // mechanism so the other player still saw the in-progress pick. Both are gone.
  const [lastTouchedRouteId, setLastTouchedRouteId] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  // The report is fetched before the dialog opens rather than inside it, so
  // the dialog needs no loading state and no effect (which would land on the
  // set-state-in-effect lint baseline).
  const [orderText, setOrderText] = useState<string | null>(null);
  const [exporting, startExport] = useTransition();
  const toast = useToast();
  // Per device: the phone in the same run must not sprout debug controls
  // because the PC switched them on.
  const [debugMode] = useDebugMode(runKey);

  // Every route in display order, for the "insert after" picker - statics
  // included, since an added location may well belong after one, but not the
  // free-team slots, which are not places.
  const routeOptions = routes
    .filter((route) => !route.hidden)
    .map((route) => ({ id: route.id, name: routeName(route, lang) }));
  const customRoutes = routes
    .filter((route) => route.custom && !route.hidden)
    .map((route) => ({
      id: route.id,
      name: routeName(route, lang),
      // Deleting a custom route takes its encounters with it, so the
      // confirmation says how many.
      encounterCount: encounters.filter((e) => e.routeId === route.id).length,
    }));

  function handleExportOrder() {
    startExport(async () => {
      const result = await exportRouteOrder(runKey);
      if (result.success) setOrderText(result.text);
      else toast.error(formatActionError(result.error, lang));
    });
  }

  // "statics" rule off = static locations aren't tracked at all. The full
  // `routes` array still goes to the editors below - it's their lookup table
  // for route names in clause warnings, which may point at a static route.
  // `hidden` = a free-team slot, which is a team row wearing a route's
  // clothes; it has no business on the Encounter tab.
  const onTheMap = routes.filter((r) => !r.hidden);
  const trackable = settings.statics ? onTheMap : onTheMap.filter((r) => r.type === "route");
  const visible = openOnly
    ? trackable.filter((r) => !isRouteDone(r, encounters, players) || r.id === lastTouchedRouteId)
    : trackable;
  const mainRoutes = visible.filter((r) => !r.postgame);
  const postgameRoutes = visible.filter((r) => r.postgame);

  // Overall completion, independent of the "Nur offene" filter above -
  // post-game areas don't count toward "the run" until the league is beaten.
  const progress = computeRouteProgress(routes, encounters, players, settings.statics);
  // The catalogue number in every route label - the same number the Team
  // tab's specimen labels carry (src/lib/routeNumbers.ts).
  const catalogue = routeNumbers(routes);

  function renderRoute(route: Route) {
    const filled = players
      .map((player) => encounters.find((e) => e.routeId === route.id && e.player === player))
      .filter((e): e is Encounter => e !== undefined);
    // SoulLink: some but not all players have an entry -> the rest still owe
    // theirs; the amber outcome word in the route label says so.
    const halfDone = !isClassic && filled.length > 0 && filled.length < players.length;
    // One lost encounter settles the whole route - in SoulLink the pair can
    // never form, in Classic there is nothing else to wait for - so it outranks
    // "still missing an entry" and a killed encounter reads red even while the
    // other player owes theirs.
    const lost = filled.some((e) => e.status !== EncounterStatus.CAUGHT);
    const complete = filled.length === players.length;
    // Each route is a tray of its own, headed by its label - catalogue number,
    // name, outcome in words - on a strip tinted with that outcome, grey until
    // the route resolves. That strip is what tells two adjacent routes apart at
    // a glance (it replaced a 4px coloured left rail).
    const outcome = lost ? "lost" : complete ? "caught" : halfDone ? "missing" : "open";
    const labelTone = {
      lost: "bg-danger-bg",
      caught: "bg-success-bg",
      missing: "bg-warning-bg",
      open: "bg-sunken",
    }[outcome];
    // The strip's tint alone is too faint in dark mode (success-bg and sunken
    // sit a few steps apart), so the whole tray's frame carries the outcome
    // too: a coloured line once the route has a result, dashed while it is
    // still open - the same "empty slot" the Team tab's free slots use.
    const trayFrame = {
      lost: "border-danger-line",
      caught: "border-success-line",
      missing: "border-warning-line",
      open: "border-dashed border-line-strong",
    }[outcome];
    const outcomeTone = ({
      lost: "danger",
      caught: "success",
      missing: "warning",
      open: "neutral",
    } as const)[outcome];
    const outcomeLabel = {
      lost: tTracker.statusLost,
      caught: tTracker.statusCaught,
      missing: tTracker.statusMissing,
      open: tTracker.statusOpen,
    }[outcome];
    const number = catalogue.get(route.id);
    return (
      <div key={route.id} className={`overflow-hidden rounded-md border bg-panel ${trayFrame}`}>
        {/* The route label is the tray's header strip - "Nr. 001 Starter",
            outcome at the end - so every player column below gets the full
            width and its controls fit on one row. */}
        <div className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-3 py-2 sm:px-4 ${labelTone}`}>
          {number !== undefined && (
            <span className="font-mono text-xs font-semibold tabular-nums text-ink-muted">
              {tLinks.labelNumber(formatCatalogueNumber(number))}
            </span>
          )}
          <span className="font-semibold text-ink">
            {routeName(route, lang)}
            {route.type === "static" && (
              <Badge tone="info" className="ml-1.5 align-middle">
                {tTracker.typeStatic}
              </Badge>
            )}
          </span>
          <span className="ml-auto self-center" title={halfDone ? tTracker.missingPlayer : undefined}>
            <Badge tone={outcomeTone}>{outcomeLabel}</Badge>
          </span>
        </div>
        {/* One column per player, divided by hairlines: the 1px gaps of the
            grid show its line-coloured ground. A rule is what tells where one
            player's controls end - stacked on a phone a filled entry is three
            controls tall - without nesting a bordered card inside the tray. */}
        <div className={`grid grid-cols-1 gap-px bg-line ${EDITOR_GRID[players.length] ?? ""}`}>
          {players.map((player) => (
            <div key={player} className="min-w-0 bg-panel p-3 sm:px-4">
              {!isClassic && (
                <span className="mb-1.5 block text-xs font-semibold text-ink-muted">
                  {playerLabel(player)}
                </span>
              )}
              <EncounterEditor
                runKey={runKey}
                lang={lang}
                settings={settings}
                routeId={route.id}
                player={player}
                routes={routes}
                pokemonList={pokemonList}
                encounters={encounters}
                fusionEnabled={fusionEnabled}
                players={players}
                boundRoutes={boundRoutes}
                onTouched={setLastTouchedRouteId}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={tTracker.heading}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            variant={openOnly ? "primary" : "secondary"}
            aria-pressed={openOnly}
            title={tTracker.openOnlyTitle}
            onClick={() => setOpenOnly((v) => !v)}
          >
            {tTracker.openOnly}
          </Button>
          <Button size="sm" onClick={() => setCustomOpen(true)}>
            {tTracker.custom.manage}
          </Button>
          {debugMode && (
            <Button size="sm" loading={exporting} onClick={handleExportOrder}>
              {tTracker.debug.export}
            </Button>
          )}
          <ProgressBar
            done={progress.done}
            total={progress.total}
            percent={progress.percent}
            title={tTracker.progressTitle(progress.done, progress.total, progress.percent)}
          />
        </div>
      </PageHeader>

      {unverifiedData && <UnverifiedDataNote lang={lang} className="mb-4" />}

      <CustomRoutesDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        runKey={runKey}
        lang={lang}
        routeOptions={routeOptions}
        customRoutes={customRoutes}
      />
      {orderText !== null && (
        <DebugOrderDialog
          open
          onClose={() => setOrderText(null)}
          lang={lang}
          text={orderText}
          filename={"encounter-order.txt"}
        />
      )}

      {visible.length === 0 ? (
        // "Open only" with everything done used to leave an empty bordered
        // frame with no explanation and no way back.
        <EmptyState
          title={tTracker.allDone}
          action={
            <Button size="sm" onClick={() => setOpenOnly(false)}>
              {tTracker.showAll}
            </Button>
          }
        />
      ) : (
        // One tray per route on the sage ground: the gap between them is what
        // separates two routes, no divider needed.
        <div className="flex flex-col gap-2">
          {mainRoutes.map(renderRoute)}
          {postgameRoutes.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowPostgame((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong p-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-hover hover:text-ink"
              >
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showPostgame ? "" : "-rotate-90"}`}
                />
                {showPostgame ? tTracker.postgameHide : tTracker.postgameShow(postgameRoutes.length)}
              </button>
              {showPostgame && postgameRoutes.map(renderRoute)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
