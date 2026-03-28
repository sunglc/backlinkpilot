export const FALLBACK_CANONICAL_APP_URL = "http://47.77.177.156:3000";

export function getCanonicalAppUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const appUrl =
    !configuredAppUrl || configuredAppUrl.includes("backlinkpilot.vercel.app")
      ? FALLBACK_CANONICAL_APP_URL
      : configuredAppUrl;

  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}
