// Whether the desktop side rail is folded away - per device, like the other
// UI preferences. Kept out of the "use client" component so layout.tsx (a
// server component) can inline the boot script.
export const RAIL_COLLAPSED_KEY = "nuzlocke:railCollapsed";

// Runs before first paint, like the UI-size and shell-colour scripts, so a
// folded rail never flashes open on load.
export function railBootScript(): string {
  return (
    "(function(){try{if(JSON.parse(localStorage.getItem(" +
    JSON.stringify(RAIL_COLLAPSED_KEY) +
    '))===true)document.documentElement.setAttribute("data-rail","collapsed")}catch(e){}})();'
  );
}

export function setRailCollapsed(collapsed: boolean) {
  if (collapsed) document.documentElement.setAttribute("data-rail", "collapsed");
  else document.documentElement.removeAttribute("data-rail");
  try {
    localStorage.setItem(RAIL_COLLAPSED_KEY, JSON.stringify(collapsed));
  } catch {
    // Storage unavailable - the rail still folds for this page view.
  }
}
