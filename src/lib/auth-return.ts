import { getPublicAppUrl } from "@/lib/app-url";

export type AuthIntent =
  | "default"
  | "dashboard"
  | "product"
  | "checkout_success"
  | "checkout_cancelled";

type SearchValue = string | string[] | undefined;

export function normalizeNextPath(
  input: string | null | undefined,
  fallback = "/dashboard"
) {
  if (!input) {
    return fallback;
  }

  if (!input.startsWith("/") || input.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(input, "http://backlinkpilot.local");
    if (url.origin !== "http://backlinkpilot.local") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function resolveAuthNextPath(params: {
  next?: SearchValue;
  checkout?: SearchValue;
}) {
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  const checkoutRaw = Array.isArray(params.checkout)
    ? params.checkout[0]
    : params.checkout;

  if (nextRaw) {
    return normalizeNextPath(nextRaw);
  }

  if (checkoutRaw === "success" || checkoutRaw === "cancelled") {
    return `/dashboard?checkout=${checkoutRaw}`;
  }

  return "/dashboard";
}

export function authIntentFromNextPath(nextPath: string): AuthIntent {
  if (nextPath.includes("checkout=success")) {
    return "checkout_success";
  }

  if (nextPath.includes("checkout=cancelled")) {
    return "checkout_cancelled";
  }

  if (nextPath.startsWith("/dashboard/product/")) {
    return "product";
  }

  if (nextPath.startsWith("/dashboard")) {
    return "dashboard";
  }

  return "default";
}

export function loginHrefForNext(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function signupHrefForNext(nextPath: string) {
  return `/signup?next=${encodeURIComponent(nextPath)}`;
}

export function buildAuthCallbackUrl(nextPath?: string | null) {
  const callbackUrl = new URL("/auth/callback", getPublicAppUrl());
  callbackUrl.searchParams.set("next", normalizeNextPath(nextPath));
  return callbackUrl.toString();
}
