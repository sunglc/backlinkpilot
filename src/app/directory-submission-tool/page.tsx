import type { Metadata } from "next";
import Link from "next/link";

import LocaleToggle from "@/components/locale-toggle";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/lib/locale-config";

function getDirectoryCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      metadata: {
        title: "自动目录提交工具 - 一次提交到 500+ 目录 | BacklinkPilot",
        description:
          "把你的网站自动提交到 500+ 经过筛选的目录。AI 自动填表，stealth 浏览器绕过 CAPTCHA，让基础外链建设真正自动化。",
      },
      navCta: "开始使用",
      hero: {
        title: "自动把你的网站提交到 500+ 目录",
        body:
          "目录提交依然是建立基础外链最轻量的方式之一。真正痛苦的是手工填表。BacklinkPilot 把这件事从按小时计的重复劳动，变成按分钟完成的自动化动作。",
      },
      sections: [
        {
          title: "为什么目录提交在 2026 依然有价值",
          intro:
            "有些 SEO 说目录提交已经死了。他们真正说对的是，垃圾目录提交已经死了。高质量、垂直相关的目录依然能带来：",
          list: [
            "基础外链层，让新站更快建立初始信号",
            "真实的 referral traffic，用户本来就会在目录里找工具",
            "品牌一致性信号，让产品在公开网络里的信息更统一",
            "域名多样性，让 Google 看到你不是只依赖单一来源的链接",
          ],
        },
      ],
      featureTitle: "我们的目录提交为什么不一样",
      features: [
        {
          title: "500+ 经过筛选的目录",
          desc: "不是从网上随便抓的清单。每个目录都经过质量、相关性和域名层面的筛选，没有 PBN，也没有垃圾源。",
        },
        {
          title: "AI 表单分析",
          desc: "每个目录的表单都不同。AI 会理解字段含义，并自动填写分类、描述、标签等信息。",
        },
        {
          title: "Stealth 浏览器，多拿到 42% 目录",
          desc: "很多高质量目录用 Cloudflare 或 CAPTCHA 挡掉普通自动化工具。我们的 stealth 技术把这些目录也变成可达入口。",
        },
        {
          title: "提交后验证",
          desc: "不是提完就算。BacklinkPilot 会回查你的 listing 是否真的上线、是否被索引、链接是否正常。",
        },
      ],
      stepsTitle: "流程怎么走",
      steps: [
        "输入你的产品网址，系统自动识别产品名、描述和类别",
        "查看匹配到的目录，确认哪些和你的产品真正相关",
        "点击提交，BacklinkPilot 处理填表、CAPTCHA 和提交流程",
        "在 Dashboard 里跟踪提交从待执行到已上线的变化",
      ],
      cta: {
        title: "别再手工提目录了",
        body: "把繁琐重复的工作交给 BacklinkPilot，从免费配置开始。",
        button: "免费开始配置 - $29/月起",
      },
    };
  }

  return {
    metadata: {
      title: "Automated Directory Submission Tool — Submit to 500+ Directories | BacklinkPilot",
      description:
        "Automatically submit your website to 500+ curated directories. AI fills forms, stealth browser bypasses CAPTCHAs, and foundational backlinks move on autopilot.",
    },
    navCta: "Get Started",
    hero: {
      title: "Submit Your Website to 500+ Directories Automatically",
      body:
        "Directory submissions are still one of the easiest ways to build foundational backlinks. The painful part is manual form filling. BacklinkPilot turns that into an automated workflow.",
    },
    sections: [
      {
        title: "Why Directory Submissions Still Matter in 2026",
        intro:
          "Spammy directory submissions are dead. High-quality, niche-relevant directory listings still provide:",
        list: [
          "Foundational backlinks for new websites",
          "Referral traffic from people browsing directories for tools",
          "Stronger brand signals across the web",
          "Domain diversity that helps search engines trust the profile",
        ],
      },
    ],
    featureTitle: "What Makes Our Directory Submission Different",
    features: [
      {
        title: "500+ Curated Directories",
        desc: "Every directory is vetted for quality, authority, and relevance. No random scraped lists, no spam.",
      },
      {
        title: "AI Form Analysis",
        desc: "Every form is different. Our AI reads the fields, understands the requirements, and fills them correctly.",
      },
      {
        title: "Stealth Browser for Hard Targets",
        desc: "Quality directories often use Cloudflare or CAPTCHAs. Our stealth layer gets through where regular automation breaks.",
      },
      {
        title: "Submission Verification",
        desc: "We don't just submit and disappear. BacklinkPilot checks whether your listing is actually live and linking correctly.",
      },
    ],
    stepsTitle: "How It Works",
    steps: [
      "Enter your product URL and auto-detect the basics",
      "Review relevant directories for your product",
      "Let BacklinkPilot handle submission and CAPTCHA solving",
      "Track progress in your dashboard from pending to live",
    ],
    cta: {
      title: "Stop Submitting Directories by Hand",
      body: "Let BacklinkPilot handle the repetitive work. Start with the free setup flow.",
      button: "Start Free Setup — From $29/month",
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: [
      "directory submission tool",
      "automated directory submission",
      "submit website to directories",
      "directory listing tool",
      "bulk directory submission",
    ],
  };
}

export default async function DirectorySubmissionTool() {
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <nav className="fixed top-0 z-50 w-full border-b border-[var(--line-soft)] bg-stone-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold text-white">
            BacklinkPilot
          </Link>
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} />
            <a
              href="/pricing"
              className="rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.navCta}
            </a>
          </div>
        </div>
      </nav>

      <article className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl">
            {copy.hero.title}
          </h1>

          <p className="mb-8 text-lg text-stone-400">{copy.hero.body}</p>

          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 mt-12 text-2xl font-bold text-white">
                {section.title}
              </h2>
              <p className="mb-4 text-stone-400">{section.intro}</p>
              <ul className="mb-8 list-inside list-disc space-y-2 text-stone-400">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <h2 className="mb-4 mt-12 text-2xl font-bold text-white">
            {copy.featureTitle}
          </h2>
          <div className="mb-8 space-y-4">
            {copy.features.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.04] p-5"
              >
                <h3 className="mb-1 font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-stone-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-white">
            {copy.stepsTitle}
          </h2>
          <ol className="mb-8 list-inside list-decimal space-y-3 text-stone-400">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="rounded-[2rem] border border-amber-200/15 bg-[linear-gradient(135deg,rgba(159,224,207,0.06),rgba(208,166,90,0.08))] p-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-white">
              {copy.cta.title}
            </h2>
            <p className="mb-6 text-stone-400">{copy.cta.body}</p>
            <a
              href="/dashboard"
              className="inline-block rounded-full bg-[var(--accent-500)] px-8 py-3 font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.cta.button}
            </a>
          </div>
        </div>
      </article>

      <footer className="border-t border-[var(--line-soft)] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="text-lg font-bold text-white">
            BacklinkPilot
          </Link>
          <span className="text-sm text-stone-600">
            &copy; {new Date().getFullYear()} BacklinkPilot
          </span>
        </div>
      </footer>
    </main>
  );
}
