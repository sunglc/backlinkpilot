export const SUPABASE_AUTH_STORAGE_KEY = "bp-auth-v2";

export const SUPABASE_AUTH_COOKIE_OPTIONS = {
  name: SUPABASE_AUTH_STORAGE_KEY,
} as const;

const LEGACY_SUPABASE_STORAGE_PATTERNS = [
  /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i,
  /^sb-[a-z0-9]+-auth-token-code-verifier(?:\.\d+)?$/i,
  /^sb-[a-z0-9]+-auth-token-user(?:\.\d+)?$/i,
];

export function getLegacySupabaseAuthStorageKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    return null;
  }

  try {
    const hostname = new URL(supabaseUrl).hostname.split(".")[0];
    if (!hostname) {
      return null;
    }

    const legacyKey = `sb-${hostname}-auth-token`;
    return legacyKey === SUPABASE_AUTH_STORAGE_KEY ? null : legacyKey;
  } catch {
    return null;
  }
}

export function getLegacySupabaseAuthCookieNames(cookieNames: string[]) {
  const legacyKey = getLegacySupabaseAuthStorageKey();
  const names = new Set(
    cookieNames.filter((name) =>
      LEGACY_SUPABASE_STORAGE_PATTERNS.some((pattern) => pattern.test(name))
    )
  );

  if (legacyKey) {
    cookieNames
      .filter((name) => name === legacyKey || name.startsWith(`${legacyKey}.`))
      .forEach((name) => names.add(name));
  }

  return [...names];
}

export function applyLegacySupabaseAuthCookieCleanup(
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: {
          maxAge?: number;
          path?: string;
        }
      ) => void;
    };
  },
  cookieNames: string[]
) {
  const legacyCookieNames = getLegacySupabaseAuthCookieNames(cookieNames);

  legacyCookieNames.forEach((name) => {
    response.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
    });
  });
}

export function clearLegacySupabaseBrowserStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const cookieNames = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("=")[0] || "")
    .filter(Boolean);

  getLegacySupabaseAuthCookieNames(cookieNames).forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  });

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      const keys = Object.keys(storage);
      keys.forEach((key) => {
        if (
          LEGACY_SUPABASE_STORAGE_PATTERNS.some((pattern) => pattern.test(key))
        ) {
          storage.removeItem(key);
        }
      });
    } catch {
      // Ignore browser storage access failures.
    }
  });
}
