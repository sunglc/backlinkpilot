"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import LocaleToggle from "@/components/locale-toggle";
import {
  buildAuthCallbackUrl,
  signupHrefForNext,
  type AuthIntent,
} from "@/lib/auth-return";
import type { Locale } from "@/lib/locale-config";
import { createClient } from "@/lib/supabase-browser";

function getLoginCopy(locale: Locale, authIntent: AuthIntent) {
  if (locale === "zh") {
    const context =
      authIntent === "checkout_success"
        ? {
            eyebrow: "付款已完成",
            heading: "登录后，直接开始第一条 live 渠道。",
            intro:
              "计划已经解锁。登录后会回到刚才的工作台，不会把你的付款返回路径丢掉。",
          }
        : authIntent === "checkout_cancelled"
          ? {
              eyebrow: "继续结账流程",
              heading: "登录后，回到刚才的升级工作台继续推进。",
              intro:
                "产品、推荐渠道和升级入口都还在。登录后会直接带你回到原来的工作台。",
            }
          : authIntent === "product"
            ? {
                eyebrow: "继续这个产品",
                heading: "登录后，回到这个产品页继续执行。",
                intro:
                  "当前产品的执行历史、推荐渠道和结果证明都会保留。登录后直接回到刚才那一页。",
              }
            : {
                eyebrow: "继续推进你的外链分发",
                heading: "让产品页更快进入真实外链执行。",
                intro:
                  "登录后，你可以继续配置产品、自动识别站点文案，并在准备好时启动真实的目录与 stealth 渠道。",
              };

    return {
      title: "登录",
      eyebrow: context.eyebrow,
      heading: context.heading,
      intro: context.intro,
      bullets: [
        "先免费完成首个产品配置",
        "自动识别产品名称与描述",
        "准备好后再升级进入真实提交",
      ],
      google: "使用 Google 继续",
      divider: "或",
      email: "邮箱",
      password: "密码",
      submit: "登录",
      submitting: "登录中...",
      googleSubmitting: "正在跳转到 Google...",
      authFailed: "登录回调没有成功完成，请重新试一次。",
      noAccount: "还没有账号？",
      signup: "注册",
      backHome: "返回首页",
    };
  }

  const context =
    authIntent === "checkout_success"
      ? {
          eyebrow: "Payment received",
          heading: "Log in and start the first live lane immediately.",
          intro:
            "The plan is already unlocked. After login, you should land back in the launch workspace instead of losing the payment return path.",
        }
      : authIntent === "checkout_cancelled"
        ? {
            eyebrow: "Continue checkout",
            heading: "Log in and return to the upgrade workspace.",
            intro:
              "Your product, recommended lanes, and upgrade entry are still there. Login should take you straight back to that workspace.",
          }
        : authIntent === "product"
          ? {
              eyebrow: "Resume this product",
              heading: "Log in and go straight back to this execution page.",
              intro:
                "The product history, recommended lanes, and result proof stay intact. After login, you should return to the same product page.",
            }
          : {
              eyebrow: "Resume your backlink launch",
              heading: "Bring your product back into live submission flow.",
              intro:
                "Sign in to continue product setup, auto-detect site copy, and unlock real directory and stealth execution when you are ready.",
            };

  return {
    title: "Log in",
    eyebrow: context.eyebrow,
    heading: context.heading,
    intro: context.intro,
    bullets: [
      "Set up your first product for free",
      "Auto-detect product name and description",
      "Upgrade only when you want live submissions",
    ],
    google: "Continue with Google",
    divider: "or",
    email: "Email",
    password: "Password",
    submit: "Log in",
    submitting: "Logging in...",
    googleSubmitting: "Redirecting to Google...",
    authFailed: "The sign-in callback did not finish correctly. Please try again.",
    noAccount: "Don't have an account?",
    signup: "Sign up",
    backHome: "Back to home",
  };
}

export default function LoginClient({
  locale,
  nextPath,
  authIntent,
  initialError,
}: {
  locale: Locale;
  nextPath: string;
  authIntent: AuthIntent;
  initialError: string;
}) {
  const copy = getLoginCopy(locale, authIntent);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    initialError === "auth_failed" ? copy.authFailed : initialError
  );
  const [loadingMode, setLoadingMode] = useState<"password" | "google" | null>(
    null
  );
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoadingMode("password");
    setError("");

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoadingMode(null);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoadingMode("google");
    setError("");
    const supabase = createClient();

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(nextPath),
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoadingMode(null);
      }
    } catch (oauthError) {
      setError(
        oauthError instanceof Error ? oauthError.message : copy.authFailed
      );
      setLoadingMode(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 px-5 py-8 text-stone-100 md:px-8">
      <div className="bp-grid absolute inset-0 opacity-35" />
      <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.16),transparent_60%)]" />
      <div className="absolute -left-20 top-44 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-emerald-300/8 blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl justify-end">
        <LocaleToggle locale={locale} />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_0.8fr] lg:items-center">
        <section className="bp-fade-up">
          <Link
            href="/"
            className="inline-flex text-sm font-medium uppercase tracking-[0.28em] text-stone-300"
          >
            BacklinkPilot
          </Link>
          <p className="mt-10 text-xs font-medium uppercase tracking-[0.32em] text-amber-200/80">
            {copy.eyebrow}
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-5xl leading-[0.95] text-stone-50 md:text-7xl">
            {copy.heading}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
            {copy.intro}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {copy.bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-[1.35rem] border border-[var(--line-soft)] bg-white/[0.04] p-4 text-sm leading-6 text-stone-300"
              >
                {bullet}
              </div>
            ))}
          </div>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
          >
            {copy.backHome}
          </Link>
        </section>

        <section className="bp-fade-up bp-fade-delay-1">
          <div className="rounded-[2rem] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
            <h2 className="text-2xl font-semibold text-stone-50">{copy.title}</h2>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingMode !== null}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loadingMode === "google" ? copy.googleSubmitting : copy.google}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--line-soft)]" />
              <span className="text-xs uppercase tracking-[0.24em] text-stone-500">
                {copy.divider}
              </span>
              <div className="h-px flex-1 bg-[var(--line-soft)]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-stone-400">
                  {copy.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-stone-400">
                  {copy.password}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                />
              </div>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button
                type="submit"
                disabled={loadingMode !== null}
                className="w-full rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
              >
                {loadingMode === "password" ? copy.submitting : copy.submit}
              </button>
            </form>

            <p className="mt-6 text-sm text-stone-500">
              {copy.noAccount}{" "}
              <Link
                href={signupHrefForNext(nextPath)}
                className="text-amber-200 transition hover:text-amber-100"
              >
                {copy.signup}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
