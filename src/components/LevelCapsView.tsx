"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LevelCap } from "@/lib/data";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { levelCapName, levelCapLocation, levelCapBadge } from "@/lib/i18n/localize";
import { formatActionError } from "@/lib/actionErrors";
import { capKind, teamLevel } from "@/lib/levelCapRule";
import { TrainerSprite } from "@/components/TrainerSprite";
import { BadgeIcon } from "@/components/BadgeIcon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Page";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { toggleLevelCapDefeated } from "@/lib/actions";
import { ChevronDownIcon } from "@/components/ActionIcons";
import { PokemonSprite } from "@/components/PokemonSprite";
import { usePlayerLabel } from "@/components/PlayerNamesProvider";
import type { TeamSnapshotMember } from "@/lib/runStats";
import type { Player } from "@/generated/prisma/enums";

// The Journey tab (since 6.0): the run's fights as stations on one route band
// - trainers above the line, gyms as their badge on it, rivals and villains
// as small stops - with "you are here" before the next open fight, then that
// fight large with the button that ticks it off, the last one won and the
// next few after it. Every station toggles its fight, which is also how a
// mistaken tick is undone.

// The two regions' names read the same in every language the app speaks.
const REGION_LABELS = { main: "Johto", kanto: "Kanto" } as const;

type JourneyCap = LevelCap & {
  defeated: boolean;
  // A fight the run's cap rule skips (applyCapRule): shown in brackets.
  skippedLevel?: number;
  // When it was won, formatted on the server (one time zone for both renders).
  wonOn?: string | null;
  // The player's own team that won it (null before 6.0 recorded teams).
  team?: (TeamSnapshotMember & { name: string; fallen?: boolean })[] | null;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// "cap / team" in mono: one Pokémon may reach the cap, the rest stays the
// run's capTeamOffset below it. A skipped cap is its level in brackets.
function CapFigure({
  cap,
  offset,
  size,
  lang,
}: {
  cap: JourneyCap;
  offset: number;
  size: "sm" | "lg";
  lang: Lang;
}) {
  const t = translations[lang].levelcaps;
  if (cap.max_level !== null) {
    return (
      <span className="font-mono font-semibold leading-none tabular-nums text-ink">
        <span className={size === "lg" ? "text-4xl" : "text-sm"}>{cap.max_level}</span>
        {offset > 0 && (
          <span className={`font-normal text-ink-muted ${size === "lg" ? "text-xl" : "text-xs"}`}>
            {" / "}
            {teamLevel(cap.max_level, offset)}
          </span>
        )}
      </span>
    );
  }
  if (cap.skippedLevel !== undefined) {
    return (
      <span title={t.skippedCapTitle(cap.skippedLevel)} className={`font-mono tabular-nums text-ink-muted ${size === "lg" ? "text-xl" : "text-xs"}`}>
        ({cap.skippedLevel})
      </span>
    );
  }
  return null;
}

export function LevelCapsView({
  runKey,
  lang,
  levelCaps,
  trainerSet,
  includeKanto = true,
  teamOffset,
  players,
}: {
  runKey: string;
  lang: Lang;
  levelCaps: JourneyCap[];
  // The run's includeKanto rule (src/lib/regions.ts): off, the Kanto fights
  // are post-game and sit after everything else, behind their own divider.
  includeKanto?: boolean;
  // The run's capTeamOffset rule: how far the rest of the team stays under a cap.
  teamOffset: number;
  // The run's players, in order: "won with" groups the team by player.
  players: Player[];
  // Folder under public/trainers/ for game-specific avatars (see TrainerSprite).
  trainerSet: string;
}) {
  const router = useRouter();
  const t = translations[lang].levelcaps;
  const toast = useToast();
  const playerLabel = usePlayerLabel();
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const bandRef = useRef<HTMLOListElement>(null);
  const scrolledOnce = useRef(false);
  const bandId = useId();
  // Whether the band can scroll further either way, for the arrows.
  const [ends, setEnds] = useState({ start: true, end: true });
  const measureEnds = () => {
    const band = bandRef.current;
    if (!band) return;
    const start = band.scrollLeft <= 1;
    const end = band.scrollLeft + band.clientWidth >= band.scrollWidth - 1;
    setEnds((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };

  const isDone = (cap: JourneyCap) => overrides[cap.id] ?? cap.defeated;

  function handleToggle(cap: JourneyCap) {
    const current = isDone(cap);
    setOverrides((prev) => ({ ...prev, [cap.id]: !current }));
    setPendingId(cap.id);
    startTransition(async () => {
      const result = await toggleLevelCapDefeated(runKey, cap.id);
      if (result.success) {
        setOverrides((prev) => ({ ...prev, [cap.id]: result.defeated }));
        router.refresh();
      } else {
        // Rolled back with a reason, so a failed tap does not look like one
        // that never registered.
        setOverrides((prev) => ({ ...prev, [cap.id]: current }));
        toast.error(formatActionError(result.error, lang));
      }
      setPendingId(null);
    });
  }

  // In the order the run plays them: a Kanto the run leaves out comes after
  // everything else, as post-game.
  const main = levelCaps.filter((cap) => cap.region !== "kanto");
  const kanto = levelCaps.filter((cap) => cap.region === "kanto");
  const segments: { label: string | null; caps: JourneyCap[] }[] =
    kanto.length === 0
      ? [{ label: null, caps: main }]
      : [
          { label: includeKanto ? REGION_LABELS.main : null, caps: main },
          { label: includeKanto ? REGION_LABELS.kanto : t.postgame, caps: kanto },
        ];
  const order = segments.flatMap((segment) => segment.caps);
  const nextIndex = order.findIndex((cap) => !isDone(cap));
  const next = nextIndex >= 0 ? order[nextIndex] : null;
  const won = (nextIndex >= 0 ? order.slice(0, nextIndex) : order).filter(isDone);
  const lastWon = won[won.length - 1] ?? null;
  const upNext = nextIndex >= 0 ? order.slice(nextIndex + 1, nextIndex + 4) : [];

  // Keep the next fight in the middle of the band: at once on arrival, with
  // a glide when a tick moves it on (none under reduced motion).
  useEffect(() => {
    const band = bandRef.current;
    const station = next ? band?.querySelector<HTMLElement>(`[data-station="${next.id}"]`) : null;
    if (!band || !station) return;
    const smooth = scrolledOnce.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    band.scrollTo({
      left: station.offsetLeft - band.clientWidth / 2 + station.clientWidth / 2,
      behavior: smooth ? "smooth" : "auto",
    });
    scrolledOnce.current = true;
  }, [next]);

  // A wider window or a longer list changes what is left to scroll.
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const observer = new ResizeObserver(() => measureEnds());
    observer.observe(band);
    return () => observer.disconnect();
  }, []);

  function scrollBand(direction: -1 | 1) {
    const band = bandRef.current;
    if (!band) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    band.scrollBy({ left: direction * band.clientWidth * 0.75, behavior: smooth ? "smooth" : "auto" });
  }

  if (levelCaps.length === 0) {
    return <EmptyState title={t.empty} />;
  }

  // The route line left and right of a station: solid up to the next fight,
  // dashed after it.
  const lineClass = (solid: boolean) =>
    solid ? "h-1 bg-success-solid" : "h-0 border-t-2 border-dashed border-line-strong";

  const station = (cap: JourneyCap, index: number) => {
    const done = isDone(cap);
    const pending = pendingId === cap.id;
    const isNext = index === nextIndex;
    const kind = capKind(cap);
    const anchor = kind !== "other";
    const name = levelCapName(cap, lang);
    const badge = levelCapBadge(cap, lang);
    const place = levelCapLocation(cap, lang);
    const reached = nextIndex < 0 || index <= nextIndex;
    const passed = nextIndex < 0 || index < nextIndex;
    return (
      <li key={cap.id} data-station={cap.id} className={`relative flex shrink-0 snap-center ${anchor ? "w-36" : "w-28"}`}>
        {isNext && (
          <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-sm bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-ink">
            {t.youAreHere}
          </span>
        )}
        <button
          type="button"
          aria-pressed={done}
          disabled={pending}
          onClick={() => handleToggle(cap)}
          title={done ? `${name} \u00b7 ${place} \u00b7 ${t.beaten}${cap.wonOn ? ` ${cap.wonOn}` : ""}` : `${name} \u00b7 ${place}`}
          // The ring goes inside: the band scrolls, and a scroll box clips
          // anything drawn past its edge.
          className="flex w-full flex-col items-center px-1.5 pb-3 pt-7 text-center transition-colors hover:bg-hover focus-visible:-outline-offset-2 disabled:cursor-wait"
        >
          {/* Faded picture, never faded text: the name says "won" by its
              strike-through and muted ink. */}
          <span className={`flex h-20 items-end ${done ? "opacity-45" : ""}`}>
            <TrainerSprite canonicalName={cap.sprite ?? cap.names.de} displayName={name} trainerSet={trainerSet} size={anchor ? 76 : 56} />
          </span>
          <span className="relative flex h-10 w-full items-center justify-center" aria-hidden="true">
            <span className={`absolute left-0 right-1/2 top-1/2 -translate-y-1/2 ${index === 0 ? "invisible" : ""} ${lineClass(reached)}`} />
            <span className={`absolute left-1/2 right-0 top-1/2 -translate-y-1/2 ${index === order.length - 1 ? "invisible" : ""} ${lineClass(passed)}`} />
            {pending ? (
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-panel">
                <Spinner className="text-ink-muted" />
              </span>
            ) : kind === "gym" && cap.badge ? (
              // A gym is its badge on the line, grey until it is earned.
              <span className={`relative flex rounded-full bg-panel p-0.5 ${isNext ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}>
                <BadgeIcon nameEn={cap.badge.en} label={badge ?? name} earned={done} size={30} />
              </span>
            ) : (
              <span
                className={`relative flex items-center justify-center rounded-full border-2 ${anchor ? "h-6 w-6" : "h-4 w-4"} ${
                  done ? "border-success-solid bg-success-solid text-white" : "border-line-strong bg-panel"
                } ${isNext ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}
              >
                {done && anchor && <CheckIcon className="h-3.5 w-3.5" />}
              </span>
            )}
          </span>
          {/* Name and place up to two balanced lines each, in a block of
              fixed height, so the levels below stay on one row along the band. */}
          <span className="flex h-18 w-full flex-col">
            <span className={`line-clamp-2 text-balance break-words text-sm leading-5 ${anchor ? "font-semibold" : "font-medium"} ${done ? "text-ink-muted line-through" : "text-ink"}`}>
              {name}
            </span>
            <span className="line-clamp-2 text-balance break-words text-xs leading-4 text-ink-muted">{place}</span>
          </span>
          <span className="mt-1 h-4">
            <CapFigure cap={cap} offset={teamOffset} size="sm" lang={lang} />
          </span>
          {/* The state in words, not only the faded picture: the date it was
              won, or "beaten" for a fight ticked before dates were kept. */}
          <span className={`mt-1 h-4 text-xs ${done ? "text-success" : "invisible"}`}>
            {done ? (cap.wonOn ? <span className="font-mono tabular-nums">{cap.wonOn}</span> : t.beaten) : "\u00a0"}
          </span>
        </button>
      </li>
    );
  };

  // A region's or the post-game's start: a labelled post on the line.
  const divider = (label: string, beforeIndex: number) => (
    <li key={`divider-${label}`} className="flex w-24 shrink-0 flex-col items-center pt-7" aria-label={label}>
      <span className="flex h-20 items-end pb-2">
        <span className="rounded-sm border border-line-strong bg-sunken px-2 py-1 text-sm font-bold tracking-tight text-ink">{label}</span>
      </span>
      <span className="relative flex h-10 w-full items-center justify-center" aria-hidden="true">
        <span className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${beforeIndex === 0 ? "invisible" : ""} ${lineClass(nextIndex < 0 || beforeIndex <= nextIndex)}`} />
        <span className="relative h-10 w-1 rounded-sm bg-ink-muted" />
      </span>
    </li>
  );

  const stations: ReactNode[] = [];
  let flat = 0;
  for (const segment of segments) {
    if (segment.label && segment.caps.length > 0) stations.push(divider(segment.label, flat));
    for (const cap of segment.caps) stations.push(station(cap, flat++));
  }

  // Arrows for a mouse without a sideways wheel; a phone swipes. The span
  // carries the visibility: the Button's own display class would win over
  // a `hidden` handed to it.
  const scrollButton = (direction: -1 | 1) => (
    <span className={`absolute top-1/2 z-20 hidden -translate-y-1/2 sm:block ${direction < 0 ? "left-2" : "right-2"}`}>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={direction < 0 ? t.earlier : t.later}
        title={direction < 0 ? t.earlier : t.later}
        onClick={() => scrollBand(direction)}
        disabled={direction < 0 ? ends.start : ends.end}
        icon={<ChevronDownIcon className={`h-5 w-5 ${direction < 0 ? "rotate-90" : "-rotate-90"}`} />}
      />
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={bandId} className="relative -mx-4 border-y border-line bg-panel sm:-mx-6 lg:mx-0 lg:rounded-md lg:border">
        <h2 id={bandId} className="sr-only">
          {t.route}
        </h2>
        {scrollButton(-1)}
        {/* From sm the stations fade out under the arrows instead of
            sliding beneath an opaque button. */}
        <ol
          ref={bandRef}
          onScroll={measureEnds}
          className="flex snap-x snap-proximity overflow-x-auto px-4 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-width:thin] sm:px-14 sm:[mask-image:linear-gradient(to_right,transparent,black_3.5rem,black_calc(100%-3.5rem),transparent)]"
        >
          {stations}
        </ol>
        {scrollButton(1)}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {next ? (
          // Named "Next fight: <trainer>" for assistive tech; on screen the
          // band's "you are here" and the button say what this is.
          // The accent frame is the "you are here" flag's colour: this is
          // that station, large.
          <section
            aria-label={`${t.nextFight}: ${levelCapName(next, lang)}`}
            className="flex flex-col gap-4 self-start rounded-md border-2 border-accent bg-panel p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6 lg:w-full"
          >
            <span className="self-start sm:self-center">
              <TrainerSprite canonicalName={next.sprite ?? next.names.de} displayName={levelCapName(next, lang)} trainerSet={trainerSet} size={128} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                {levelCapName(next, lang)}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                {next.badge && capKind(next) === "gym" && (
                  <BadgeIcon nameEn={next.badge.en} label={levelCapBadge(next, lang) ?? ""} earned={false} size={20} />
                )}
                <span className="min-w-0 truncate">
                  {levelCapLocation(next, lang)}
                  {levelCapBadge(next, lang) ? ` · ${levelCapBadge(next, lang)}` : ""}
                </span>
              </p>
            </div>
            {/* The focal column: the number checked before the fight, and the
                button that ticks it off right under it. */}
            <div className="flex flex-col items-start gap-3 sm:items-end sm:text-right">
              {(next.max_level !== null || next.skippedLevel !== undefined) && (
                <div>
                  <CapFigure cap={next} offset={teamOffset} size="lg" lang={lang} />
                  <p className="mt-1.5 text-xs text-ink-subtle">
                    {next.max_level !== null
                      ? teamOffset > 0
                        ? `${t.maxLevel} / ${t.teamRest}`
                        : t.maxLevel
                      : t.noCap}
                  </p>
                </div>
              )}
              <Button variant="primary" loading={pendingId === next.id} onClick={() => handleToggle(next)}>
                {t.markDone}
              </Button>
            </div>
          </section>
        ) : (
          <section className="flex items-center gap-3 self-start rounded-md border border-success-line bg-success-bg p-4 sm:p-6">
            <CheckIcon className="h-6 w-6 text-success" />
            <h2 className="text-lg font-bold tracking-tight text-ink">{t.allDone}</h2>
          </section>
        )}

        <div className="flex flex-col gap-3">
          {lastWon && (
            <section className="rounded-md border border-line bg-panel p-3">
              <h3 className="flex items-baseline justify-between gap-2 text-xs font-semibold text-ink-muted">
                {t.lastWon}
                {lastWon.wonOn && <span className="font-mono font-normal tabular-nums">{lastWon.wonOn}</span>}
              </h3>
              <p className="mt-1 truncate text-sm font-semibold text-ink">
                {levelCapName(lastWon, lang)}
                <span className="font-normal text-ink-muted"> · {levelCapLocation(lastWon, lang)}</span>
              </p>
              {/* The player's own team, never the opponent's: the same
                  record as the Statistics page's hall of fame. */}
              {lastWon.team && lastWon.team.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2">
                  <h4 className="text-xs text-ink-muted">{t.wonWith}</h4>
                  {players.map((player) => {
                    const members = lastWon.team!.filter((m) => m.player === player);
                    if (members.length === 0) return null;
                    return (
                      <div key={player} className="flex flex-wrap items-center gap-0.5">
                        {players.length > 1 && (
                          <span className="w-full text-xs font-semibold text-ink-muted">{playerLabel(player)}</span>
                        )}
                        {members.map((m, i) => (
                          <PokemonSprite
                            key={`${m.routeId}-${i}`}
                            pokemonId={m.pokemonId}
                            bodyId={m.bodyPokemonId}
                            name={m.fallen ? t.fellInFight(m.name) : m.name}
                            size="sm"
                            className={`h-10 w-10 ${m.fallen ? "grayscale" : ""}`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
          {upNext.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">{t.upNext}</h3>
              <ul className="divide-y divide-line rounded-md border border-line bg-panel">
                {upNext.map((cap) => (
                  <li key={cap.id} className="flex items-center gap-3 px-3 py-2">
                    <TrainerSprite canonicalName={cap.sprite ?? cap.names.de} displayName={levelCapName(cap, lang)} trainerSet={trainerSet} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{levelCapName(cap, lang)}</span>
                      <span className="block truncate text-xs text-ink-muted">{levelCapLocation(cap, lang)}</span>
                    </span>
                    <CapFigure cap={cap} offset={teamOffset} size="sm" lang={lang} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
