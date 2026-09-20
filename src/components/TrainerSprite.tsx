"use client";

import { useState } from "react";
import { slugify } from "@/lib/slug";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { getTrainerSpriteUrl } from "@/lib/sprites";
import { useExternalImagesAllowed } from "@/components/SpriteConsentProvider";

// A boss trainer's picture. There is no artwork of these in the repository or
// the image, so where it comes from depends on the kind of instance:
//
// A private instance reads files the user provides, trying in order:
//   1. /trainers/<trainerSet>/<slug>.png  - game-specific art (e.g. the rival,
//      which looks different in Emerald vs Platinum). trainerSet is the game's
//      trainerSet (defaults to its id); HeartGold/SoulSilver share one set.
//   2. /trainers/<slug>.png               - shared fallback, so a trainer with
//      the same German name across games (e.g. Brock) needs only one file.
//   3. an initial-letter badge            - when no file is provided at all.
//
// A public instance has no such files and asks Pokémon Showdown's trainer
// sprites instead (src/lib/sprites.ts getTrainerSpriteUrl) - but only once the
// visitor agreed to third-party images (src/lib/spriteConsent.ts), and it
// requests nothing else, so an unmapped trainer or a refusal goes straight to
// the badge instead of two 404s.
//
// canonicalName (always the original German name, or a levelcaps.json `sprite`
// override) drives the lookup - the user's files are named by German slugs
// (rocko.png, not brock.png) - while displayName is whatever language the UI is
// currently showing, used only for the alt text / fallback initial.
export function TrainerSprite({
  canonicalName,
  displayName,
  trainerSet,
  size = 40,
}: {
  canonicalName: string;
  displayName: string;
  trainerSet?: string;
  size?: number;
}) {
  const slug = slugify(canonicalName);
  const externalImages = useExternalImagesAllowed();
  // Ordered candidate URLs.
  let sources: string[];
  if (IS_PUBLIC_INSTANCE) {
    const showdown = externalImages ? getTrainerSpriteUrl(trainerSet, slug) : null;
    sources = showdown ? [showdown] : [];
  } else {
    // Game-specific first, then the shared flat root.
    sources = trainerSet
      ? [`/trainers/${trainerSet}/${slug}.png`, `/trainers/${slug}.png`]
      : [`/trainers/${slug}.png`];
  }
  // Which candidate we're currently attempting; advanced on each load error.
  const [stage, setStage] = useState(0);

  if (stage >= sources.length) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-medium text-ink-subtle"
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // Key on the slug so switching runs/games remounts and retries from stage 0.
      key={`${trainerSet ?? ""}/${slug}`}
      src={sources[stage]}
      alt={displayName}
      width={size}
      height={size}
      loading="lazy"
      // Showdown's sprites are 80x80 pixel art: keep them crisp at 88px, and do
      // not tell that server which page they were shown on.
      referrerPolicy={IS_PUBLIC_INSTANCE ? "no-referrer" : undefined}
      onError={() => setStage((s) => s + 1)}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size, ...(IS_PUBLIC_INSTANCE ? { imageRendering: "pixelated" } : {}) }}
    />
  );
}
