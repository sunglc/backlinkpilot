import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCanonicalAppUrl } from "@/lib/app-url";
import {
  loginHrefForNext,
  resolveAuthNextPath,
} from "@/lib/auth-return";

export async function middleware(request: NextRequest) {
  const canonicalAppUrl = getCanonicalAppUrl();
  const requestHosts = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    request.nextUrl.hostname,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());
  const isLegacyVercelRequest = requestHosts.some((value) =>
    value.includes("vercel.app")
  );

  if (
    isLegacyVercelRequest &&
    !canonicalAppUrl.includes("backlinkpilot.vercel.app")
  ) {
    const redirectUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonicalAppUrl
    );
    return NextResponse.redirect(redirectUrl);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.href = new URL(loginHrefForNext(nextPath), request.url).toString();
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const nextPath = resolveAuthNextPath({
      next: request.nextUrl.searchParams.get("next") ?? undefined,
      checkout: request.nextUrl.searchParams.get("checkout") ?? undefined,
    });
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/pricing",
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/backlink-automation-tool",
    "/directory-submission-tool",
  ],
};
