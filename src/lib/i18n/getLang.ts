import { cookies, headers } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/i18n/dictionary";
import { parseAcceptLanguage, pickLang, runtimeConfigFromEnv } from "@/lib/runtimeConfig";

// Only for pages that are already force-dynamic (tracker/links/levelcaps) -
// cookies() is a request-time API and reading it anywhere in a route (even
// Suspense-wrapped) forces that whole route out of static rendering, unlike
// useSearchParams() in a Client Component. Never call this from layout.tsx
// or the pokedex/typen pages, or they'd lose static prerendering.
//
// Order: the device's own choice (cookie) -> the server's DEFAULT_LANGUAGE ->
// the browser's languages (Accept-Language) -> German. An installed app sets
// the cookie to the device language on its first start (LanguageProvider),
// because a request cannot tell the app from a browser tab.
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  if (isLang(value)) return value;
  const configured = runtimeConfigFromEnv().lang;
  if (configured) return configured;
  const accept = (await headers()).get("accept-language");
  return pickLang(parseAcceptLanguage(accept)) ?? "de";
}
