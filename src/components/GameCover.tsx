"use client";

import { useExternalImagesAllowed } from "@/components/SpriteConsentProvider";
import { cn } from "@/components/ui/cn";

// A game's cover (GameSummary.cover, decided on the server), or - for a game
// without one, and on a public instance before images from other hosts are
// allowed - a drawn tile with the game's name, ruled like a specimen label.
// The picture is decoration next to the name, so it carries no alt text of
// its own; the tile's name is hidden from screen readers for the same reason.
const SIZES = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
} as const;

export function GameCover({
  src,
  name,
  size = "md",
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const externalImages = useExternalImagesAllowed();
  const external = Boolean(src && /^https?:/.test(src));
  const frame = cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-sunken", SIZES[size], className);

  if (src && (!external || externalImages)) {
    return (
      <span className={cn(frame, "p-1")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span className={cn(frame, "border-y-[3px] border-double border-line-strong px-1")} aria-hidden="true">
      <span className="line-clamp-3 break-words text-center font-mono text-xs leading-tight text-ink-muted">{name}</span>
    </span>
  );
}
