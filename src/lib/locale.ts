import "server-only";

import { cookies } from "next/headers";

import { normalizeLocale, type Locale } from "@/lib/locale-config";

export type { Locale } from "@/lib/locale-config";
export { LOCALE_COOKIE_NAME } from "@/lib/locale-config";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("bp_locale")?.value);
}
