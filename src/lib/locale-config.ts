export type Locale = "en" | "zh";

export const LOCALE_COOKIE_NAME = "bp_locale";

export function normalizeLocale(value?: string | null): Locale {
  return value === "zh" ? "zh" : "en";
}
