import type { Metadata } from "next";

import { getLocale } from "@/lib/locale";

import SignupClient from "./signup-client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  if (locale === "zh") {
    return {
      title: "注册 - BacklinkPilot",
      description:
        "注册 BacklinkPilot，先免费配置首个产品，再按真实外链执行需求升级。",
    };
  }

  return {
    title: "Sign up - BacklinkPilot",
    description:
      "Create a BacklinkPilot account to set up your first product for free and upgrade when live submissions matter.",
  };
}

export default async function SignupPage() {
  const locale = await getLocale();

  return <SignupClient locale={locale} />;
}
