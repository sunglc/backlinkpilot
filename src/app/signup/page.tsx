import type { Metadata } from "next";

import {
  authIntentFromNextPath,
  resolveAuthNextPath,
} from "@/lib/auth-return";
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

type SignupPageSearchParams = Promise<{
  next?: string | string[];
  checkout?: string | string[];
}>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SignupPageSearchParams;
}) {
  const locale = await getLocale();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolveAuthNextPath(resolvedSearchParams);
  const authIntent = authIntentFromNextPath(nextPath);

  return <SignupClient locale={locale} nextPath={nextPath} authIntent={authIntent} />;
}
