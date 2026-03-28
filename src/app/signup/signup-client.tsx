"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import LocaleToggle from "@/components/locale-toggle";
import {
  loginHrefForNext,
  type AuthIntent,
} from "@/lib/auth-return";
import type { Locale } from "@/lib/locale-config";
import { createClient } from "@/lib/supabase-browser";

function getSignupCopy(locale: Locale, authIntent: AuthIntent) {
  if (locale === "zh") {
    const context =
      authIntent === "checkout_success"
        ? {
            eyebrow: "付款后继续",
            heading: "先创建账号，再直接回到已解锁的工作台。",
            intro:
              "你的付款返回路径会保留。注册后直接回到 launch workspace，开始第一条 live 渠道。",
          }
        : authIntent === "product"
          ? {
              eyebrow: "从这个产品开始",
              heading: "创建账号后，直接回到这个产品页继续执行。",
              intro:
                "不用重新找页面。注册完成后会回到原来的产品执行页，继续启动或查看结果。",
            }
          : {
              eyebrow: "从第一条真实外链开始",
              heading: "先把产品配置清楚，再让执行引擎接手。",
              intro:
                "注册后你可以先免费添加一个产品，自动识别主页文案，确认定位，再决定什么时候进入真实提交执行。",
            };

    return {
      title: "创建账号",
      eyebrow: context.eyebrow,
      heading: context.heading,
      intro: context.intro,
      bullets: [
        "首个产品配置免费",
        "自动识别标题与描述",
        "准备好后再开启真实提交",
      ],
      google: "使用 Google 继续",
      divider: "或",
      email: "邮箱",
      password: "密码",
      submit: "创建账号",
      submitting: "创建中...",
      hasAccount: "已经有账号？",
      login: "登录",
      backHome: "返回首页",
    };
  }

  const context =
    authIntent === "checkout_success"
      ? {
          eyebrow: "Continue after payment",
          heading: "Create the account, then jump straight back into the unlocked workspace.",
          intro:
            "The payment return path stays intact. After signup, you should land back in the launch workspace and start the first live lane.",
        }
      : authIntent === "product"
        ? {
            eyebrow: "Start from this product",
            heading: "Create the account, then return directly to this product page.",
            intro:
              "No need to hunt for the page again. After signup, you should land back on the same product execution view.",
          }
        : {
            eyebrow: "Start with your first real backlink flow",
            heading: "Set up the product clearly, then let the engine execute.",
            intro:
              "Create an account to add your first product for free, auto-detect homepage copy, confirm the positioning, and upgrade only when you want live submissions.",
          };

  return {
    title: "Create account",
    eyebrow: context.eyebrow,
    heading: context.heading,
    intro: context.intro,
    bullets: [
      "Free first-product setup",
      "Auto-detect title and description",
      "Upgrade only when live execution matters",
    ],
    google: "Continue with Google",
    divider: "or",
    email: "Email",
    password: "Password",
    submit: "Create account",
    submitting: "Creating account...",
    hasAccount: "Already have an account?",
    login: "Log in",
    backHome: "Back to home",
  };
}

export default function SignupClient({
  locale,
  nextPath,
  authIntent,
}: {
  locale: Locale;
  nextPath: string;
  authIntent: AuthIntent;
}) {
  const copy = getSignupCopy(locale, authIntent);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", nextPath);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
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
              onClick={handleGoogleLogin}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
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
              {copy.google}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--line-soft)]" />
              <span className="text-xs uppercase tracking-[0.24em] text-stone-500">
                {copy.divider}
              </span>
              <div className="h-px flex-1 bg-[var(--line-soft)]" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
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
                  minLength={6}
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                />
              </div>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
              >
                {loading ? copy.submitting : copy.submit}
              </button>
            </form>

            <p className="mt-6 text-sm text-stone-500">
              {copy.hasAccount}{" "}
              <Link
                href={loginHrefForNext(nextPath)}
                className="text-amber-200 transition hover:text-amber-100"
              >
                {copy.login}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
