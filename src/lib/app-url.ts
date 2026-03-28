export const FALLBACK_CANONICAL_APP_URL = "http://47.77.177.156:3000";

export function getCanonicalAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || FALLBACK_CANONICAL_APP_URL;
  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}
