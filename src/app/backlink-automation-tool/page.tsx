import type { Metadata } from "next";
import Link from "next/link";

import LocaleToggle from "@/components/locale-toggle";
import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/lib/locale-config";

function getAutomationCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      metadata: {
        title: "2026 最适合独立开发者的外链自动化工具 - BacklinkPilot",
        description: `用 AI 表单识别、stealth 浏览器和今天已上线的 ${LIVE_CHANNEL_COUNT} 个渠道自动推进外链建设。500+ 目录，$29/月起。`,
      },
      cta: {
        nav: "开始使用",
        boxTitle: "准备好把外链流程自动化了？",
        boxBody: "先免费开始配置，不需要信用卡。",
        boxButton: "免费开始",
      },
      hero: {
        title: "2026 年最适合独立开发者的外链自动化工具",
        body:
          "手工做外链是 SEO 里最耗时间的一部分。你要找目录、填表单、被 CAPTCHA 卡住，然后一遍又一遍重复。BacklinkPilot 把整条流程自动化。",
      },
      sections: [
        {
          title: "为什么手工外链建设根本无法扩展",
          intro: "大多数独立开发者和小团队都知道外链重要，但真正去做时非常痛苦：",
          list: [
            "找合适目录要花大量研究时间",
            "每个目录的表单布局都不同，没有两个完全一样",
            "40% 以上的目录会用 Cloudflare 或 CAPTCHA 阻止普通自动化工具",
            "雇 VA 每月要 $500-1500，质量还不稳定",
            "传统外链代理每月收费 $200-500，但大多做的是 outreach，不是提交执行",
          ],
        },
      ],
      featureTitle: "BacklinkPilot 是怎么工作的",
      featureIntro:
        "BacklinkPilot 是一款为独立开发者和小团队设计的自动化外链提交工具。它能做到：",
      features: [
        {
          title: "AI 表单填写",
          desc: "AI 会分析每个目录的表单字段并正确填写，下拉框、文本域、分类和描述都能自动处理。",
        },
        {
          title: "Stealth 浏览器技术",
          desc: "反指纹浏览器技术可以绕过 Cloudflare、Turnstile 和 CAPTCHA，让普通工具进不去的目录也能跑通。",
        },
        {
          title: "分阶段多渠道推进",
          desc: `BacklinkPilot 今天已上线 ${LIVE_CHANNEL_COUNT} 个渠道。资源页外联、社区、社交和编辑外联都在受控 rollout 中，而不是虚假宣称“全部可用”。`,
        },
        {
          title: "实时 Dashboard",
          desc: "每次提交都能跟踪：待执行、已上线、失败。你可以实时看到外链档案的增长过程。",
        },
      ],
      compareTitle: "BacklinkPilot 和其他方案相比",
      compareColumns: ["功能", "BacklinkPilot", "Pitchbox", "手工 / VA"],
      compareRows: [
        ["自动目录提交", "是", "否", "手工"],
        ["Stealth 浏览器", "是", "否", "否"],
        ["AI 表单填写", "是", "否", "否"],
        ["多渠道能力", `${LIVE_CHANNEL_COUNT} 已上线 / ${TOTAL_CHANNEL_COUNT} 规划中`, "仅邮件", "1-2"],
        ["价格", "$29/月起", "$195/月起", "$500-1500/月"],
        ["启动耗时", "5 分钟", "数小时", "数天"],
      ],
    };
  }

  return {
    metadata: {
      title: "Best Backlink Automation Tool 2026 — BacklinkPilot",
      description: `Automate your backlink building with AI-powered directory submission, stealth browser technology, and ${LIVE_CHANNEL_COUNT} live channels today. 500+ directories. From $29/month.`,
    },
    cta: {
      nav: "Get Started",
      boxTitle: "Ready to Automate Your Backlinks?",
      boxBody: "Start your free setup. No credit card required.",
      boxButton: "Start Free Setup",
    },
    hero: {
      title: "The Best Backlink Automation Tool for Indie Makers in 2026",
      body:
        "Building backlinks manually is one of the most time-consuming parts of SEO. You find directories, fill out forms, get blocked by CAPTCHAs, and repeat for hours every week. BacklinkPilot automates this entire process.",
    },
    sections: [
      {
        title: "Why Manual Backlink Building Doesn't Scale",
        intro:
          "Most indie makers and small startup founders know that backlinks matter for SEO. But the reality of building them is brutal:",
        list: [
          "Finding relevant directories takes hours of research",
          "Each directory has a different form layout and no two are the same",
          "40%+ of directories use Cloudflare or CAPTCHAs that block automation tools",
          "Hiring a VA costs $500-1500/month and quality is inconsistent",
          "Link building agencies charge $200-500/month and mostly do outreach, not submission",
        ],
      },
    ],
    featureTitle: "How BacklinkPilot Works",
    featureIntro:
      "BacklinkPilot is an automated backlink submission tool built for indie makers and small teams. Here's what it does:",
    features: [
      {
        title: "AI-Powered Form Filling",
        desc: "Our AI analyzes each directory's form fields and fills them correctly, handling dropdowns, text areas, categories, and descriptions automatically.",
      },
      {
        title: "Stealth Browser Technology",
        desc: "Anti-fingerprint browser tech bypasses Cloudflare, Turnstile, and CAPTCHAs. This unlocks directories regular tools can't access.",
      },
      {
        title: "Phased Multi-Channel Rollout",
        desc: `BacklinkPilot runs ${LIVE_CHANNEL_COUNT} live channels today. Resource outreach, community, social, and editorial lanes are being connected in controlled rollout, not oversold as fully live.`,
      },
      {
        title: "Real-Time Dashboard",
        desc: "Track every submission: pending, live, or failed. See your backlink profile grow in real time.",
      },
    ],
    compareTitle: "BacklinkPilot vs Alternatives",
    compareColumns: ["Feature", "BacklinkPilot", "Pitchbox", "Manual / VA"],
    compareRows: [
      ["Auto directory submission", "Yes", "No", "Manual"],
      ["Stealth browser", "Yes", "No", "No"],
      ["AI form filling", "Yes", "No", "No"],
      ["Multi-channel", `${LIVE_CHANNEL_COUNT} live / ${TOTAL_CHANNEL_COUNT} planned`, "Email only", "1-2"],
      ["Price", "From $29/mo", "From $195/mo", "$500-1500/mo"],
      ["Setup time", "5 minutes", "Hours", "Days"],
    ],
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getAutomationCopy(locale);

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: [
      "backlink automation tool",
      "automated backlink builder",
      "backlink automation software",
      "automatic link building",
      "SEO automation tool",
    ],
  };
}

export default async function BacklinkAutomationTool() {
  const locale = await getLocale();
  const copy = getAutomationCopy(locale);

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
              {copy.cta.nav}
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
          <p className="mb-4 text-stone-400">{copy.featureIntro}</p>
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
            {copy.compareTitle}
          </h2>
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line-soft)]">
                  {copy.compareColumns.map((column, index) => (
                    <th
                      key={column}
                      className={`py-3 font-medium ${
                        index === 0
                          ? "text-left text-stone-400"
                          : index === 1
                            ? "text-center text-amber-200"
                            : "text-center text-stone-400"
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-stone-300">
                {copy.compareRows.map(([feature, bp, pb, manual]) => (
                  <tr key={feature} className="border-b border-[var(--line-soft)]">
                    <td className="py-3">{feature}</td>
                    <td className="py-3 text-center text-emerald-200">{bp}</td>
                    <td className="py-3 text-center">{pb}</td>
                    <td className="py-3 text-center">{manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-[2rem] border border-amber-200/15 bg-[linear-gradient(135deg,rgba(159,224,207,0.06),rgba(208,166,90,0.08))] p-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-white">
              {copy.cta.boxTitle}
            </h2>
            <p className="mb-6 text-stone-400">{copy.cta.boxBody}</p>
            <a
              href="/dashboard"
              className="inline-block rounded-full bg-[var(--accent-500)] px-8 py-3 font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.cta.boxButton}
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
