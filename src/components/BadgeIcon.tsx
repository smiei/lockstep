"use client";

import { useState } from "react";
import { badgeSlug, hasBadgeArtwork } from "@/lib/badges";

// Badge icons are served locally from /public/badges (downloaded once via
// scripts/download-badges.mjs). A badge the sheet does not have (Kalos onward)
// gets a drawn default medal at once; one whose file is still missing (fresh
// volume, download failed) falls back to the same medal.
export function BadgeIcon({
  nameEn,
  label,
  earned,
  size = 40,
}: {
  nameEn: string;
  label: string;
  earned: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !hasBadgeArtwork(nameEn)) {
    return <DefaultBadge label={label} earned={earned} size={size} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/badges/${badgeSlug(nameEn)}.png`}
      alt={label}
      title={label}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain transition-[filter,opacity] ${
        earned ? "" : "opacity-40 grayscale"
      }`}
      style={{ width: size, height: size }}
    />
  );
}

// A hexagonal medal with a star: gold once earned, grey before - the colour
// says the state, as the greyed-out artwork does for the real badges.
function DefaultBadge({ label, earned, size }: { label: string; earned: boolean; size: number }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`shrink-0 ${earned ? "text-warning-solid" : "text-line-strong"}`}
    >
      <title>{label}</title>
      <polygon points="20,2 35.6,11 35.6,29 20,38 4.4,29 4.4,11" fill="currentColor" />
      <polygon points="20,6.5 31.7,13.25 31.7,26.75 20,33.5 8.3,26.75 8.3,13.25" className="fill-panel" />
      <polygon
        points="20.0,12.5 21.9,17.4 27.1,17.7 23.0,21.0 24.4,26.1 20.0,23.2 15.6,26.1 17.0,21.0 12.9,17.7 18.1,17.4"
        fill="currentColor"
      />
    </svg>
  );
}
