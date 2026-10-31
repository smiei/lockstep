import type { Metadata } from "next";
import { getLang } from "@/lib/i18n/getLang";
import { translations } from "@/lib/i18n/dictionary";
import type { NAV_ITEMS } from "@/lib/nav";

type NavLabelKey = (typeof NAV_ITEMS)[number]["labelKey"];

// Per-tab document title, in the visitor's language: every tab used to be
// titled "Nuzlocke SoulLink Tracker" (Lockstep's old name), so the browser's tab strip, history, the
// app switcher and a screen reader announcing the page could not tell them
// apart (WCAG 2.4.2). The root layout's title.template appends the app name.
//
//   export const generateMetadata = tabMetadata("tracker");
export function tabMetadata(labelKey: NavLabelKey): () => Promise<Metadata> {
  return async () => ({ title: translations[await getLang()].nav[labelKey] });
}
