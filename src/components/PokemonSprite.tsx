"use client";

import { useState } from "react";
import { getPokemonSpriteUrls, placeholderSpriteBase } from "@/lib/sprites";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { useSpriteSet, useFusionSprites, type FusionSpriteConfig } from "@/components/SpriteSetProvider";
import { useExternalImagesAllowed } from "@/components/SpriteConsentProvider";

const SIZES = {
  sm: 32,
  md: 48,
  // The Team tab's Box column: a 64px Gen-3 sprite at its own size.
  base: 64,
  lg: 96,
  xl: 140,
} as const;

// Ordered fallback chain of candidate URLs for one sprite. Infinite Fusion
// only (see CLAUDE.md): a hand-drawn fan sprite first, then the algorithmic
// blend (fusions only - there is nothing to "generate" for a single
// species), then the locally-downloaded set (works for ids <= 649, 404s
// above that - the CDN is this pack's only real coverage past FireRed/
// LeafGreen's own dex), so every pack ends up with at least one candidate.
function spriteCandidates(
  pokemonId: number,
  bodyId: number | null,
  spriteSet: string,
  fusion: FusionSpriteConfig | null,
): string[] {
  const candidates: string[] = [];
  if (fusion) {
    const headIf = fusion.ifIdByOurId[pokemonId];
    if (bodyId != null) {
      const bodyIf = fusion.ifIdByOurId[bodyId];
      if (headIf != null && bodyIf != null) {
        candidates.push(`${fusion.spriteBase}/${fusion.customPath}/${headIf}.${bodyIf}.png`);
        candidates.push(`${fusion.spriteBase}/${fusion.generatedPath}/${headIf}.${bodyIf}.png`);
      }
    } else if (headIf != null) {
      candidates.push(`${fusion.spriteBase}/${fusion.customPath}/${headIf}.png`);
    }
  }
  candidates.push(...getPokemonSpriteUrls(pokemonId, spriteSet));
  return candidates;
}

// Sprites are served locally from /public/pokemon-sprites (downloaded once via
// scripts/download-sprites.mjs), so they load instantly and reliably.
//
// We deliberately do NOT hide the <img> until onLoad. That old guard - added
// back when sprites were hotlinked from a throttling CDN and the browser would
// flash the alt text - actually breaks with local images: a cached sprite can
// finish loading before React attaches the onLoad handler, so the event never
// fires and the element stayed stuck at visibility:hidden (blank until the
// component happened to remount, e.g. on a tab switch). Rendering the image
// directly avoids that race entirely; we only swap in a "?" tile on a genuine
// load error, tracked per-identity so an evolution/fusion change to a working
// sprite recovers.
//
// `bodyId` re-introduces a hotlinked CDN for Infinite Fusion fusions/singles
// past this app's own dex (see spriteCandidates above) - the per-identity
// tracking below doubles as the multi-candidate fallback's position, not just
// a single failed/ok flag, so a dead custom-art URL still tries the
// algorithmic blend and the local set before giving up.
export function PokemonSprite({
  pokemonId,
  bodyId = null,
  name,
  size = "md",
  className = "",
}: {
  pokemonId: number;
  // Infinite Fusion only: the donor's currentPokemonId, when this card is a
  // fusion. null (the default) renders a single species exactly as before.
  bodyId?: number | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const spriteSet = useSpriteSet();
  const fusion = useFusionSprites();
  const externalImages = useExternalImagesAllowed();
  const identity = `${pokemonId}:${bodyId ?? ""}`;
  const [failedStage, setFailedStage] = useState<{ identity: string; stage: number } | null>(null);
  const stage = failedStage && failedStage.identity === identity ? failedStage.stage : 0;
  const px = SIZES[size];

  const candidates = spriteCandidates(pokemonId, bodyId, spriteSet, fusion);

  // A public instance requests nothing from third-party servers until the
  // visitor agrees (src/lib/spriteConsent.ts): every candidate is one.
  if (!externalImages || stage >= candidates.length) {
    return (
      <div
        style={{ width: px, height: px }}
        className={`flex shrink-0 items-center justify-center rounded-md bg-sunken text-xs text-ink-subtle ${className}`}
      >
        ?
      </div>
    );
  }

  const src = candidates[stage];
  const isHotlinked = src.startsWith("http");
  const image = (imgClass: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      referrerPolicy={isHotlinked ? "no-referrer" : undefined}
      onError={() => setFailedStage({ identity, stage: stage + 1 })}
      style={{ imageRendering: "pixelated" }}
      className={imgClass}
    />
  );

  // A ROM hack's own form shows its base species' sprite (src/lib/sprites.ts),
  // faded and labelled as a placeholder, so nobody takes it for the real art.
  // Only the picture fades - the label stays at full contrast.
  if (bodyId == null && placeholderSpriteBase(pokemonId) !== null) {
    return (
      <PlaceholderSprite px={px} small={size === "sm"} className={className}>
        {image("opacity-60")}
      </PlaceholderSprite>
    );
  }

  return image(`shrink-0 ${className}`);
}

function PlaceholderSprite({
  px,
  small,
  className,
  children,
}: {
  px: number;
  small: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const { lang } = useLanguage();
  const t = translations[lang].dataNotice;
  return (
    <span
      style={{ width: px, height: px }}
      className={`relative inline-flex shrink-0 ${className}`}
      title={t.spritePlaceholderTitle}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center leading-none"
      >
        <span className="origin-bottom scale-75 rounded-sm bg-panel px-1 text-xs font-medium text-ink-muted">
          {small ? "≈" : t.spritePlaceholder}
        </span>
      </span>
    </span>
  );
}
