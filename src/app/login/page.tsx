import type { Metadata } from "next";

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

export default async function LoginPage() {
  const locale = await getLocale();

  return <LoginClient locale={locale} />;
}
