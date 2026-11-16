"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};
const readTrue = () => true;
const readFalse = () => false;

// False while rendering on the server and during hydration, true afterwards -
// for values only the browser knows (the stored theme, an install prompt),
// without a mounted flag held in state and set from an effect.
export function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, readTrue, readFalse);
}
