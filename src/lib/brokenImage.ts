// An <img> whose request failed before React hydrated has already fired its
// error event, so onError never runs and the broken picture stays. A ref
// callback runs at commit, hydration included: an image that is `complete`
// with no pixels has failed (a lazy image that has not started yet is not
// complete). Callers make onBroken idempotent per source, because the late
// error event and this check can both report the same failure.
export function whenBroken(onBroken: () => void): (img: HTMLImageElement | null) => void {
  return (img) => {
    if (img && img.complete && img.naturalWidth === 0) onBroken();
  };
}
