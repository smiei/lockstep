import badgeSheet from "../../data/badges.json";

// Matches slug() in scripts/download-badges.mjs - the filename each badge's
// icon is downloaded/cropped to under public/badges/<slug>.png.
export function badgeSlug(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The badges scripts/download-badges.mjs can crop from its sheet (data/
// badges.json, Kanto to Unova). Any other badge (Kalos onward, and Black 2/
// White 2's own) has no artwork, so BadgeIcon draws its default medal straight
// away instead of requesting a file that cannot exist.
const BADGES_WITH_ARTWORK = new Set(
  Object.values(badgeSheet as Record<string, string[]>)
    .flat()
    .map(badgeSlug),
);

export function hasBadgeArtwork(nameEn: string): boolean {
  return BADGES_WITH_ARTWORK.has(badgeSlug(nameEn));
}
