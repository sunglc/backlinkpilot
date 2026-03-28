export const FALLBACK_CANONICAL_APP_URL = "http://47.77.177.156:3000";

export function getCanonicalAppUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const appUrl =
    !configuredAppUrl || configuredAppUrl.includes("backlinkpilot.vercel.app")
      ? FALLBACK_CANONICAL_APP_URL
      : configuredAppUrl;

  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}

export function getRequestAppUrl(request: { headers: Headers; url: string }) {
  const requestUrl = new URL(request.url);
  const forwardedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ||
    requestUrl.protocol.replace(":", "") ||
    "http";
  const normalizedHost = forwardedHost.trim().toLowerCase();

  if (
    normalizedHost &&
    !normalizedHost.startsWith("0.0.0.0") &&
    !normalizedHost.startsWith("127.0.0.1") &&
    !normalizedHost.startsWith("localhost")
  ) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  return getCanonicalAppUrl();
}
