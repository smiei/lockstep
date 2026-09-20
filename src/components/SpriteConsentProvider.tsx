"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { usePersistentState } from "@/lib/usePersistentState";
import { SPRITE_CONSENT_KEY, externalImagesAllowed, type SpriteConsent } from "@/lib/spriteConsent";

type SpriteConsentValue = {
  // May the browser request images from third-party servers right now?
  allowed: boolean;
  consent: SpriteConsent | null;
  // False until the stored choice has been read: server rendering and the
  // hydration pass cannot see localStorage, and asking before that would flash
  // the question at everybody who answered it long ago.
  ready: boolean;
  set: (consent: SpriteConsent) => void;
};

// With no provider above (a test, a stray render) the safe answer applies: a
// public instance requests nothing.
const FALLBACK: SpriteConsentValue = {
  allowed: externalImagesAllowed(IS_PUBLIC_INSTANCE, null),
  consent: null,
  ready: true,
  set: () => {},
};

const SpriteConsentContext = createContext<SpriteConsentValue>(FALLBACK);

const noSubscription = () => () => {};

// One place reads the stored choice; hundreds of sprites on a Pokédex page ask
// the context instead of each subscribing to storage themselves.
export function SpriteConsentProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistentState<SpriteConsent | null>(SPRITE_CONSENT_KEY, null);
  const ready = useSyncExternalStore(noSubscription, () => true, () => false);
  const consent = stored === "granted" || stored === "denied" ? stored : null;

  const value = useMemo<SpriteConsentValue>(
    () => ({
      allowed: externalImagesAllowed(IS_PUBLIC_INSTANCE, consent),
      consent,
      ready,
      set: (next) => setStored(next),
    }),
    [consent, ready, setStored],
  );
  return <SpriteConsentContext.Provider value={value}>{children}</SpriteConsentContext.Provider>;
}

export function useSpriteConsent(): SpriteConsentValue {
  return useContext(SpriteConsentContext);
}

// What every component that would request a third-party image asks first.
export function useExternalImagesAllowed(): boolean {
  return useContext(SpriteConsentContext).allowed;
}
