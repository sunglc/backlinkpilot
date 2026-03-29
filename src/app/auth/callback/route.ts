import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeNextPath } from "@/lib/auth-return";
import { getRequestAppUrl } from "@/lib/app-url";

function buildLoginErrorRedirect(
  appUrl: string,
  next: string,
  errorMessage: string
) {
  const redirectUrl = new URL("/login", appUrl);
  redirectUrl.searchParams.set("next", next);
  redirectUrl.searchParams.set("error", errorMessage);
  return redirectUrl;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = normalizeNextPath(searchParams.get("next"));
  const appUrl = getRequestAppUrl(request);
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      buildLoginErrorRedirect(appUrl, next, providerError)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component — ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }

    return NextResponse.redirect(
      buildLoginErrorRedirect(appUrl, next, error.message || "auth_failed")
    );
  }

  return NextResponse.redirect(buildLoginErrorRedirect(appUrl, next, "auth_failed"));
}
