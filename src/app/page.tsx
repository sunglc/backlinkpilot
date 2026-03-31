import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import LocaleToggle from "@/components/locale-toggle";
import { readSaasCapabilityContract } from "@/lib/saas-capability-contract";
import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/lib/locale-config";
import { readSaasOperationalInsights } from "@/lib/saas-operational-insights";
import { buildSaasPublicClaims } from "@/lib/saas-public-claims";

function getHomeCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      metadata: {
        title: "BacklinkPilot - 自动驾驶你的外链增长",
        description:
          "把产品网址贴进来，自动识别信息并启动真实目录与 stealth 外链执行。先免费完成首个产品配置，再按执行量付费。",
      },
      nav: {
        product: "产品",
        workflow: "流程",
        pricing: "价格",
        faq: "常见问题",
        login: "登录",
        tryFree: "免费开始配置",
      },
      hero: {
        eyebrow: "消费级外链工具",
        titleTop: "贴上你的首页。",
        titleBottom: "带着一套可执行的外链启动方案离开。",
        body:
          "BacklinkPilot 会把一个普通产品网址变成可直接提交的产品档案，再把它送入真实的目录与 stealth 渠道，而不是让你去学习代理商式的复杂流程。",
        primaryCta: "免费开始配置",
        secondaryCta: "查看价格",
        signals: [
          "500+ 经过筛选的目录",
          `今天已上线 ${LIVE_CHANNEL_COUNT} 个渠道`,
          "首个产品可免费配置",
          "可选托管外联邮箱",
          "AI 辅助识别文案",
        ],
      },
      panel: {
        eyebrow: "首个产品配置",
        title: "一个网址进来，一份可执行档案出来。",
        live: "已上线",
        homepageUrl: "首页网址",
        profile: "自动识别的产品档案",
        productName: "产品名称",
        description: "描述",
        profileBody:
          "为独立开发者和小团队提供自动化外链配置，让目录分发、stealth 提交和启动期传播更容易落地。",
        readiness: "提交准备度",
        directoryNetwork: "目录网络",
        stealthRoute: "Stealth 渠道",
        outreachLanes: "外联渠道",
        ready: "就绪",
        rollout: "推进中",
        deltaTitle: "和手工模式相比，变化是什么",
        deltaBody:
          "现在的产品体验更像消费级 onboarding，而不是后台表单：先识别文案、先免费保存一个产品，再在准备好时升级进入真实执行。",
      },
      valueSection: {
        eyebrow: "为什么它的感觉不一样",
        title: "它是为第一波真正有意义的外链而做，不是为企业级 SEO 表演而做。",
        points: [
          {
            title: "从你的首页开始",
            detail:
              "贴上网址后，BacklinkPilot 会先拉取产品名、标题和描述，你不需要一开始就手动填写所有字段。",
          },
          {
            title: "围绕真实提交场景构建",
            detail:
              "目录和 stealth 渠道今天就能跑，其他渠道明确标记为推进中，而不是假装已经全部上线。",
          },
          {
            title: "为 maker 而不是 SEO 团队设计",
            detail:
              "你不需要 VA、外链代理或一整套复杂 SOP，才能让第一波外链分发真正动起来。",
          },
          {
            title: "下一层价值是代发，而不只是模板",
            detail:
              "当产品往资源页和编辑外联扩展时，真正有价值的不是再给你一封模板，而是平台提供可用发件层、送达率保护和回复回流。",
          },
        ],
      },
      offerSection: {
        eyebrow: "你买到的是什么",
        title: "先讲清楚商品边界，再讲更多功能。",
        body:
          "BacklinkPilot 不该看起来像一个模糊的 SEO 工具箱。它应该让用户一眼知道：哪些是套餐里的软件，哪些是可选代办，哪些属于单独处理的机会层。",
        items: [
          {
            title: "核心软件层",
            badge: "套餐内",
            detail:
              "产品登记、真实提交、结果中心和动作清单，属于订阅内的核心软件体验。",
          },
          {
            title: "托管外联邮箱",
            badge: "可选加购",
            detail:
              "买了才会分配专属邮箱，并由平台代发、代回、代跟进；不买就走你自己的邮箱。",
          },
          {
            title: "付费机会层",
            badge: "单独处理",
            detail:
              "收费型、商务型外链机会会单独沉淀，不会混进普通提交 credits 里一起卖。",
          },
          {
            title: "人工服务层",
            badge: "按服务售卖",
            detail:
              "复杂 review、人工处理和定制推进应该诚实按服务说明，而不是伪装成已经自动化。",
          },
        ],
      },
      sendingSection: {
        eyebrow: "代发层",
        title: "买托管外联邮箱，或者用你自己的邮箱。",
        body:
          "这项服务应该是一个明确可买的功能项，而不是藏在一句“平台代发”里。买了之后，我们分配专属邮箱、代你发、代你回，并把线程展示回产品；不买，就接你的邮箱。",
        cards: [
          {
            title: "托管外联邮箱加购项",
            detail:
              "给客户一个专属邮箱身份，由平台托管发送层，适合不想自己搭域名、邮箱和预热流程的人。",
          },
          {
            title: "我们代发，也代回",
            detail:
              "不只是发出一封邮件，而是连回复、补跟进和结果回流一起承接，真正变成一条产品内执行链。",
          },
          {
            title: "不买就用你的邮箱",
            detail:
              "如果用户不买这项服务，就明确走自己的邮箱/发件身份，不把两种模式混在一起。",
          },
        ],
        note:
          "这类能力应该按 rollout / pilot 诚实上线，而不是提前包装成“今天已经 fully live”。",
        cta: "查看托管邮箱方案",
      },
      workflowSection: {
        eyebrow: "流程",
        title: "三步完成，不再拆成十五个零碎的 SEO 小动作。",
        items: [
          {
            step: "01",
            title: "贴上你的首页",
            copy:
              "从你已经上线的产品网址开始。系统会规范化 URL、读取公开元信息，并把它整理成产品档案。",
            aside: "典型耗时：30 秒以内",
          },
          {
            step: "02",
            title: "确认产品定位",
            copy:
              "修改自动识别出的名称和描述，然后决定什么时候升级，进入真实的目录与 stealth 提交流程。",
            aside: "不用从零写提交文案",
          },
          {
            step: "03",
            title: "让引擎去跑",
            copy:
              "从一个地方看队列、进度和执行状态，不用再在表格、外包和外联文档之间来回切换。",
            aside: "为前 500 条外链设计，不为企业式包装设计",
          },
        ],
      },
      channelSection: {
        eyebrow: "渠道真相",
        title: "诚实说明什么能跑，胜过假装“所有渠道都已上线”。",
        body:
          "产品会清楚说出今天哪些渠道已可执行，哪些还在推进中。消费级工具最重要的是第一天就建立信任，而不是退款后再解释。",
        liveNow: "今天可跑",
        rollingOut: "下一步推进",
        lanes: "个渠道",
        ready: "就绪",
        soon: "即将推出",
        roadmap: `总路线图：${TOTAL_CHANNEL_COUNT} 个渠道，今天已上线：${LIVE_CHANNEL_COUNT} 个。`,
        groups: [
          {
            label: "今天可跑",
            tone: "text-emerald-300",
            items: ["目录提交", "Stealth 浏览器提交"],
          },
          {
            label: "下一步推进",
            tone: "text-amber-200",
            items: ["社区提交", "资源页外联", "社交分发", "编辑外联"],
          },
        ],
      },
      pricingTeaser: {
        eyebrow: "定价姿态",
        titleTop: "先完成配置。",
        titleBottom: "想要执行时再付费。",
        body:
          "现在的新用户可以先感受到流程本身，再决定是否付费。定价的作用是解锁真实提交能力，而不是挡在最前面制造摩擦。",
        cta: "查看完整价格",
        cards: [
          {
            label: "入门版",
            price: "$29",
            desc: "一个产品、基础执行量，适合干净地启动第一轮分发。",
            accent: "rounded-[1.75rem] border p-6 border-[var(--line-soft)] bg-white/[0.03]",
          },
          {
            label: "增长版",
            price: "$79",
            desc: "适合已经把外链分发当成实际增长动作来跑的产品。",
            accent:
              "rounded-[1.75rem] border p-6 border-[var(--accent-500)] bg-[linear-gradient(180deg,rgba(208,166,90,0.13),rgba(208,166,90,0.04))]",
          },
          {
            label: "规模版",
            price: "$199",
            desc: "适合多产品团队、代理运营和更高吞吐的执行需求。",
            accent: "rounded-[1.75rem] border p-6 border-[var(--line-soft)] bg-white/[0.03]",
          },
        ],
      },
      faqSection: {
        eyebrow: "常见问题",
        title: "把真正重要的问题，直接讲清楚。",
        items: [
          {
            q: "这样做对 SEO 安全么？",
            a: "产品围绕经过筛选的目录和受控的 rollout 设计，明确不是做垃圾量、也不是做 PBN 自动化。",
          },
          {
            q: "为什么“免费配置”这么重要？",
            a: "因为消费级工具应该让人先感受到流程，再要求付费。你现在可以先添加一个产品，看系统如何识别它，再决定是否升级。",
          },
          {
            q: "升级之后会发生什么？",
            a: "你保存下来的产品档案会变成真实渠道的执行源。目录和 stealth 路线可以直接从这个档案开始跑。",
          },
          {
            q: "现在是不是所有渠道都上线了？",
            a: `不是。今天上线了 ${LIVE_CHANNEL_COUNT} 个渠道，剩余 ${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} 个会明确标记为推进中，不会过度承诺。`,
          },
        ],
      },
    };
  }

  return {
    metadata: {
      title: "BacklinkPilot — Autopilot for Your Backlinks",
      description:
        "Paste your product URL, auto-detect site copy, and launch into real directory and stealth backlink workflows. Set up the first product for free, then pay for execution.",
    },
    nav: {
      product: "Product",
      workflow: "Workflow",
      pricing: "Pricing",
      faq: "FAQ",
      login: "Log in",
      tryFree: "Try Free Setup",
    },
    hero: {
      eyebrow: "Consumer link-building tool",
      titleTop: "Paste your homepage.",
      titleBottom: "Leave with a live backlink launch plan.",
      body:
        "BacklinkPilot turns a plain product URL into a submission-ready profile, then routes it into real directory and stealth channels without making you learn agency-style workflows.",
      primaryCta: "Start Free Setup",
      secondaryCta: "See Pricing",
      signals: [
        "500+ vetted directories",
        `${LIVE_CHANNEL_COUNT} live channels today`,
        "Free first-product setup",
        "Optional managed outreach inbox",
        "AI-assisted copy detection",
      ],
    },
    panel: {
      eyebrow: "First-product setup",
      title: "One URL in, ready-to-run profile out.",
      live: "Live now",
      homepageUrl: "Homepage URL",
      profile: "Auto-detected profile",
      productName: "Product name",
      description: "Description",
      profileBody:
        "Automated backlink setup for makers who want vetted directory reach, stealth unlocks, and a clean launch path.",
      readiness: "Submission readiness",
      directoryNetwork: "Directory network",
      stealthRoute: "Stealth route",
      outreachLanes: "Outreach lanes",
      ready: "Ready",
      rollout: "Rollout",
      deltaTitle: "What changes versus manual work",
      deltaBody:
        "The product now feels like an onboarding flow, not an admin form: detect copy first, save one product free, then upgrade when you are ready to run.",
    },
    valueSection: {
      eyebrow: "Why this feels different",
      title:
        "Built for the first meaningful wave of backlinks, not enterprise SEO theatre.",
      points: [
        {
          title: "Starts from your homepage",
          detail:
            "Paste your URL and BacklinkPilot pulls the name, title, and product description before you touch a field.",
        },
        {
          title: "Built for real submission work",
          detail:
            "Directories and stealth routes are live now. The rest of the network is shown honestly as rollout, not fake coverage.",
        },
        {
          title: "Made for makers, not SEO teams",
          detail:
            "You do not need a VA, a link agency, or a giant playbook just to get your first wave of backlinks moving.",
        },
        {
          title: "The next layer of value is managed sending, not more templates",
          detail:
            "As the product expands into resource-page and editorial outreach, the real value is not another canned email. It is the platform providing sender infrastructure, deliverability protection, and reply flow.",
        },
      ],
    },
    offerSection: {
      eyebrow: "What you are buying",
      title: "Clarify the product boundary before adding more features.",
      body:
        "BacklinkPilot should not feel like one fuzzy SEO toolbox. A customer should immediately understand what is included software, what is an optional platform-run add-on, and what belongs in a separate service lane.",
      items: [
        {
          title: "Core software layer",
          badge: "Included in plan",
          detail:
            "Product setup, live submissions, the results center, and the action list belong to the core subscription product.",
        },
        {
          title: "Managed Outreach Inbox",
          badge: "Optional add-on",
          detail:
            "Buy it to get a dedicated inbox with platform-handled send, reply, and follow-up. Skip it and use your own inbox instead.",
        },
        {
          title: "Paid opportunity layer",
          badge: "Handled separately",
          detail:
            "Commercial backlink opportunities should live in a separate premium lane instead of being mixed into normal submission credits.",
        },
        {
          title: "Manual service layer",
          badge: "Sold as service",
          detail:
            "Complex review, custom handling, and human follow-through should be explained and sold as service work, not disguised as already-automated software.",
        },
      ],
    },
    sendingSection: {
      eyebrow: "Sending layer",
      title: "Buy the managed outreach inbox, or use your own inbox.",
      body:
        "This should be a clear product item, not a vague promise about outreach. If they buy it, we assign a dedicated sender identity, send and reply on their behalf, and show the thread in-product. If they do not, they use their own inbox.",
      cards: [
        {
          title: "Managed Outreach Inbox add-on",
          detail:
            "Assign a dedicated outreach mailbox and let the platform own the sender layer for customers who do not want to assemble domains, inboxes, and warmup.",
        },
        {
          title: "We send and handle replies",
          detail:
            "The value is not one outbound email. It is the platform handling send, reply, follow-up, and routing everything back into the product.",
        },
        {
          title: "No add-on means bring your own inbox",
          detail:
            "If the customer does not buy this service, the product should clearly route them to their own sender identity instead of mixing the two modes.",
        },
      ],
      note:
        "This kind of capability should roll out honestly in pilots and phases, not be oversold as fully live on day one.",
      cta: "See Managed Inbox Option",
    },
    workflowSection: {
      eyebrow: "Workflow",
      title: "Three clean steps instead of fifteen little SEO chores.",
      items: [
        {
          step: "01",
          title: "Paste your homepage",
          copy:
            "Start with the URL you already ship. The app normalizes it, reads public metadata, and turns it into a product profile.",
          aside: "Typical time: under 30 seconds",
        },
        {
          step: "02",
          title: "Confirm the positioning",
          copy:
            "Edit the detected name and description, then choose when to upgrade into live directory and stealth submission lanes.",
          aside: "No need to write submission copy from scratch",
        },
        {
          step: "03",
          title: "Let the engine run",
          copy:
            "Track queue, progress, and operational status from one place instead of juggling spreadsheets, VAs, and outreach docs.",
          aside: "Designed for the first 500 backlinks, not enterprise theatre",
        },
      ],
    },
    channelSection: {
      eyebrow: "Channel truth",
      title: "Honest coverage beats fake “all channels live” marketing.",
      body:
        "The product says exactly what is ready today and what is still rolling out. That matters because consumer trust is easier to win on day one than after a refund.",
      liveNow: "Live now",
      rollingOut: "Rolling out next",
      lanes: "lanes",
      ready: "Ready",
      soon: "Soon",
      roadmap: `Total roadmap: ${TOTAL_CHANNEL_COUNT} channels. Live today: ${LIVE_CHANNEL_COUNT}.`,
      groups: [
        {
          label: "Live now",
          tone: "text-emerald-300",
          items: ["Directory Submission", "Stealth Browser Submission"],
        },
        {
          label: "Rolling out next",
          tone: "text-amber-200",
          items: [
            "Community Submission",
            "Resource Page Outreach",
            "Social Distribution",
            "Editorial Outreach",
          ],
        },
      ],
    },
    pricingTeaser: {
      eyebrow: "Pricing posture",
      titleTop: "Start with setup.",
      titleBottom: "Pay when you want the engine.",
      body:
        "The product now lets new users feel the workflow before committing. Pricing is there to unlock live submission capacity, not block basic orientation.",
      cta: "Open Full Pricing",
      cards: [
        {
          label: "Starter",
          price: "$29",
          desc: "Single product, essential volume, clean first launch.",
          accent: "rounded-[1.75rem] border p-6 border-[var(--line-soft)] bg-white/[0.03]",
        },
        {
          label: "Growth",
          price: "$79",
          desc: "The main plan for products actively building distribution.",
          accent:
            "rounded-[1.75rem] border p-6 border-[var(--accent-500)] bg-[linear-gradient(180deg,rgba(208,166,90,0.13),rgba(208,166,90,0.04))]",
        },
        {
          label: "Scale",
          price: "$199",
          desc: "For teams, larger portfolios, and custom submission depth.",
          accent: "rounded-[1.75rem] border p-6 border-[var(--line-soft)] bg-white/[0.03]",
        },
      ],
    },
    faqSection: {
      eyebrow: "FAQ",
      title: "Short answers for the questions that actually matter.",
      items: [
        {
          q: "Is this safe for SEO?",
          a: "The product is built around vetted directories and controlled rollout. It is explicitly not positioned as spam volume or private-blog-network automation.",
        },
        {
          q: "Why is free setup important?",
          a: "Because a consumer tool should let you feel the workflow before asking for money. You can now add one product and see the system recognize it before you upgrade.",
        },
        {
          q: "What happens after I upgrade?",
          a: "Your saved product profile becomes the source of truth for live channels. Directory and stealth routes can start from that profile immediately.",
        },
        {
          q: "Is everything already live?",
          a: `No. ${LIVE_CHANNEL_COUNT} channels are live today, and the remaining ${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} are shown as rollout so the product does not over-promise.`,
        },
      ],
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getHomeCopy(locale);

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
  };
}

type HomeSearchParams = Promise<{
  code?: string | string[];
  error?: string | string[];
  error_description?: string | string[];
  next?: string | string[];
}>;

export default async function Home({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const code = Array.isArray(resolvedSearchParams.code)
    ? resolvedSearchParams.code[0]
    : resolvedSearchParams.code;
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error;
  const errorDescription = Array.isArray(resolvedSearchParams.error_description)
    ? resolvedSearchParams.error_description[0]
    : resolvedSearchParams.error_description;
  const next = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;

  if (code || error || errorDescription) {
    const callbackUrl = new URL("/auth/callback", "http://backlinkpilot.local");

    if (code) {
      callbackUrl.searchParams.set("code", code);
    }
    if (error) {
      callbackUrl.searchParams.set("error", error);
    }
    if (errorDescription) {
      callbackUrl.searchParams.set("error_description", errorDescription);
    }
    if (next) {
      callbackUrl.searchParams.set("next", next);
    }

    redirect(`${callbackUrl.pathname}${callbackUrl.search}`);
  }

  const locale = await getLocale();
  const copy = getHomeCopy(locale);
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
          provenLabel: "当前 proven 市场",
          buildoutLabel: "重点 buildout 市场",
          watchlistLabel: "Watchlist 市场",
          anchorLabel: "Anchor markets",
          ruleLabel: "对外宣称规则",
          readyStatus: "已证明",
          buildoutStatus: "Buildout",
          watchStatus: "观察中",
          adaptiveReady: "目标语言自适应文案已经进入真实能力层。",
          adaptivePending: "目标语言自适应文案还没有进入 proven 合同，不该提前包装成既成卖点。",
          adaptiveSignal: "目标语言自适应文案",
          tieredSignal: "市场按证据分层",
        }
      : {
          provenLabel: "Proven markets",
          buildoutLabel: "Priority buildout markets",
          watchlistLabel: "Watchlist markets",
          anchorLabel: "Anchor markets",
          ruleLabel: "Claim rule",
          readyStatus: "Proven",
          buildoutStatus: "Buildout",
          watchStatus: "Watchlist",
          adaptiveReady:
            "Language-adaptive submission and outreach copy is now a real capability.",
          adaptivePending:
            "Language-adaptive copy is not in the proven contract yet, so it should not be marketed as already-live value.",
          adaptiveSignal: "Language-adaptive copy",
          tieredSignal: "Evidence-tiered market claims",
        };
  const heroSignals = [
    copy.hero.signals[0],
    copy.hero.signals[1],
    publicClaims.provenMarkets[0]
      ? locale === "zh"
        ? `Proven 市场：${publicClaims.provenMarkets[0]}`
        : `Proven market: ${publicClaims.provenMarkets[0]}`
      : copy.hero.signals[2],
    publicClaims.hasLanguageAdaptiveCopy
      ? claimCopy.adaptiveSignal
      : claimCopy.tieredSignal,
    copy.hero.signals[3],
  ];
  const channelGroups = [
    {
      label: claimCopy.provenLabel,
      tone: "text-emerald-300",
      status: claimCopy.readyStatus,
      items: publicClaims.provenMarkets,
    },
    {
      label: claimCopy.buildoutLabel,
      tone: "text-amber-200",
      status: claimCopy.buildoutStatus,
      items: publicClaims.buildoutMarkets,
    },
    {
      label: claimCopy.watchlistLabel,
      tone: "text-stone-300",
      status: claimCopy.watchStatus,
      items: publicClaims.watchlistMarkets,
    },
  ];
  const publicClaimNote = `${claimCopy.anchorLabel}: ${
    publicClaims.anchorMarkets.length > 0
      ? publicClaims.anchorMarkets
          .map((market) => market.toUpperCase())
          .join(locale === "zh" ? "、" : ", ")
      : locale === "zh"
        ? "无"
        : "None"
  }`;

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
            <a href="#product">{copy.nav.product}</a>
            <a href="#workflow">{copy.nav.workflow}</a>
            <a href="#pricing-teaser">{copy.nav.pricing}</a>
            <a href="#faq">{copy.nav.faq}</a>
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

      <section className="relative min-h-screen overflow-hidden px-5 pb-16 pt-28 md:px-8 md:pt-32">
        <div className="bp-grid absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.18),transparent_58%)]" />
        <div className="absolute right-[-12rem] top-32 h-80 w-80 rounded-full bg-emerald-300/8 blur-3xl" />
        <div className="absolute left-[-6rem] top-48 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(26rem,0.85fr)] lg:items-end">
          <div className="bp-fade-up">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-amber-200/80">
              {copy.hero.eyebrow}
            </p>
            <div className="max-w-4xl">
              <div className="font-display text-[4.25rem] leading-none tracking-[-0.05em] text-stone-50 md:text-[7rem]">
                BacklinkPilot
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-medium leading-[1.03] text-stone-100 md:text-5xl">
                {copy.hero.titleTop}
                <br />
                {copy.hero.titleBottom}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                {copy.hero.body}
              </p>
            </div>

            <div className="bp-fade-up bp-fade-delay-1 mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-[var(--accent-500)] px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
              >
                {copy.hero.primaryCta}
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-[var(--line-strong)] px-6 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
              >
                {copy.hero.secondaryCta}
              </Link>
            </div>

            <div className="bp-fade-up bp-fade-delay-2 mt-10 flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] text-stone-400">
              {heroSignals.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--line-soft)] bg-white/4 px-3 py-2"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-4 sm:hidden">
              <LocaleToggle locale={locale} />
            </div>
          </div>

          <div className="bp-fade-up bp-fade-delay-3 relative">
            <div className="bp-float absolute -right-4 top-4 h-28 w-28 rounded-full border border-amber-200/15 bg-amber-100/6 blur-2xl" />
            <div className="bp-float bp-float-delay absolute bottom-12 left-0 h-24 w-24 rounded-full border border-emerald-200/10 bg-emerald-100/6 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-400">
                    {copy.panel.eyebrow}
                  </p>
                  <p className="mt-2 text-2xl font-medium text-stone-50">
                    {copy.panel.title}
                  </p>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-200">
                  {copy.panel.live}
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-stone-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    {copy.panel.homepageUrl}
                  </p>
                  <p className="mt-3 rounded-full border border-white/8 bg-white/5 px-4 py-3 text-sm text-stone-200">
                    https://your-product.com
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[#221c17] p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                      {copy.panel.profile}
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs text-stone-500">{copy.panel.productName}</p>
                        <p className="mt-1 text-lg font-medium text-stone-100">
                          BacklinkPilot
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">{copy.panel.description}</p>
                        <p className="mt-1 text-sm leading-6 text-stone-300">
                          {copy.panel.profileBody}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[#141310] p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                      {copy.panel.readiness}
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-stone-300">
                      <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
                        <span>{copy.panel.directoryNetwork}</span>
                        <span className="text-emerald-200">{copy.panel.ready}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
                        <span>{copy.panel.stealthRoute}</span>
                        <span className="text-emerald-200">{copy.panel.ready}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{copy.panel.outreachLanes}</span>
                        <span className="text-amber-200">{copy.panel.rollout}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[linear-gradient(135deg,rgba(159,224,207,0.08),rgba(208,166,90,0.06))] p-4">
                  <div className="flex items-end justify-between gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                        {copy.panel.deltaTitle}
                      </p>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-stone-300">
                        {copy.panel.deltaBody}
                      </p>
                    </div>
                    <div className="font-display text-5xl leading-none text-amber-100">
                      5m
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="product"
        className="border-t border-[var(--line-soft)] px-5 py-18 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.valueSection.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.valueSection.title}
            </h2>
          </div>
          <div className="mt-12 divide-y divide-[var(--line-soft)] border-y border-[var(--line-soft)]">
            {copy.valueSection.points.map((point) => (
              <div
                key={point.title}
                className="grid gap-5 py-8 md:grid-cols-[0.9fr_1.1fr] md:items-start"
              >
                <h3 className="text-2xl font-medium text-stone-100">
                  {point.title}
                </h3>
                <p className="max-w-2xl text-base leading-7 text-stone-400">
                  {point.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line-soft)] bg-white/[0.02] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.offerSection.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.offerSection.title}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-stone-400">
              {copy.offerSection.body}
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.offerSection.items.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/15 p-6"
              >
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-stone-200">
                  {item.badge}
                </span>
                <h3 className="mt-4 text-xl font-medium text-stone-100">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line-soft)] bg-white/[0.02] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.sendingSection.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.sendingSection.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-400">
              {copy.sendingSection.body}
            </p>
            <p className="mt-6 max-w-xl text-sm leading-7 text-stone-500">
              {copy.sendingSection.note}
            </p>
            <Link
              href="/pricing#managed-inbox"
              className="mt-8 inline-flex rounded-full bg-[var(--accent-500)] px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.sendingSection.cta}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.sendingSection.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/15 p-6"
              >
                <h3 className="text-xl font-medium text-stone-100">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.62fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.workflowSection.eyebrow}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
                {copy.workflowSection.title}
              </h2>
            </div>
            <div className="space-y-6">
              {copy.workflowSection.items.map((item) => (
                <div
                  key={item.step}
                  className="grid gap-4 rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.03] p-6 md:grid-cols-[5.5rem_1fr_auto] md:items-start"
                >
                  <div className="font-display text-5xl leading-none text-amber-100/80">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-stone-100">
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400 md:text-base">
                      {item.copy}
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-500 md:max-w-[12rem] md:text-right">
                    {item.aside}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line-soft)] bg-white/[0.02] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.channelSection.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.channelSection.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-400">
              {copy.channelSection.body}
            </p>
          </div>
          <div className="space-y-8">
            {channelGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-stone-950/60 p-6"
              >
                <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-4">
                  <p
                    className={`text-sm font-medium uppercase tracking-[0.28em] ${group.tone}`}
                  >
                    {group.label}
                  </p>
                  <span className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    {group.items.length} {copy.channelSection.lanes}
                  </span>
                </div>
                <div className="mt-4 divide-y divide-[var(--line-soft)]">
                  {group.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between py-4 text-sm text-stone-300 md:text-base"
                    >
                      <span>{item}</span>
                      <span
                        className={`text-xs uppercase tracking-[0.24em] ${group.tone}`}
                      >
                        {group.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                {claimCopy.ruleLabel}
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                {publicClaims.claimRule}
              </p>
              <p className="mt-3 text-xs leading-6 text-stone-500">
                {publicClaimNote}
              </p>
              <p className="mt-3 text-xs leading-6 text-stone-500">
                {publicClaims.hasLanguageAdaptiveCopy
                  ? claimCopy.adaptiveReady
                  : claimCopy.adaptivePending}
              </p>
            </div>
            <p className="text-sm text-stone-500">{copy.channelSection.roadmap}</p>
          </div>
        </div>
      </section>

      <section id="pricing-teaser" className="px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.pricingTeaser.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.pricingTeaser.titleTop}
              <br />
              {copy.pricingTeaser.titleBottom}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-400">
              {copy.pricingTeaser.body}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.pricingTeaser.cards.map((card) => (
              <div key={card.label} className={card.accent}>
                <p className="text-sm uppercase tracking-[0.28em] text-stone-500">
                  {card.label}
                </p>
                <p className="mt-5 font-display text-5xl text-stone-50">
                  {card.price}
                </p>
                <p className="mt-4 text-sm leading-6 text-stone-400">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl">
          <Link
            href="/pricing"
            className="inline-flex rounded-full border border-[var(--line-strong)] px-6 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
          >
            {copy.pricingTeaser.cta}
          </Link>
        </div>
      </section>

      <section
        id="faq"
        className="border-t border-[var(--line-soft)] px-5 py-18 md:px-8 md:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.faqSection.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              {copy.faqSection.title}
            </h2>
          </div>
          <div className="space-y-4">
            {copy.faqSection.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.03] p-6"
              >
                <summary className="cursor-pointer list-none text-lg font-medium text-stone-100">
                  {item.q}
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400 md:text-base">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
