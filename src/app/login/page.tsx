import type { Metadata } from "next";

import {
  authIntentFromNextPath,
  resolveAuthNextPath,
} from "@/lib/auth-return";
import { getLocale } from "@/lib/locale";

import LoginClient from "./login-client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  if (locale === "zh") {
    return {
      title: "登录 - BacklinkPilot",
      description: "登录 BacklinkPilot，继续配置产品并启动真实外链分发。",
    };
  }

  return {
    title: "Log in - BacklinkPilot",
    description:
      "Sign in to BacklinkPilot and continue your product setup and live backlink workflow.",
  };
}

type LoginPageSearchParams = Promise<{
  next?: string | string[];
  checkout?: string | string[];
  error?: string | string[];
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: LoginPageSearchParams;
}) {
  const locale = await getLocale();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolveAuthNextPath(resolvedSearchParams);
  const authIntent = authIntentFromNextPath(nextPath);
  const errorParam = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error;

  return (
    <LoginClient
      locale={locale}
      nextPath={nextPath}
      authIntent={authIntent}
      initialError={errorParam === "auth_failed" ? "auth_failed" : ""}
    />
  );
}
