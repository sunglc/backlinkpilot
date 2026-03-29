export const SUPABASE_AUTH_STORAGE_KEY = "bp-auth-v2";

export const SUPABASE_AUTH_COOKIE_OPTIONS = {
  name: SUPABASE_AUTH_STORAGE_KEY,
} as const;

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
  if (!legacyKey) {
    return [];
  }

  return cookieNames.filter(
    (name) => name === legacyKey || name.startsWith(`${legacyKey}.`)
  );
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
