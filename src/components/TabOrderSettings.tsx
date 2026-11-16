"use client";

import { NAV_ITEMS } from "@/lib/nav";
import { useTabOrder } from "@/components/TabOrderProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon } from "@/components/ActionIcons";

// The Settings page's tab block: reorder the nav tabs and hide the ones this
// device does not need.
export function TabOrderSettings() {
  const { order, setOrder, hidden, toggleHidden, reset, isDefault } = useTabOrder();
  const { lang } = useLanguage();
  const t = translations[lang].tabOrder;
  const tNav = translations[lang].nav;

  const items = order
    .map((href) => NAV_ITEMS.find((item) => item.href === href))
    .filter((item): item is (typeof NAV_ITEMS)[number] => item !== undefined);

  function move(index: number, delta: -1 | 1) {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  return (
    <div>
      <p className="mb-3 text-xs text-ink-subtle">{t.visibilityHint}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => {
          const isHidden = hidden.includes(item.href);
          return (
            <li key={item.href} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-1.5 text-sm">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => toggleHidden(item.href)}
                  aria-label={isHidden ? t.show : t.hide}
                  className="accent-success"
                />
                {/* A hidden tab is muted and struck through, not faded: text
                    under opacity drops below the contrast floor. */}
                <span className={isHidden ? "truncate text-ink-muted line-through" : "truncate text-ink"}>{tNav[item.labelKey]}</span>
              </label>
              <span className="flex gap-1">
                {/* 40px each: these were ~20px, the smallest targets in the app
                    and the ones you tap repeatedly to reorder a list. */}
                <Button size="sm" iconOnly disabled={i === 0} onClick={() => move(i, -1)} aria-label={t.moveUp} icon={<ChevronDownIcon className="h-4 w-4 rotate-180" />} />
                <Button
                  size="sm"
                  iconOnly
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={t.moveDown}
                  icon={<ChevronDownIcon className="h-4 w-4" />}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={isDefault} onClick={reset}>
          {t.reset}
        </Button>
      </div>
    </div>
  );
}
