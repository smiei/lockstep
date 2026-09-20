// Whether the browser may request images from servers this deployment does not
// control, client-safe and pure.
//
// A public instance shows Pokémon artwork by pointing the visitor's browser at
// PokeAPI's sprite mirror on GitHub (and, for Infinite Fusion runs, at the
// community's sprite server): nothing passes through this deployment, so it
// hosts no Nintendo artwork - but those servers see every visitor's IP address.
// That is a transfer to a third party which the visitor has to agree to first,
// so nothing is requested until they do. A private instance is one group's own
// server and never asks.
//
// The choice lives in the browser (localStorage), like the other per-device
// preferences; see SpriteConsentProvider.
export type SpriteConsent = "granted" | "denied";

export const SPRITE_CONSENT_KEY = "nuzlocke:spriteConsent";

export function externalImagesAllowed(isPublicInstance: boolean, consent: SpriteConsent | null): boolean {
  return !isPublicInstance || consent === "granted";
}
