"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LevelCap } from "@/lib/data";
import type { Lang } from "@/lib/i18n/dictionary";
import { translations } from "@/lib/i18n/dictionary";
import { levelCapName, levelCapLocation, levelCapBadge } from "@/lib/i18n/localize";
import { formatActionError } from "@/lib/actionErrors";
import { TrainerSprite } from "@/components/TrainerSprite";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Page";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { toggleLevelCapDefeated } from "@/lib/actions";
import { ChevronDownIcon } from "@/components/ActionIcons";

// The two regions' names read the same in every language the app speaks.
const REGION_LABELS = { main: "Johto", kanto: "Kanto" } as const;

// A divider between the regions of a game that has two (HeartGold/SoulSilver),
// the same as on the Encounter tab.
function RegionHeading({ label }: { label: string }) {
  return (
    <h2 className="mb-2 mt-6 flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted first:mt-0">
      <span>{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
    </h2>
  );
}

type LevelCapWithProgress = LevelCap & { defeated: boolean };

export function LevelCapsView({
  runKey,
  lang,
  levelCaps,
  trainerSet,
  includeKanto = true,
}: {
  runKey: string;
  lang: Lang;
  levelCaps: LevelCapWithProgress[];
  // The run's includeKanto rule (src/lib/regions.ts): off, the Kanto fights
  // are post-game and start collapsed, as on the Encounter tab.
  includeKanto?: boolean;
  // Folder under public/trainers/ for game-specific avatars (see TrainerSprite).
  trainerSet: string;
}) {
  const router = useRouter();
  const t = translations[lang].levelcaps;
  const toast = useToast();
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [showPostgame, setShowPostgame] = useState(false);
  const [, startTransition] = useTransition();

  function handleToggle(cap: LevelCapWithProgress) {
    const current = overrides[cap.id] ?? cap.defeated;
    setOverrides((prev) => ({ ...prev, [cap.id]: !current }));
    setPendingId(cap.id);
    startTransition(async () => {
      const result = await toggleLevelCapDefeated(runKey, cap.id);
      if (result.success) {
        setOverrides((prev) => ({ ...prev, [cap.id]: result.defeated }));
        router.refresh();
      } else {
        // Previously the optimistic flip was rolled back in silence, so a
        // failed toggle looked exactly like a tap that never registered.
        setOverrides((prev) => ({ ...prev, [cap.id]: current }));
        toast.error(formatActionError(result.error, lang));
      }
      setPendingId(null);
    });
  }

  if (levelCaps.length === 0) {
    return <EmptyState title={t.empty} />;
  }

  const firstRegion = levelCaps.filter((cap) => cap.region !== "kanto");
  const kanto = levelCaps.filter((cap) => cap.region === "kanto");

  const renderCard = (caps: LevelCapWithProgress[]) => (
    <Card padding="none" className="divide-y divide-line overflow-hidden">
      {caps.map((cap) => {
        const defeated = overrides[cap.id] ?? cap.defeated;
        const pending = pendingId === cap.id;
        const name = levelCapName(cap, lang);
        const location = levelCapLocation(cap, lang);
        const badge = levelCapBadge(cap, lang);
        return (
          <button
            key={cap.id}
            type="button"
            disabled={pending}
            aria-pressed={defeated}
            onClick={() => handleToggle(cap)}
            // A defeated entry recedes through its tint, the strike-through, the
            // muted text and the faded picture - not through opacity on the
            // whole row, which took its text down to 1.6:1. The tint is green:
            // a beaten leader is progress, and red only ever means a death.
            className={`flex w-full items-center gap-4 p-3 text-left transition-colors disabled:opacity-70 sm:p-4 ${
              defeated ? "bg-success-bg/70" : "hover:bg-hover"
            }`}
          >
            {/* Sprite files are slugged from the canonical German name; the
                trainerSet folder allows game-specific art (e.g. the rival). */}
            <span className={`shrink-0 ${defeated ? "opacity-50" : ""}`}>
              <TrainerSprite
                canonicalName={cap.sprite ?? cap.names.de}
                displayName={name}
                trainerSet={trainerSet}
                size={88}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={`truncate font-medium ${defeated ? "text-ink-muted line-through" : "text-ink"}`}
              >
                {name}
              </div>
              <div className="truncate text-xs text-ink-muted">
                {location}
                {badge ? ` \u00b7 ${badge}` : ""}
              </div>
            </div>
            {pending && <Spinner className="shrink-0 text-ink-muted" />}
            {cap.max_level !== null && (
              <div className="shrink-0 text-right">
                {/* "cap / cap-2": one team member may reach the cap, the rest
                    stay two levels below (house rule). */}
                <div
                  className={`font-mono text-lg font-semibold tabular-nums ${defeated ? "text-ink-muted" : "text-ink"}`}
                >
                  {cap.max_level}
                  <span className="text-ink-subtle"> / {cap.max_level - 2}</span>
                </div>
                <div className="text-xs text-ink-subtle">{t.maxLevel}</div>
              </div>
            )}
          </button>
        );
      })}
    </Card>
  );

  if (kanto.length === 0) return renderCard(levelCaps);
  if (includeKanto) {
    return (
      <div>
        <RegionHeading label={REGION_LABELS.main} />
        {renderCard(firstRegion)}
        <RegionHeading label={REGION_LABELS.kanto} />
        {renderCard(kanto)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {renderCard(firstRegion)}
      <button
        type="button"
        onClick={() => setShowPostgame((v) => !v)}
        aria-expanded={showPostgame}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong p-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showPostgame ? "" : "-rotate-90"}`}
        />
        {showPostgame ? t.postgameHide : t.postgameShow(kanto.length)}
      </button>
      {showPostgame && renderCard(kanto)}
    </div>
  );
}
