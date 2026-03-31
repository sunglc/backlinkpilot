import type { Metadata } from "next";
import Link from "next/link";

import LocaleToggle from "@/components/locale-toggle";
import { readSaasCapabilityContract } from "@/lib/saas-capability-contract";
import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/lib/locale-config";
import { readSaasOperationalInsights } from "@/lib/saas-operational-insights";
import { buildSaasPublicClaims } from "@/lib/saas-public-claims";

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
      offer: {
        eyebrow: "你买到的是什么",
        title: "把商品边界讲清楚，比堆功能名更重要。",
        body:
          "BacklinkPilot 不该看起来像一个模糊的 SEO 功能包。它应该把软件、平台代办、付费机会和人工服务拆成清楚的购买层。",
        items: [
          {
            name: "核心软件层",
            badge: "套餐内",
            body:
              "包括产品登记、真实提交、结果中心和动作清单。这是你每月订阅真正买到的核心产品。",
            boundary:
              "这里卖的是可重复运行的软件体验，不是一次性的人工代办。",
          },
          {
            name: "托管外联邮箱",
            badge: "可选加购",
            body:
              "买了之后，平台分配专属邮箱、代发、代回，并把线程回流到产品里；不买，就明确走你自己的邮箱。",
            boundary:
              "这是独立加购项，不该被假装成所有套餐默认包含。",
          },
          {
            name: "付费机会层",
            badge: "单独处理",
            body:
              "收费型、商务型外链机会会沉淀成资产层，但不会混进普通提交 credits 里一起卖。",
            boundary:
              "它应该作为单独机会层或高级服务处理，而不是悄悄塞进基础套餐。",
          },
          {
            name: "人工服务层",
            badge: "按服务售卖",
            body:
              "复杂资料补齐、人工 review、定制推进，应该诚实按服务边界卖，而不是包装成自动化已经覆盖。",
            boundary:
              "当价值来自人工介入时，就该按人工服务说明，不该继续冒充纯软件能力。",
          },
        ],
      },
      sending: {
        eyebrow: "代发价值",
        title: "托管外联邮箱，应该是一个明确可买的功能项。",
        body:
          "这件事不该藏在一句“平台代发”里，而应该被做成清楚的产品选项。买了之后，我们分配专属邮箱、代你发、代你回，并把邮件线程展示回产品；不买，就明确走你自己的邮箱。",
        cards: [
          {
            title: "托管外联邮箱加购项",
            body:
              "给客户一个专属邮箱身份，由平台承接发送层，适合不想自己搭域名、邮箱和预热流程的人。",
          },
          {
            title: "平台代发与代回",
            body:
              "真正的产品价值不是多一个发送按钮，而是平台代你处理发送、回复、补跟进和结果回流。",
          },
          {
            title: "不买就用自己的邮箱",
            body:
              "如果用户不买这项服务，就明确接入自己的邮箱 / 发件身份，不把两种模式混在一起。",
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
          "使用你自己的外联邮箱",
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
          "可加购托管外联邮箱（pilot）",
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
          "托管外联邮箱优先 pilot",
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
          ["核心软件层", "包含", "包含", "包含"],
          ["外联发送模式", "自己的邮箱", "自己的邮箱 / 托管加购", "自己的邮箱 / 托管优先"],
          ["付费机会", "单独处理", "单独处理", "单独处理"],
          ["人工服务", "按需", "按需", "优先处理"],
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
            q: "如果我不买托管外联邮箱呢？",
            a: "那就明确走你自己的邮箱 / 发件身份。产品应该把“平台托管发送”和“用户自带邮箱”做成两条清楚的路径，而不是混成一个模糊状态。",
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
    offer: {
      eyebrow: "What you are buying",
      title: "Clear product boundaries matter more than a feature pile.",
      body:
        "BacklinkPilot should not feel like one fuzzy SEO bundle. It should separate the software layer, the platform-run layer, paid opportunities, and manual services into explicit product choices.",
      items: [
        {
          name: "Core software layer",
          badge: "Included in plan",
          body:
            "This covers product setup, live submissions, the results center, and the action list. It is the core software experience your subscription is buying.",
          boundary:
            "This is repeatable software, not one-off manual fulfillment hidden inside the plan.",
        },
        {
          name: "Managed Outreach Inbox",
          badge: "Optional add-on",
          body:
            "If the customer buys it, the platform assigns a dedicated inbox, sends, replies, and routes the thread back into the product. If not, they use their own inbox.",
          boundary:
            "This is an explicit add-on, not something that should quietly pretend to be included everywhere.",
        },
        {
          name: "Paid opportunity layer",
          badge: "Handled separately",
          body:
            "Commercial and paid backlink opportunities can be tracked as a premium layer, but they should not be mixed into normal submission credits.",
          boundary:
            "This belongs in a separate paid lane or premium service, not inside the base plan by implication.",
        },
        {
          name: "Manual service layer",
          badge: "Sold as service",
          body:
            "Complex review, custom handling, and human-assisted follow-through should be sold honestly as service work when automation is not the thing creating the value.",
          boundary:
            "When humans are doing the work, the product should say so instead of pretending software already covers it.",
        },
      ],
    },
    sending: {
      eyebrow: "Sending value",
      title: "Managed Outreach Inbox should be a clear purchasable product item.",
      body:
        "This should not hide behind a vague line about platform-managed sending. If the customer buys it, we assign a dedicated outreach inbox, send and reply on their behalf, and show the thread in-product. If they do not, they use their own inbox.",
      cards: [
        {
          title: "Managed Outreach Inbox add-on",
          body:
            "Give the customer a dedicated outreach identity and let the platform own the sender layer for people who do not want to assemble domains, inboxes, and warmup.",
        },
        {
          title: "Platform-handled send + reply",
          body:
            "The value is not one outbound email. It is the platform handling send, reply, follow-up, and routing the thread back into the product.",
        },
        {
          title: "No add-on means bring your own inbox",
          body:
            "If the customer does not buy this service, the product should clearly route them to their own sender identity instead of mixing the two modes.",
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
          "Use your own outreach inbox",
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
          "Optional managed outreach inbox (pilot)",
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
          "Managed outreach inbox priority pilot",
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
          ["Core software layer", "Included", "Included", "Included"],
          ["Outreach sender mode", "Own inbox", "Own inbox / managed add-on", "Own inbox / priority managed"],
          ["Paid opportunities", "Separate lane", "Separate lane", "Separate lane"],
          ["Manual service", "By request", "By request", "Priority handling"],
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
          q: "What if I do not buy the managed outreach inbox?",
          a: "Then you should clearly use your own inbox and sender identity. The product should make platform-managed sending and bring-your-own-inbox two explicit paths instead of one fuzzy state.",
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
  const [capabilityContract, operationalInsights] = await Promise.all([
    readSaasCapabilityContract(),
    readSaasOperationalInsights(),
  ]);
  const publicClaims = buildSaasPublicClaims({
    capabilityContract,
    operationalInsights,
  });
  const claimCopy =
    locale === "zh"
      ? {
          eyebrow: "市场宣称边界",
          title: "对外怎么说，由能力合同决定。",
          body:
            "价格页不应该把 buildout 说成 proven。公开市场范围应该跟着 capability contract 走，而不是跟着想象走。",
          provenLabel: "Proven",
          buildoutLabel: "Priority buildout",
          watchlistLabel: "Watchlist",
          ruleLabel: "宣称规则",
          anchorLabel: "Anchor markets",
          adaptiveReady: "目标语言自适应文案已进入真实能力层。",
          adaptivePending:
            "目标语言自适应文案还没有进入 proven 合同，不该被当成已兑现卖点。",
        }
      : {
          eyebrow: "Claim boundary",
          title: "Public positioning should follow the capability contract.",
          body:
            "The pricing page should not market buildout as proven supply. Public market claims need to follow the capability contract instead of imagination.",
          provenLabel: "Proven",
          buildoutLabel: "Priority buildout",
          watchlistLabel: "Watchlist",
          ruleLabel: "Claim rule",
          anchorLabel: "Anchor markets",
          adaptiveReady:
            "Language-adaptive submission and outreach copy is in the real capability layer now.",
          adaptivePending:
            "Language-adaptive copy is not in the proven contract yet, so it should not be sold as already-landed value.",
        };

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

      <section
        id="managed-inbox"
        className="px-5 py-14 md:px-8 md:py-18"
      >
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
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.offer.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.offer.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {copy.offer.body}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.offer.items.map((item) => (
              <article
                key={item.name}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/15 p-6"
              >
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-stone-200">
                  {item.badge}
                </span>
                <h3 className="mt-4 text-xl font-medium text-stone-100">{item.name}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{item.body}</p>
                <p className="mt-4 text-xs leading-6 text-stone-500">{item.boundary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:px-8 md:py-18">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {claimCopy.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {claimCopy.title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-400">
              {claimCopy.body}
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  [claimCopy.provenLabel, publicClaims.provenMarkets, "text-emerald-200"],
                  [claimCopy.buildoutLabel, publicClaims.buildoutMarkets, "text-amber-200"],
                  [claimCopy.watchlistLabel, publicClaims.watchlistMarkets, "text-stone-300"],
                ] as const
              ).map(([label, markets, tone]) => (
                <div
                  key={label}
                  className="rounded-[1.5rem] border border-[var(--line-soft)] bg-black/15 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    {label}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {markets.length > 0 ? (
                      markets.map((market) => (
                        <span
                          key={`${label}:${market}`}
                          className={`rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1 text-xs font-medium ${tone}`}
                        >
                          {market}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs leading-6 text-stone-500">
                        {locale === "zh"
                          ? "当前没有可展示的市场。"
                          : "No markets are ready to show here yet."}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/15 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                {claimCopy.ruleLabel}
              </p>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                {publicClaims.claimRule}
              </p>
              <p className="mt-4 text-xs leading-6 text-stone-500">
                {claimCopy.anchorLabel}:{" "}
                {publicClaims.anchorMarkets.length > 0
                  ? publicClaims.anchorMarkets
                      .map((market) => market.toUpperCase())
                      .join(locale === "zh" ? "、" : ", ")
                  : locale === "zh"
                    ? "无"
                    : "None"}
              </p>
              <p className="mt-3 text-xs leading-6 text-stone-500">
                {publicClaims.hasLanguageAdaptiveCopy
                  ? claimCopy.adaptiveReady
                  : claimCopy.adaptivePending}
              </p>
            </div>
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
