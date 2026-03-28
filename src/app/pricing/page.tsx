import type { Metadata } from "next";
import Link from "next/link";

import LocaleToggle from "@/components/locale-toggle";
import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/lib/locale-config";

function getPricingCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      metadata: {
        title: "价格 - BacklinkPilot",
        description:
          "BacklinkPilot 的消费级外链自动化定价。先免费配置首个产品，再按真实目录与 stealth 提交执行量升级。",
      },
      nav: {
        product: "产品",
        pricing: "价格",
        faq: "常见问题",
        login: "登录",
        tryFree: "免费开始配置",
      },
      hero: {
        eyebrow: "价格",
        titleTop: "先完成配置。",
        titleBottom: "执行时再付费。",
        body:
          "定价应该像一个清晰的解锁点，而不是一道墙。现在你可以先免费添加首个产品，再根据自己想跑的真实提交量选择合适计划。",
        summary: [
          { label: "免费配置", value: "1 个产品" },
          { label: "今天已上线", value: `${LIVE_CHANNEL_COUNT} 个渠道` },
          { label: "起步价", value: "$29 / 月" },
        ],
      },
      path: {
        eyebrow: "解锁路径",
        title: "先感受流程，再为真实执行付费。",
        body:
          "这不该是一张把免费层和付费层割裂开的价格表，而应该是一条连续的产品路径。",
        cards: [
          {
            step: "Step 1",
            name: "免费配置",
            price: "$0",
            body:
              "添加 1 个产品，自动识别主页文案，先看到 launch board 和渠道推荐。",
            cta: "免费开始配置",
            href: "/dashboard",
          },
          {
            step: "Step 2",
            name: "入门版",
            price: "$29",
            body:
              "当你准备让第一个产品进入真实分发，就解锁目录和 stealth 两条 live 渠道。",
            cta: "解锁入门版",
            href: "/api/stripe/checkout?plan=starter",
          },
          {
            step: "Step 3",
            name: "增长版",
            price: "$79",
            body:
              "当外链分发已经是活跃增长动作，就把产品数和提交容量一起拉起来。",
            cta: "解锁增长版",
            href: "/api/stripe/checkout?plan=growth",
          },
          {
            step: "Step 4",
            name: "规模版",
            price: "$199",
            body:
              "当瓶颈从 onboarding 变成吞吐、协作和控制力时，进入团队级方案。",
            cta: "解锁规模版",
            href: "/api/stripe/checkout?plan=scale",
          },
        ],
      },
      decision: {
        eyebrow: "怎么选",
        title: "按你现在的阶段选，不按功能堆砌选。",
        cards: [
          {
            title: "我还在确认系统是否真的理解我的产品",
            body:
              "先用免费配置层。只有当你确定主页识别、产品档案和 launch 路径都顺了，再进入付费执行。",
          },
          {
            title: "我已经有一个明确要推的产品",
            body:
              "直接上入门版，把目录和 stealth 跑起来。这个阶段最重要的是先获得第一轮真实提交和结果信号。",
          },
          {
            title: "我已经把外链分发当成活跃增长动作",
            body:
              "默认上增长版。你需要的是更多产品位、更多提交量和更稳定的执行节奏，而不是更复杂的 onboarding。",
          },
        ],
      },
      sending: {
        eyebrow: "代发价值",
        title: "更深的外联层，真正卖的是发送基础设施。",
        body:
          "如果 BacklinkPilot 往资源页和编辑外联继续走，用户愿意付费的关键，不是“平台里多了一个邮箱输入框”，而是平台代他把最麻烦的发送层补齐。",
        cards: [
          {
            title: "托管发件箱",
            body:
              "用户不需要先搭域名、邮箱和预热流程，才能开始外联。产品应该把这层基础设施接住。",
          },
          {
            title: "送达率与节奏控制",
            body:
              "真正的产品价值是把消息送达、控制发送节奏、降低域名被打坏的风险，而不是只提供一个发送按钮。",
          },
          {
            title: "回复与跟进闭环",
            body:
              "发送、回复、补跟进和公开验证应该回到产品页，而不是让用户在邮箱和表格之间来回切换。",
          },
        ],
        note:
          "这条能力应该以 pilot / rollout 的方式诚实上线，不应该提前伪装成今天已 fully live。",
      },
      plans: [
        {
          name: "入门版",
          price: 29,
          accent: "border-[var(--line-soft)] bg-white/[0.03]",
          eyebrow: "适合第一次启动",
          desc: "适合一个产品的第一步付费计划，让目录分发正式开始动起来。",
          features: [
            "1 个产品",
            "100 次提交 / 月",
            "目录提交",
            "Stealth 浏览器提交",
            "基础报告",
          ],
          note: "当你已经明确要推哪个产品时，这就是最干净的起点。",
          cta: "解锁入门版",
          href: "/api/stripe/checkout?plan=starter",
        },
        {
          name: "增长版",
          price: 79,
          accent:
            "border-[var(--accent-500)] bg-[linear-gradient(180deg,rgba(208,166,90,0.16),rgba(208,166,90,0.05))]",
          eyebrow: "适合真正要做分发",
          desc: "这是默认主计划，适合把外链分发当成明确增长动作来跑的团队。",
          features: [
            "3 个产品",
            "500 次提交 / 月",
            `今天已上线 ${LIVE_CHANNEL_COUNT} 个渠道`,
            `${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} 个渠道推进中`,
            "托管外联代发（pilot）",
            "优先支持",
          ],
          note: "如果外链分发已经是你的活跃增长通道，这通常是最合适的计划。",
          cta: "解锁增长版",
          href: "/api/stripe/checkout?plan=growth",
        },
        {
          name: "规模版",
          price: 199,
          accent: "border-[var(--line-soft)] bg-white/[0.03]",
          eyebrow: "适合多产品团队",
          desc: "面向代理、运营团队和需要管理更大产品组合的组织。",
          features: [
            "10 个产品",
            "不限提交量",
            `今天已上线 ${LIVE_CHANNEL_COUNT} 个渠道`,
            "自定义目录处理",
            "托管发件层与回复流（pilot）",
            "API 访问",
          ],
          note: "当瓶颈已经不是 onboarding，而是吞吐与控制力时，就该上这个计划。",
          cta: "解锁规模版",
          href: "/api/stripe/checkout?plan=scale",
        },
      ],
      comparison: {
        eyebrow: "对比",
        title: "直接讲清楚差别，而不是把价格页做成迷宫。",
        columns: ["变化点", "入门版", "增长版", "规模版"],
        rows: [
          ["付费前可先免费配置", "是", "是", "是"],
          ["已上线提交渠道", "2", "2", "2"],
          ["包含产品数", "1", "3", "10"],
          ["月度提交容量", "100", "500", "不限"],
          ["托管外联代发", "—", "pilot", "priority pilot"],
          ["适合谁", "单产品启动", "活跃增长", "团队与代理"],
        ],
      },
      faq: {
        eyebrow: "常见问题",
        title: "把价格问题直接讲明白，不靠细则迷惑用户。",
        items: [
          {
            q: "付费前能先体验流程吗？",
            a: "可以。你现在可以先免费添加一个产品、自动识别它的基础信息，并在购买前理解整个流程。",
          },
          {
            q: "升级之后到底会发生什么？",
            a: "升级会把你保存的产品档案变成真实提交的执行源，目录和 stealth 渠道都可以从它直接开始跑。",
          },
          {
            q: "为什么“平台代发”会是一个价值点？",
            a: "因为对普通用户来说，难的不是写一封外联邮件，而是准备可用邮箱、控制送达率、接住回复、继续跟进。真正有价值的是平台代他承接这层执行基础设施。",
          },
          {
            q: "为什么不做到首条提交前都免费？",
            a: "免费层的目标是降低 onboarding 摩擦，而不是覆盖真实执行成本。真正开始代你跑分发时，才进入付费计划。",
          },
        ],
      },
      cta: {
        eyebrow: "下一步",
        title: "先从免费配置流程开始。",
        body:
          "如果系统能正确理解你的主页，流程体验也足够顺滑，再在你准备好时升级进入真实提交。",
        button: "打开 Dashboard",
      },
      unit: "每月",
    };
  }

  return {
    metadata: {
      title: "Pricing — BacklinkPilot",
      description:
        "Consumer-friendly pricing for backlink automation. Set up your first product for free, then unlock live directory and stealth submission plans from $29/month.",
    },
    nav: {
      product: "Product",
      pricing: "Pricing",
      faq: "FAQ",
      login: "Log in",
      tryFree: "Try Free Setup",
    },
    hero: {
      eyebrow: "Pricing",
      titleTop: "Set up first.",
      titleBottom: "Pay for execution.",
      body:
        "Pricing should feel like a clear unlock, not a wall. The product now lets you add your first product for free, then choose the plan that matches the amount of real submission work you want to run.",
      summary: [
        { label: "Free setup", value: "1 product" },
        { label: "Live today", value: `${LIVE_CHANNEL_COUNT} channels` },
        { label: "Starts at", value: "$29 / month" },
      ],
    },
    path: {
      eyebrow: "Unlock path",
      title: "Feel the workflow first. Pay when execution starts.",
      body:
        "This should not be a pricing table that splits free and paid into two unrelated worlds. It should feel like one continuous product path.",
      cards: [
        {
          step: "Step 1",
          name: "Free setup",
          price: "$0",
          body:
            "Add 1 product, auto-detect the homepage copy, and see the launch board plus lane recommendations first.",
          cta: "Start Free Setup",
          href: "/dashboard",
        },
        {
          step: "Step 2",
          name: "Starter",
          price: "$29",
          body:
            "When you are ready to move the first product into real distribution, unlock Directory Submission and Stealth.",
          cta: "Unlock Starter",
          href: "/api/stripe/checkout?plan=starter",
        },
        {
          step: "Step 3",
          name: "Growth",
          price: "$79",
          body:
            "When backlink distribution is already an active growth motion, increase both product slots and submission capacity together.",
          cta: "Unlock Growth",
          href: "/api/stripe/checkout?plan=growth",
        },
        {
          step: "Step 4",
          name: "Scale",
          price: "$199",
          body:
            "When the bottleneck shifts from onboarding to throughput, teamwork, and control, move into the team-grade plan.",
          cta: "Unlock Scale",
          href: "/api/stripe/checkout?plan=scale",
        },
      ],
    },
    decision: {
      eyebrow: "How to choose",
      title: "Choose by where you are, not by feature pile-up.",
      cards: [
        {
          title: "I am still validating whether the system understands my product",
          body:
            "Stay on the free setup layer first. Only move into paid execution once the homepage parsing, product profile, and launch path feel right.",
        },
        {
          title: "I already have one product I want to push",
          body:
            "Go straight to Starter and get Directory plus Stealth moving. The real job at this stage is getting the first live result signal.",
        },
        {
          title: "Backlink distribution is already an active growth lane for me",
          body:
            "Default to Growth. What you need now is more product slots, more submission volume, and steadier execution cadence, not more onboarding.",
        },
      ],
    },
    sending: {
      eyebrow: "Sending value",
      title: "The deeper outreach layer is really selling execution infrastructure.",
      body:
        "If BacklinkPilot keeps moving into resource-page and editorial outreach, the thing users will pay for is not a mailbox field in the UI. It is the platform taking over the hardest part of the sending stack.",
      cards: [
        {
          title: "Managed outreach mailbox",
          body:
            "The user should not need to assemble domains, inboxes, and warmup workflows before the first serious outreach push.",
        },
        {
          title: "Deliverability and pacing control",
          body:
            "The product becomes valuable when messages land, pacing stays controlled, and the domain does not get burned, not when there is just a send button.",
        },
        {
          title: "Reply and follow-up loop",
          body:
            "Sends, replies, follow-up, and public verification should come back into the product instead of scattering across inboxes and spreadsheets.",
        },
      ],
      note:
        "This capability should ship honestly in pilots and rollout phases, not be marketed as fully live before it is real.",
    },
    plans: [
      {
        name: "Starter",
        price: 29,
        accent: "border-[var(--line-soft)] bg-white/[0.03]",
        eyebrow: "For first launches",
        desc: "A clean first paid step for one product that needs real directory momentum.",
        features: [
          "1 product",
          "100 submissions / month",
          "Directory Submission",
          "Stealth Browser Submission",
          "Basic reporting",
        ],
        note: "Best when you already know what product you want to push.",
        cta: "Unlock Starter",
        href: "/api/stripe/checkout?plan=starter",
      },
      {
        name: "Growth",
        price: 79,
        accent:
          "border-[var(--accent-500)] bg-[linear-gradient(180deg,rgba(208,166,90,0.16),rgba(208,166,90,0.05))]",
        eyebrow: "For serious distribution",
        desc: "The main plan for teams that want enough volume to actually feel the product compounding.",
        features: [
          "3 products",
          "500 submissions / month",
          `${LIVE_CHANNEL_COUNT} live channels today`,
          `${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} channels in rollout`,
          "Managed outreach sending (pilot)",
          "Priority support",
        ],
        note: "This is the default plan if backlink distribution is an active growth lane.",
        cta: "Unlock Growth",
        href: "/api/stripe/checkout?plan=growth",
      },
      {
        name: "Scale",
        price: 199,
        accent: "border-[var(--line-soft)] bg-white/[0.03]",
        eyebrow: "For multi-product teams",
        desc: "For agencies, operators, and product groups managing a broader portfolio.",
        features: [
          "10 products",
          "Unlimited submissions",
          `${LIVE_CHANNEL_COUNT} live channels today`,
          "Custom directory handling",
          "Managed sending layer + reply flow (pilot)",
          "API access",
        ],
        note: "Use this when the bottleneck is not onboarding, but throughput and control.",
        cta: "Unlock Scale",
        href: "/api/stripe/checkout?plan=scale",
      },
    ],
    comparison: {
      eyebrow: "Comparison",
      title: "A plain-language comparison, not a pricing maze.",
      columns: ["What changes", "Starter", "Growth", "Scale"],
      rows: [
        ["Free setup before paying", "Yes", "Yes", "Yes"],
        ["Live submission channels", "2", "2", "2"],
        ["Products included", "1", "3", "10"],
        ["Monthly submission capacity", "100", "500", "Unlimited"],
        ["Managed outreach sending", "—", "pilot", "priority pilot"],
        ["Best for", "Solo launches", "Active growth", "Teams and agencies"],
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Pricing answers without the usual fine-print fog.",
      items: [
        {
          q: "Can I try the workflow before paying?",
          a: "Yes. You can now add your first product for free, auto-detect its basic profile, and understand the flow before you buy a plan.",
        },
        {
          q: "What actually changes when I upgrade?",
          a: "Upgrade turns your saved product profile into a live submission source. Directory and stealth routes can then run from the product you already configured.",
        },
        {
          q: "Why is platform-managed sending a value point?",
          a: "Because the hard part for normal users is not writing one outreach email. It is having usable inboxes, protecting deliverability, catching replies, and staying on follow-up. The real value is the platform taking over that execution layer.",
        },
        {
          q: "Why not make everything free until first submission?",
          a: "The free tier is meant to reduce onboarding friction, not subsidize execution cost. Paid plans start when the system begins doing real distribution work on your behalf.",
        },
      ],
    },
    cta: {
      eyebrow: "Next step",
      title: "Start with the free setup flow.",
      body:
        "If the product understands your homepage and the workflow feels right, upgrade when you are ready to run live submissions.",
      button: "Open Dashboard",
    },
    unit: "per month",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getPricingCopy(locale);

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
  };
}

export default async function Pricing() {
  const locale = await getLocale();
  const copy = getPricingCopy(locale);

  return (
    <main className="overflow-x-hidden">
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="text-sm font-medium uppercase tracking-[0.28em] text-stone-200"
          >
            BacklinkPilot
          </Link>
          <div className="hidden items-center gap-8 text-sm text-stone-400 md:flex">
            <Link href="/#product">{copy.nav.product}</Link>
            <Link href="/pricing" className="text-stone-100">
              {copy.nav.pricing}
            </Link>
            <Link href="/#faq">{copy.nav.faq}</Link>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <LocaleToggle locale={locale} className="hidden sm:inline-flex" />
            <Link
              href="/login"
              className="text-sm text-stone-400 transition hover:text-white"
            >
              {copy.nav.login}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--line-strong)] bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {copy.nav.tryFree}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-5 pb-16 pt-30 md:px-8 md:pt-34">
        <div className="bp-grid absolute inset-0 opacity-35" />
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.16),transparent_58%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            {copy.hero.eyebrow}
          </p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <h1 className="font-display text-5xl leading-[0.95] text-stone-50 md:text-7xl">
                {copy.hero.titleTop}
                <br />
                {copy.hero.titleBottom}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-stone-400 md:text-lg">
                {copy.hero.body}
              </p>
              <div className="mt-6 sm:hidden">
                <LocaleToggle locale={locale} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
              <div className="grid gap-4 md:grid-cols-3">
                {copy.hero.summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-stone-950/60 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-medium text-stone-100">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:px-8 md:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.path.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.path.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {copy.path.body}
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {copy.path.cards.map((card, index) => (
              <article
                key={card.name}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6"
              >
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.24em] text-stone-500">
                  <span>{card.step}</span>
                  <span>{card.price}</span>
                </div>
                <h3 className="mt-4 text-2xl font-medium text-stone-100">
                  {card.name}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-400">{card.body}</p>
                {card.href.startsWith("/api/") ? (
                  <a
                    href={card.href}
                    className="mt-6 inline-flex rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                  >
                    {card.cta}
                  </a>
                ) : (
                  <Link
                    href={card.href}
                    className="mt-6 inline-flex rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                  >
                    {card.cta}
                  </Link>
                )}
                {index < copy.path.cards.length - 1 ? (
                  <div className="mt-6 text-sm text-stone-600">↓</div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line-soft)] bg-white/[0.02] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.decision.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.decision.title}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.decision.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-[1.5rem] border border-[var(--line-soft)] bg-black/15 p-5"
              >
                <h3 className="text-lg font-medium text-stone-100">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:px-8 md:py-18">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.sending.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.sending.title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-400">
              {copy.sending.body}
            </p>
            <p className="mt-6 max-w-xl text-sm leading-7 text-stone-500">
              {copy.sending.note}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.sending.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/15 p-6"
              >
                <h3 className="text-xl font-medium text-stone-100">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:px-8 md:py-18">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {copy.plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[2rem] border p-7 ${plan.accent}`}
            >
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {plan.eyebrow}
              </p>
              <div className="mt-6 flex items-end justify-between gap-5">
                <div>
                  <h2 className="text-3xl font-medium text-stone-100">
                    {plan.name}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-stone-400">
                    {plan.desc}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-6xl leading-none text-stone-50">
                    ${plan.price}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-stone-500">
                    {copy.unit}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-[var(--line-soft)] pt-6">
                <ul className="space-y-3 text-sm leading-6 text-stone-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent-300)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-8 text-sm leading-6 text-stone-500">{plan.note}</p>

              <a
                href={plan.href}
                className="mt-8 inline-flex rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line-soft)] bg-white/[0.02] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.comparison.eyebrow}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
                {copy.comparison.title}
              </h2>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[var(--line-soft)]">
              <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] bg-stone-950/60 px-5 py-4 text-xs uppercase tracking-[0.24em] text-stone-500">
                {copy.comparison.columns.map((column) => (
                  <span
                    key={column}
                    className={column === copy.comparison.columns[0] ? "" : "text-center"}
                  >
                    {column}
                  </span>
                ))}
              </div>
              {copy.comparison.rows.map(([label, starter, growth, scale]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] border-t border-[var(--line-soft)] px-5 py-4 text-sm text-stone-300"
                >
                  <span className="pr-4 text-stone-400">{label}</span>
                  <span className="text-center">{starter}</span>
                  <span className="text-center">{growth}</span>
                  <span className="text-center">{scale}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.faq.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.faq.title}
            </h2>
          </div>
          <div className="space-y-4">
            {copy.faq.items.map((item) => (
              <details
                key={item.q}
                className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.03] p-6"
              >
                <summary className="cursor-pointer list-none text-lg font-medium text-stone-100">
                  {item.q}
                </summary>
                <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-7xl rounded-[2rem] border border-[var(--line-soft)] bg-[linear-gradient(135deg,rgba(159,224,207,0.09),rgba(208,166,90,0.08))] px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.cta.eyebrow}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-none text-stone-50 md:text-5xl">
                {copy.cta.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-400">
                {copy.cta.body}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-[var(--accent-500)] px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.cta.button}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
