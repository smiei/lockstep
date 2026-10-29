"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { useTabOrder } from "@/components/TabOrderProvider";
import { NavIcon } from "@/components/NavIcon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const run = searchParams.get("run");
  const { lang } = useLanguage();
  const { order, hidden } = useTabOrder();
  const t = translations[lang].nav;

  const items = order
    .map((href) => NAV_ITEMS.find((item) => item.href === href))
    .filter((item): item is (typeof NAV_ITEMS)[number] => item !== undefined)
    .filter((item) => !hidden.includes(item.href));

  // On a phone the strip scrolls sideways and only the first four or five tabs
  // fit, so opening Reise, Pokédex, TMs or Regeln used to leave the active tab
  // off-screen. Bring it into view - by moving the strip's own scroll position,
  // not with scrollIntoView, which could also scroll the page vertically.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const strip = nav.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    const margin = 16; // the strip's px-4, so the tab does not sit flush
    if (tab.left < strip.left) nav.scrollLeft += tab.left - strip.left - margin;
    else if (tab.right > strip.right) nav.scrollLeft += tab.right - strip.right + margin;
  }, [pathname, order, hidden]);

  return (
    <nav
      ref={navRef}
      className="flex justify-center-safe gap-1 overflow-x-auto px-4 sm:px-6 lg:flex-col lg:justify-start lg:gap-0.5 lg:overflow-visible lg:px-3"
    >
      {items.map((item) => {
        const isActive = pathname === item.href;
        const href = run ? `${item.href}?run=${run}` : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            // Icon over label: eight near-identical text labels are slow to
            // pick out, a shape is recognised without reading. The icon takes
            // its colour from the link, so the active/inactive states below
            // still drive everything.
            // active: gives the tap something to acknowledge in the moment before the
            // route commits. With loading.tsx in place that gap is now short, but
            // on a slow tunnel it is still perceptible.
            // From lg up the strip is the rail's vertical list: icon beside
            // the label, and the active tab a pale label on the green field
            // instead of an underline.
            className={`flex min-w-16 shrink-0 flex-col items-center gap-1 whitespace-nowrap border-b-2 px-3 pt-2 pb-2 text-xs font-medium transition-colors active:bg-hover lg:h-10 lg:min-w-0 lg:flex-row lg:gap-3 lg:rounded-md lg:border-b-0 lg:px-3 lg:py-0 lg:text-sm ${
              isActive
                ? "border-ink text-ink lg:bg-accent lg:font-semibold lg:text-accent-ink"
                : "border-transparent text-ink-muted hover:text-ink lg:hover:bg-hover"
            }`}
          >
            <NavIcon href={item.href} className="h-5 w-5" />
            {t[item.labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}
