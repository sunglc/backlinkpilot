"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import LocaleToggle from "@/components/locale-toggle";
import {
  CHANNELS,
  LIVE_CHANNEL_COUNT,
  TOTAL_CHANNEL_COUNT,
  type ChannelContract,
} from "@/lib/execution-contract";
import { type Locale } from "@/lib/locale-config";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string;
}

interface Product {
  id: string;
  name: string;
  url: string;
  description: string;
  status: string;
  created_at: string;
}

interface Submission {
  id: string;
  product_id: string;
  channel: string;
  status: string;
  total_sites: number;
  completed_sites: number;
  success_sites: number;
  created_at: string;
}

interface SitePreview {
  normalizedUrl: string;
  hostname: string;
  name: string;
  description: string;
  detectedFrom: {
    name: string;
    description: string;
  };
}

type CheckoutState = "success" | "cancelled" | null;
type LaunchStage = "unlock" | "running" | "ready" | "momentum" | "setup";
type ProductPrimaryAction =
  | {
      kind: "link";
      href: string;
      label: string;
    }
  | {
      kind: "launch";
      channelId: string;
      label: string;
    };

type LaunchProductPrimaryAction = Extract<
  ProductPrimaryAction,
  { kind: "launch" }
>;
type LinkProductPrimaryAction = Extract<ProductPrimaryAction, { kind: "link" }>;

interface ProductSummary {
  product: Product;
  submissions: Submission[];
  latestSubmission: Submission | null;
  activeSubmission: Submission | null;
  recommendedChannel: ChannelContract | null;
  launchCount: number;
  totalSuccessfulActions: number;
  stage: LaunchStage;
  nextStep: string;
  primaryAction: ProductPrimaryAction;
}

const FREE_PREVIEW_PRODUCT_LIMIT = 1;
const PLAN_ORDER = ["free", "starter", "growth", "scale"] as const;

function getDashboardCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      nav: {
        logout: "退出登录",
      },
      header: {
        title: "Launch 工作台",
        addFirstProduct: "添加第一个产品",
        addProduct: "+ 添加产品",
        upgradePlan: "升级计划",
      },
      hero: {
        eyebrow: "消费级外链工作台",
        noProductTitle: "先配置第一个产品，再开始真实分发。",
        noProductBody:
          "贴上你的首页，系统会自动补齐产品文案，并把最适合先跑的渠道排出来。",
        freeTitle: "第一个产品已经就绪，下一步是解锁真实渠道。",
        freeBody:
          "Starter 立刻解锁目录提交和 stealth 两条 live 渠道，直接从你现在的产品档案开始执行。",
        activeTitle: "现在有一条外链任务正在跑。",
        activeBody:
          "运行中的产品会持续刷新进度。你只需要盯住结果，不需要自己追每一个站点。",
        readyTitle: "Launch board 已经准备好，下一步是把最合适的渠道跑起来。",
        readyBody:
          "我们会优先推荐还没跑过的 live 渠道，让使用路径更像消费级产品，而不是后台操作台。",
        primaryNoProduct: "添加第一个产品",
        primaryUnlock: "解锁入门版",
        secondaryGrowth: "直接看增长版",
        primaryWatch: "查看运行中产品",
        primaryLaunch: "进入推荐产品",
        secondaryPricing: "查看计划",
        secondaryAdd: "再添加一个产品",
        summaryTitle: "这一屏先回答三件事",
        summaryItems: [
          "当前是否已经有 live 渠道可跑",
          "哪个产品应该先推进",
          "下一步应该升级、启动还是盯进度",
        ],
      },
      stats: {
        plan: "当前计划",
        products: "产品数",
        launches: "启动次数",
        liveRuns: "运行中",
        successfulActions: "成功动作",
        configuredProducts: "进入执行链",
        freeSlot: "还有 1 个免费配置名额",
        upgradeToUnlock: "升级后解锁真实提交",
        active: "已激活",
      },
      board: {
        eyebrow: "Launch Board",
        title: "每个产品都应该有明确的下一步。",
        body: "这里不只是列产品，而是直接告诉你该升级、该启动，还是该去看运行中的结果。",
      },
      productCard: {
        nextStep: "下一步",
        latestRun: "最近一次",
        noRunsYet: "还没有执行记录",
        launchCount: "启动次数",
        successfulActions: "成功动作",
        channelsReady: "当前可跑渠道",
        progress: "当前进度",
        latestLane: "最近渠道",
        recommendationPrefix: "推荐先跑",
        open: "打开产品",
        unlock: "解锁真实渠道",
        watch: "查看运行中进度",
        launchFirst: "启动首条渠道",
        launchNext: "继续下一条渠道",
        review: "查看结果",
        continueSetup: "继续配置",
        starting: "启动中...",
        stage: {
          unlock: "待解锁",
          running: "运行中",
          ready: "待启动",
          momentum: "已有进展",
          setup: "配置中",
        },
        stageBody: {
          unlock: "产品档案已经在位，升级后就能进入真实提交。",
          running: "有一条渠道正在处理，详情页会自动刷新进度。",
          ready: "最适合先跑的 live 渠道已经标出来，可以直接启动。",
          momentum: "这个产品已经跑过至少一轮，可以继续扩展下一条渠道。",
          setup: "先进入产品页确认档案，再启动第一条渠道。",
        },
      },
      checkout: {
        successEyebrow: "付款已完成",
        successTitle: "计划已经解锁，直接开始第一条 live 渠道。",
        successBody:
          "最好的下一步不是回头研究价格，而是立刻把这个产品送进真实分发。BacklinkPilot 应该在付款后直接带你进入执行。",
        successPendingTitle: "付款已完成，正在确认计划状态。",
        successPendingBody:
          "如果页面顶部还没显示新计划，通常只是 webhook 正在同步。等几秒后刷新，这个工作台会自动切换成可执行状态。",
        cancelledEyebrow: "付款未完成",
        cancelledTitle: "别丢失推进节奏，选回最合适的一档继续。",
        cancelledBody:
          "你的产品、launch 路径和推荐渠道都还在。选对计划后，可以直接从当前工作台接着往下跑。",
        startNow: "立即启动推荐渠道",
        openProduct: "打开推荐产品",
        addProduct: "添加第一个产品",
        refresh: "刷新工作台",
        starter: "回到入门版",
        growth: "直接看增长版",
      },
      lanes: {
        liveTitle: "今天可执行",
        liveBody: "已上线渠道会直接执行，推进中渠道会清楚标明需要哪个计划。",
        roadmapTitle: "后续路线",
        roadmapBody: `当前共 ${LIVE_CHANNEL_COUNT} 个 live 渠道，${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} 个 roadmap 渠道。`,
        included: "已包含",
        locked: "需升级",
        availableNow: "今天可跑",
        whenRolledOut: "rollout 完成后可跑",
        requires: "需要",
      },
      modal: {
        title: "添加产品",
        freeBanner:
          "免费配置模式：你可以先添加 1 个产品，自动识别站点文案，并在升级前预览整体流程。",
        productName: "产品名称",
        productNamePlaceholder: "例如：我的 SaaS 工具",
        websiteUrl: "网站地址",
        websiteUrlPlaceholder: "https://example.com",
        detect: "自动识别",
        detecting: "识别中...",
        detectHint: "贴上你的首页，BacklinkPilot 会自动拉取标题和描述。",
        detectedFrom: "识别来源",
        nameSource: "名称来源",
        descriptionSource: "描述来源",
        description: "描述",
        descriptionPlaceholder: "简要描述一下你的产品...",
        cancel: "取消",
        save: "添加产品",
        saving: "保存中...",
      },
      errors: {
        enterUrl: "请先输入网站地址。",
        previewFailed: "暂时无法预览这个网站。",
        upgradeRequired: "升级计划后才能继续添加更多产品。",
        saveFailed: "暂时无法保存这个产品。",
      },
      onboarding: {
        title: "免费配置你的第一个产品",
        body:
          "先贴首页，自动补齐产品文案。你会先看到 launch board 的推荐，再决定什么时候进入真实提交。",
        primary: "添加第一个产品",
        secondary: "查看计划",
        steps: [
          {
            title: "1. 贴上首页地址",
            copy: "直接使用你的主产品网址。系统会规范化 URL 并读取公开元信息。",
          },
          {
            title: "2. 自动补齐基础信息",
            copy: "产品标题和描述会从站点自动带出，配置体验更像消费级应用，而不是后台表单。",
          },
          {
            title: "3. 准备好再升级",
            copy: `当你准备启动真实提交时，再解锁 ${LIVE_CHANNEL_COUNT} 个已上线渠道。`,
          },
        ],
      },
      emptyState: {
        title: "添加你的第一个产品",
        body: "先补齐产品信息，我们就可以开始把它送进真正的外链执行链。",
        cta: "+ 添加产品",
      },
      detectedLabel: "识别自",
    };
  }

  return {
    nav: {
      logout: "Log out",
    },
    header: {
      title: "Launch Workspace",
      addFirstProduct: "Add Your First Product",
      addProduct: "+ Add Product",
      upgradePlan: "Upgrade Plan",
    },
    hero: {
      eyebrow: "Consumer-grade backlink workspace",
      noProductTitle: "Set up the first product, then start real distribution.",
      noProductBody:
        "Paste your homepage, let the app fill the basics, and we will line up the best first lane automatically.",
      freeTitle: "Your first product is staged. The next step is unlocking live lanes.",
      freeBody:
        "Starter unlocks Directory Submission and Stealth immediately, both running from the product profile you already saved.",
      activeTitle: "A backlink launch is running right now.",
      activeBody:
        "Live products keep refreshing progress here. You should be watching outcomes, not manually tracking every site.",
      readyTitle: "The launch board is ready. Now run the best next lane.",
      readyBody:
        "We prioritize the next live lane that has not been used yet, so the flow feels like a consumer product instead of an operations console.",
      primaryNoProduct: "Add First Product",
      primaryUnlock: "Unlock Starter",
      secondaryGrowth: "See Growth",
      primaryWatch: "Open Active Product",
      primaryLaunch: "Open Recommended Product",
      secondaryPricing: "See Plans",
      secondaryAdd: "Add Another Product",
      summaryTitle: "This screen answers three things first",
      summaryItems: [
        "whether you have a live lane available today",
        "which product should move next",
        "whether to upgrade, launch, or watch progress",
      ],
    },
    stats: {
      plan: "Plan",
      products: "Products",
      launches: "Launches",
      liveRuns: "Running now",
      successfulActions: "Successful actions",
      configuredProducts: "In execution flow",
      freeSlot: "1 free setup slot available",
      upgradeToUnlock: "Upgrade to unlock live submissions",
      active: "Active",
    },
    board: {
      eyebrow: "Launch Board",
      title: "Every product should have a clear next step.",
      body:
        "This is not just a product list. It should tell you whether to upgrade, launch, or review a run already in motion.",
    },
    productCard: {
      nextStep: "Next step",
      latestRun: "Latest run",
      noRunsYet: "No runs yet",
      launchCount: "Launches",
      successfulActions: "Successful actions",
      channelsReady: "Live lanes today",
      progress: "Progress",
      latestLane: "Latest lane",
      recommendationPrefix: "Recommended lane",
      open: "Open Product",
      unlock: "Unlock Live Lanes",
      watch: "Watch Live Progress",
      launchFirst: "Launch First Lane",
      launchNext: "Launch Next Lane",
      review: "Review Results",
      continueSetup: "Continue Setup",
      starting: "Starting...",
      stage: {
        unlock: "Upgrade needed",
        running: "Running",
        ready: "Ready to launch",
        momentum: "Momentum",
        setup: "Setup",
      },
      stageBody: {
        unlock: "The product profile is already staged. Upgrade and it can enter live execution.",
        running: "A live lane is already processing and the detail page will keep updating.",
        ready: "The best live lane is identified and can be launched now.",
        momentum: "This product has already started moving. The next lane should expand the distribution.",
        setup: "Open the product page, confirm the profile, and launch the first lane after that.",
      },
    },
    checkout: {
      successEyebrow: "Payment received",
      successTitle: "Your plan is unlocked. Start the first live lane now.",
      successBody:
        "The best next move is not going back to pricing. It is sending the product into real distribution immediately. BacklinkPilot should take you straight into execution after payment.",
      successPendingTitle: "Payment received. Plan status is still syncing.",
      successPendingBody:
        "If the new plan is not visible yet, this is usually just the webhook catching up. Refresh in a few seconds and the workspace should switch into launch mode.",
      cancelledEyebrow: "Checkout not completed",
      cancelledTitle: "Do not lose the launch rhythm. Pick the right plan and continue.",
      cancelledBody:
        "Your product, launch path, and recommended lanes are all still here. Choose the right plan and continue from this exact workspace.",
      startNow: "Start Recommended Lane",
      openProduct: "Open Recommended Product",
      addProduct: "Add First Product",
      refresh: "Refresh Workspace",
      starter: "Back to Starter",
      growth: "See Growth",
    },
    lanes: {
      liveTitle: "Runnable today",
      liveBody:
        "Live lanes can execute immediately. Planned lanes stay visible so the upgrade path is obvious.",
      roadmapTitle: "Roadmap lanes",
      roadmapBody: `There are ${LIVE_CHANNEL_COUNT} live lanes today and ${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} roadmap lanes behind rollout.`,
      included: "Included",
      locked: "Upgrade",
      availableNow: "Runnable now",
      whenRolledOut: "Runnable when rollout lands",
      requires: "Requires",
    },
    modal: {
      title: "Add Product",
      freeBanner:
        "Free setup mode: add 1 product, auto-detect its copy, and preview your setup before upgrading.",
      productName: "Product Name",
      productNamePlaceholder: "e.g. My SaaS Tool",
      websiteUrl: "Website URL",
      websiteUrlPlaceholder: "https://example.com",
      detect: "Auto-fill",
      detecting: "Detecting...",
      detectHint:
        "Paste your homepage and BacklinkPilot will pull the title and description automatically.",
      detectedFrom: "Detected from",
      nameSource: "Name source",
      descriptionSource: "Description source",
      description: "Description",
      descriptionPlaceholder: "Brief description of your product...",
      cancel: "Cancel",
      save: "Add Product",
      saving: "Saving...",
    },
    errors: {
      enterUrl: "Enter your website URL first.",
      previewFailed: "Could not preview that website.",
      upgradeRequired: "Upgrade your plan to add more products.",
      saveFailed: "Could not save that product.",
    },
    onboarding: {
      title: "Set up your first product for free",
      body:
        "Paste your homepage, auto-detect the product copy, then let the launch board show the next move before you pay.",
      primary: "Add First Product",
      secondary: "See Plans",
      steps: [
        {
          title: "1. Paste your homepage",
          copy:
            "Use your main product URL. BacklinkPilot will normalize it and read your public metadata.",
        },
        {
          title: "2. Auto-fill the basics",
          copy:
            "We pull the title and description from the site so setup feels like a consumer app, not a backend form.",
        },
        {
          title: "3. Upgrade when ready",
          copy: `Unlock ${LIVE_CHANNEL_COUNT} live lanes when you want real submissions to begin.`,
        },
      ],
    },
    emptyState: {
      title: "Add your first product",
      body: "Add the product details and we can move it into live backlink execution.",
      cta: "+ Add Product",
    },
    detectedLabel: "Detected from",
  };
}

function getLocalizedChannel(channel: ChannelContract, locale: Locale) {
  if (locale === "zh") {
    const mapping: Record<string, { name: string; desc: string }> = {
      directory: {
        name: "目录提交",
        desc: "提交到经过筛选的 AI 工具目录，自动完成表单填写。",
      },
      stealth: {
        name: "Stealth 浏览器提交",
        desc: "使用同一套目录网络，但带上 stealth 防护去通过更难的站点。",
      },
      community: {
        name: "社区提交",
        desc: "GitHub、Product Hunt 和开发者社区处于受控 rollout 中。",
      },
      resource_page: {
        name: "资源页外联",
        desc: "编辑类资源页外联仍在受控 rollout 中。",
      },
      social: {
        name: "社交分发",
        desc: "X 和 Pinterest 分发目前仍在客户 worker 之外执行。",
      },
      editorial: {
        name: "编辑外联",
        desc: "编辑外联渠道仍在受控 rollout 中。",
      },
    };

    return mapping[channel.id] || { name: channel.name, desc: channel.desc };
  }

  return { name: channel.name, desc: channel.desc };
}

function productStatusLabel(status: string, locale: Locale) {
  const labels =
    locale === "zh"
      ? {
          active: "运行中",
          completed: "就绪",
          pending: "排队中",
          draft: "草稿",
        }
      : {
          active: "Active",
          completed: "Ready",
          pending: "Queued",
          draft: "Draft",
        };

  return labels[status as keyof typeof labels] || status;
}

function productStatusClasses(status: string) {
  const classes: Record<string, string> = {
    active: "bg-emerald-300/10 text-emerald-200",
    completed: "bg-sky-300/10 text-sky-200",
    pending: "bg-amber-300/10 text-amber-200",
    draft: "bg-stone-800 text-stone-300",
  };
  return classes[status] || "bg-amber-300/10 text-amber-200";
}

function launchStageClasses(stage: LaunchStage) {
  const classes: Record<LaunchStage, string> = {
    unlock: "border-amber-300/15 bg-amber-300/10 text-amber-100",
    running: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    ready: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
    momentum: "border-white/10 bg-white/8 text-stone-100",
    setup: "border-white/10 bg-white/6 text-stone-300",
  };

  return classes[stage];
}

function formatPlanName(plan: string | null | undefined, locale: Locale) {
  const labels =
    locale === "zh"
      ? {
          free: "免费版",
          starter: "入门版",
          growth: "增长版",
          scale: "规模版",
        }
      : {
          free: "Free",
          starter: "Starter",
          growth: "Growth",
          scale: "Scale",
        };

  if (!plan) {
    return labels.free;
  }

  return labels[plan as keyof typeof labels] || plan;
}

function formatDashboardDate(date: string, locale: Locale) {
  return new Date(date).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minimumPlanForChannel(channel: ChannelContract) {
  return (
    [...channel.plans].sort(
      (a, b) =>
        PLAN_ORDER.indexOf(a as (typeof PLAN_ORDER)[number]) -
        PLAN_ORDER.indexOf(b as (typeof PLAN_ORDER)[number])
    )[0] || "starter"
  );
}

function isLaunchAction(
  action: ProductPrimaryAction
): action is LaunchProductPrimaryAction {
  return action.kind === "launch";
}

function isLinkAction(
  action: ProductPrimaryAction
): action is LinkProductPrimaryAction {
  return action.kind === "link";
}

export default function DashboardClient({
  locale,
  user,
  subscription,
  products,
  submissions,
  checkoutState,
}: {
  locale: Locale;
  user: User;
  subscription: Subscription | null;
  products: Product[];
  submissions: Submission[];
  checkoutState: CheckoutState;
}) {
  const copy = getDashboardCopy(locale);
  const router = useRouter();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [preview, setPreview] = useState<SitePreview | null>(null);
  const [launchingKey, setLaunchingKey] = useState<string | null>(null);
  const [workspaceActionError, setWorkspaceActionError] = useState("");

  const isPaid = subscription?.status === "active";
  const currentPlan = isPaid ? subscription?.plan || "starter" : "free";
  const planName = formatPlanName(currentPlan, locale);
  const canAddProduct = isPaid || products.length < FREE_PREVIEW_PRODUCT_LIMIT;
  const liveChannels = CHANNELS.filter((channel) => channel.support_status === "live");
  const roadmapChannels = CHANNELS.filter((channel) => channel.support_status !== "live");
  const liveChannelsForPlan = isPaid
    ? liveChannels.filter((channel) => channel.plans.includes(currentPlan))
    : [];
  const launchedProductIds = new Set(submissions.map((submission) => submission.product_id));
  const totalSuccessfulActions = submissions.reduce(
    (sum, submission) => sum + submission.success_sites,
    0
  );
  const activeLaunches = submissions.filter(
    (submission) => submission.status === "queued" || submission.status === "running"
  ).length;
  const isCheckoutSuccess = checkoutState === "success";
  const isCheckoutCancelled = checkoutState === "cancelled";
  const isPlanSyncPending = isCheckoutSuccess && !isPaid;

  const productSummaries: ProductSummary[] = products.map((product) => {
    const productSubmissions = submissions.filter(
      (submission) => submission.product_id === product.id
    );
    const latestSubmission = productSubmissions[0] || null;
    const activeSubmission =
      productSubmissions.find(
        (submission) =>
          submission.status === "queued" || submission.status === "running"
      ) || null;
    const totalProductSuccessfulActions = productSubmissions.reduce(
      (sum, submission) => sum + submission.success_sites,
      0
    );
    const submittedChannelIds = new Set(
      productSubmissions.map((submission) => submission.channel)
    );
    const recommendedChannel =
      liveChannelsForPlan.find((channel) => !submittedChannelIds.has(channel.id)) ||
      liveChannelsForPlan[0] ||
      null;

    let stage: LaunchStage = "setup";
    let primaryAction: ProductPrimaryAction = {
      kind: "link",
      href: `/dashboard/product/${product.id}`,
      label: copy.productCard.continueSetup,
    };
    let nextStep = copy.productCard.stageBody.setup;

    if (!isPaid) {
      const laneNames = liveChannels
        .slice(0, 2)
        .map((channel) => getLocalizedChannel(channel, locale).name)
        .join(locale === "zh" ? "、" : " and ");

      stage = "unlock";
      primaryAction = {
        kind: "link",
        href: "/api/stripe/checkout?plan=starter",
        label: copy.productCard.unlock,
      };
      nextStep =
        locale === "zh"
          ? `升级 Starter 后，先跑 ${laneNames}。`
          : `Unlock Starter and run ${laneNames} first.`;
    } else if (activeSubmission) {
      const activeChannel =
        liveChannels.find((channel) => channel.id === activeSubmission.channel) ||
        CHANNELS.find((channel) => channel.id === activeSubmission.channel) ||
        null;
      const activeChannelName = activeChannel
        ? getLocalizedChannel(activeChannel, locale).name
        : activeSubmission.channel;

      stage = "running";
      primaryAction = {
        kind: "link",
        href: `/dashboard/product/${product.id}#submission-history`,
        label: copy.productCard.watch,
      };
      nextStep =
        locale === "zh"
          ? `继续盯住 ${activeChannelName} 的实时进度，等 worker 完成这一轮。`
          : `Keep watching ${activeChannelName} while the worker finishes this run.`;
    } else if (product.status === "draft" && productSubmissions.length === 0) {
      stage = "setup";
      primaryAction = {
        kind: "link",
        href: `/dashboard/product/${product.id}`,
        label: copy.productCard.continueSetup,
      };
      nextStep =
        locale === "zh"
          ? "先进入产品页确认档案，再启动第一条 live 渠道。"
          : "Open the product page, confirm the profile, then launch the first live lane.";
    } else if (productSubmissions.length === 0) {
      const recommendedName = recommendedChannel
        ? getLocalizedChannel(recommendedChannel, locale).name
        : locale === "zh"
          ? "目录提交"
          : "Directory Submission";

      stage = "ready";
      primaryAction = recommendedChannel
        ? {
            kind: "launch",
            channelId: recommendedChannel.id,
            label: copy.productCard.launchFirst,
          }
        : {
            kind: "link",
            href: `/dashboard/product/${product.id}`,
            label: copy.productCard.launchFirst,
          };
      nextStep =
        locale === "zh"
          ? `先启动 ${recommendedName}，让这个产品正式进入真实分发。`
          : `Launch ${recommendedName} first to move this product into live distribution.`;
    } else if (
      recommendedChannel &&
      !submittedChannelIds.has(recommendedChannel.id)
    ) {
      const recommendedName = getLocalizedChannel(recommendedChannel, locale).name;

      stage = "momentum";
      primaryAction = {
        kind: "launch",
        channelId: recommendedChannel.id,
        label: copy.productCard.launchNext,
      };
      nextStep =
        locale === "zh"
          ? `下一条建议是 ${recommendedName}，用它把首轮结果继续扩开。`
          : `Run ${recommendedName} next to expand beyond the first live result set.`;
    } else {
      stage = "momentum";
      primaryAction = {
        kind: "link",
        href: `/dashboard/product/${product.id}`,
        label: copy.productCard.review,
      };
      nextStep =
        locale === "zh"
          ? "打开产品页复盘最近一轮结果，再决定是否加新产品或重跑。"
          : "Open the product page, review the latest run, then decide whether to relaunch or add another product.";
    }

    return {
      product,
      submissions: productSubmissions,
      latestSubmission,
      activeSubmission,
      recommendedChannel,
      launchCount: productSubmissions.length,
      totalSuccessfulActions: totalProductSuccessfulActions,
      stage,
      nextStep,
      primaryAction,
    };
  });

  const featuredProduct =
    productSummaries.find((summary) => summary.activeSubmission) ||
    productSummaries.find((summary) => summary.stage === "ready") ||
    productSummaries.find((summary) => summary.stage === "unlock") ||
    productSummaries[0] ||
    null;
  const featuredLaunchAction =
    featuredProduct && isLaunchAction(featuredProduct.primaryAction)
      ? featuredProduct.primaryAction
      : null;

  let heroTitle = copy.hero.readyTitle;
  let heroBody = copy.hero.readyBody;

  if (products.length === 0) {
    heroTitle = copy.hero.noProductTitle;
    heroBody = copy.hero.noProductBody;
  } else if (!isPaid) {
    heroTitle = copy.hero.freeTitle;
    heroBody = copy.hero.freeBody;
  } else if (activeLaunches > 0) {
    heroTitle = copy.hero.activeTitle;
    heroBody = copy.hero.activeBody;
  }

  async function handleWorkspaceLaunch(productId: string, channelId: string) {
    const actionKey = `${productId}:${channelId}`;
    setLaunchingKey(actionKey);
    setWorkspaceActionError("");

    const supabase = createClient();
    const { error } = await supabase.from("submissions").insert({
      user_id: user.id,
      product_id: productId,
      channel: channelId,
      status: "queued",
    });

    if (error) {
      setWorkspaceActionError(error.message || copy.errors.saveFailed);
      setLaunchingKey(null);
      return;
    }

    setLaunchingKey(null);
    router.push(`/dashboard/product/${productId}#submission-history`);
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function openAddProduct() {
    setShowAddProduct(true);
    setSaveError("");
    setPreviewError("");
  }

  function closeAddProduct() {
    setShowAddProduct(false);
    setSaveError("");
    setPreviewError("");
    setPreview(null);
    setName("");
    setUrl("");
    setDescription("");
    setPreviewLoading(false);
  }

  async function handleAutofillFromUrl() {
    if (!url.trim()) {
      setPreviewError(copy.errors.enterUrl);
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");
    setSaveError("");

    try {
      const response = await fetch("/api/products/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as SitePreview | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : copy.errors.previewFailed);
      }

      if (!("normalizedUrl" in data)) {
        throw new Error(copy.errors.previewFailed);
      }

      setPreview(data);
      setUrl(data.normalizedUrl);
      setName(data.name);
      setDescription(data.description);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : copy.errors.previewFailed
      );
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!canAddProduct) {
      setSaveError(copy.errors.upgradeRequired);
      return;
    }

    setSaving(true);
    setSaveError("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        name,
        url,
        description,
        status: isPaid ? "pending" : "draft",
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      closeAddProduct();
      router.push(`/dashboard/product/${data.id}`);
      router.refresh();
      setSaving(false);
      return;
    }

    if (!error) {
      closeAddProduct();
      router.refresh();
    } else {
      setSaveError(error.message || copy.errors.saveFailed);
    }

    setSaving(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="bp-grid absolute inset-0 opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.16),transparent_58%)]" />
      <div className="absolute -left-12 top-56 h-64 w-64 rounded-full bg-amber-300/8 blur-3xl" />
      <div className="absolute -right-16 top-32 h-72 w-72 rounded-full bg-emerald-300/7 blur-3xl" />

      <nav className="relative border-b border-[var(--line-soft)] bg-black/10 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <span className="text-xl font-semibold text-white">BacklinkPilot</span>
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} />
            <span className="hidden text-sm text-stone-400 md:inline">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-stone-400 transition hover:text-white"
            >
              {copy.nav.logout}
            </button>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-amber-200/80">
              {copy.hero.eyebrow}
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
              {copy.header.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              {heroBody}
            </p>
          </div>
          {canAddProduct ? (
            <button
              onClick={openAddProduct}
              className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {products.length === 0
                ? copy.header.addFirstProduct
                : copy.header.addProduct}
            </button>
          ) : (
            <a
              href="/api/stripe/checkout?plan=starter"
              className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.header.upgradePlan}
            </a>
          )}
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur">
            <h2 className="font-display max-w-4xl text-4xl leading-[0.95] text-stone-50 md:text-6xl">
              {heroTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300">
              {heroBody}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {products.length === 0 ? (
                <>
                  <button
                    onClick={openAddProduct}
                    className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.hero.primaryNoProduct}
                  </button>
                  <Link
                    href="/pricing"
                    className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.hero.secondaryPricing}
                  </Link>
                </>
              ) : !isPaid ? (
                <>
                  <a
                    href="/api/stripe/checkout?plan=starter"
                    className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.hero.primaryUnlock}
                  </a>
                  <a
                    href="/api/stripe/checkout?plan=growth"
                    className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.hero.secondaryGrowth}
                  </a>
                </>
              ) : featuredProduct?.activeSubmission ? (
                <>
                  <Link
                    href={`/dashboard/product/${featuredProduct.product.id}#submission-history`}
                    className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.hero.primaryWatch}
                  </Link>
                  <button
                    onClick={openAddProduct}
                    className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.hero.secondaryAdd}
                  </button>
                </>
              ) : featuredProduct ? (
                <>
                  <Link
                    href={`/dashboard/product/${featuredProduct.product.id}`}
                    className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.hero.primaryLaunch}
                  </Link>
                  <button
                    onClick={openAddProduct}
                    className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.hero.secondaryAdd}
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {copy.hero.summaryItems.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-4 text-sm leading-6 text-stone-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {[
              {
                label: copy.stats.plan,
                value: planName,
                note: isPaid ? copy.stats.active : copy.stats.upgradeToUnlock,
                tone: "text-amber-100",
              },
              {
                label: copy.stats.products,
                value: `${products.length}`,
                note: !isPaid && products.length === 0 ? copy.stats.freeSlot : `${products.length}`,
                tone: "text-stone-50",
              },
              {
                label: copy.stats.launches,
                value: `${submissions.length}`,
                note: `${launchedProductIds.size}/${products.length || 0} ${copy.stats.configuredProducts}`,
                tone: "text-emerald-200",
              },
              {
                label: copy.stats.liveRuns,
                value: `${activeLaunches}`,
                note: `${totalSuccessfulActions} ${copy.stats.successfulActions}`,
                tone: "text-sky-200",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.04] p-5"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                  {item.label}
                </p>
                <p className={`mt-3 text-3xl font-semibold ${item.tone}`}>{item.value}</p>
                <p className="mt-2 text-xs leading-6 text-stone-500">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {isCheckoutSuccess || isCheckoutCancelled ? (
          <section className="mt-8">
            <div className="rounded-[2rem] border border-[var(--line-strong)] bg-[linear-gradient(135deg,rgba(208,166,90,0.14),rgba(159,224,207,0.09))] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    {isCheckoutSuccess
                      ? copy.checkout.successEyebrow
                      : copy.checkout.cancelledEyebrow}
                  </p>
                  <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                    {isCheckoutSuccess && isPlanSyncPending
                      ? copy.checkout.successPendingTitle
                      : isCheckoutSuccess
                        ? copy.checkout.successTitle
                        : copy.checkout.cancelledTitle}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-stone-300">
                    {isCheckoutSuccess && isPlanSyncPending
                      ? copy.checkout.successPendingBody
                      : isCheckoutSuccess
                        ? copy.checkout.successBody
                        : copy.checkout.cancelledBody}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isCheckoutSuccess ? (
                    isPlanSyncPending ? (
                      <button
                        onClick={() => router.refresh()}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {copy.checkout.refresh}
                      </button>
                    ) : featuredProduct && featuredLaunchAction ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleWorkspaceLaunch(
                            featuredProduct.product.id,
                            featuredLaunchAction.channelId
                          )
                        }
                        disabled={
                          launchingKey ===
                          `${featuredProduct.product.id}:${featuredLaunchAction.channelId}`
                        }
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                      >
                        {launchingKey ===
                        `${featuredProduct.product.id}:${featuredLaunchAction.channelId}`
                          ? copy.productCard.starting
                          : copy.checkout.startNow}
                      </button>
                    ) : featuredProduct ? (
                      <Link
                        href={`/dashboard/product/${featuredProduct.product.id}`}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {copy.checkout.openProduct}
                      </Link>
                    ) : (
                      <button
                        onClick={openAddProduct}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {copy.checkout.addProduct}
                      </button>
                    )
                  ) : (
                    <>
                      <a
                        href="/api/stripe/checkout?plan=starter"
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {copy.checkout.starter}
                      </a>
                      <a
                        href="/api/stripe/checkout?plan=growth"
                        className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                      >
                        {copy.checkout.growth}
                      </a>
                    </>
                  )}
                </div>
              </div>

              {workspaceActionError ? (
                <p className="mt-5 text-sm text-red-300">{workspaceActionError}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {showAddProduct ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-[2rem] border border-[var(--line-strong)] bg-stone-950 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
              <h2 className="mb-6 text-lg font-bold text-white">{copy.modal.title}</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                {!isPaid ? (
                  <div className="rounded-2xl border border-amber-200/15 bg-amber-100/5 px-4 py-3 text-xs leading-6 text-amber-100">
                    {copy.modal.freeBanner}
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-sm text-stone-400">
                    {copy.modal.productName}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={copy.modal.productNamePlaceholder}
                    className="w-full rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-stone-400">
                    {copy.modal.websiteUrl}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      placeholder={copy.modal.websiteUrlPlaceholder}
                      className="flex-1 rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                    />
                    <button
                      type="button"
                      onClick={handleAutofillFromUrl}
                      disabled={previewLoading}
                      className="shrink-0 rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {previewLoading ? copy.modal.detecting : copy.modal.detect}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">{copy.modal.detectHint}</p>
                  {previewError ? (
                    <p className="mt-2 text-xs text-red-300">{previewError}</p>
                  ) : null}
                  {preview ? (
                    <div className="mt-3 rounded-2xl border border-[var(--line-soft)] bg-black/20 p-3 text-xs">
                      <p className="font-medium text-stone-200">
                        {copy.detectedLabel} {preview.hostname}
                      </p>
                      <p className="mt-1 text-stone-500">
                        {copy.modal.nameSource}: {preview.detectedFrom.name} ·{" "}
                        {copy.modal.descriptionSource}: {preview.detectedFrom.description}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-stone-400">
                    {copy.modal.description}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder={copy.modal.descriptionPlaceholder}
                    className="w-full resize-none rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                  />
                </div>

                {saveError ? <p className="text-xs text-red-300">{saveError}</p> : null}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddProduct}
                    className="flex-1 rounded-full border border-[var(--line-soft)] bg-white/[0.04] py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {copy.modal.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-[var(--accent-500)] py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                  >
                    {saving ? copy.modal.saving : copy.modal.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <section
          id="launch-board"
          className="mt-12 grid gap-8 xl:grid-cols-[1.12fr_0.88fr]"
        >
          <div>
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.board.eyebrow}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {copy.board.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-400">
                {copy.board.body}
              </p>
              {workspaceActionError && !(isCheckoutSuccess || isCheckoutCancelled) ? (
                <p className="mt-4 text-sm text-red-300">{workspaceActionError}</p>
              ) : null}
            </div>

            {products.length === 0 ? (
              <div className="mt-8 rounded-[2rem] border border-[var(--line-soft)] bg-white/[0.04] p-10">
                <div className="mb-4 text-4xl">🧭</div>
                <h3 className="text-lg font-semibold text-white">
                  {copy.onboarding.title}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
                  {copy.onboarding.body}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={openAddProduct}
                    className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.onboarding.primary}
                  </button>
                  <Link
                    href="/pricing"
                    className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {copy.onboarding.secondary}
                  </Link>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {copy.onboarding.steps.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-4"
                    >
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                      <p className="mt-2 text-xs leading-6 text-stone-400">
                        {item.copy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {productSummaries.map((summary) => {
                  const latestChannel = summary.latestSubmission
                    ? CHANNELS.find(
                        (channel) => channel.id === summary.latestSubmission?.channel
                      ) || null
                    : null;
                  const recommendedChannelName = summary.recommendedChannel
                    ? getLocalizedChannel(summary.recommendedChannel, locale).name
                    : null;
                  const progress = summary.activeSubmission
                    ? summary.activeSubmission.total_sites > 0
                      ? Math.round(
                          (summary.activeSubmission.completed_sites /
                            summary.activeSubmission.total_sites) *
                            100
                        )
                      : 0
                    : 0;
                  const launchAction = isLaunchAction(summary.primaryAction)
                    ? summary.primaryAction
                    : null;
                  const linkAction = isLinkAction(summary.primaryAction)
                    ? summary.primaryAction
                    : null;

                  return (
                    <article
                      key={summary.product.id}
                      className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6 transition hover:border-[var(--line-strong)] hover:bg-white/[0.055]"
                    >
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${launchStageClasses(
                                summary.stage
                              )}`}
                            >
                              {copy.productCard.stage[summary.stage]}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${productStatusClasses(
                                summary.product.status
                              )}`}
                            >
                              {productStatusLabel(summary.product.status, locale)}
                            </span>
                            {latestChannel ? (
                              <span className="text-xs text-stone-500">
                                {copy.productCard.latestLane}:{" "}
                                {getLocalizedChannel(latestChannel, locale).name}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-4 text-2xl font-semibold text-white">
                            {summary.product.name}
                          </h3>
                          <a
                            href={summary.product.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-sm text-amber-200 transition hover:text-amber-100"
                          >
                            {summary.product.url}
                          </a>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
                            {summary.product.description}
                          </p>
                          <p className="mt-4 text-sm leading-7 text-stone-300">
                            <span className="mr-2 text-xs uppercase tracking-[0.24em] text-stone-500">
                              {copy.productCard.nextStep}
                            </span>
                            {summary.nextStep}
                          </p>
                          <p className="mt-3 text-sm text-stone-500">
                            {copy.productCard.stageBody[summary.stage]}
                          </p>

                          {summary.activeSubmission ? (
                            <div className="mt-5">
                              <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
                                <span>
                                  {copy.productCard.progress}{" "}
                                  {summary.activeSubmission.completed_sites}/
                                  {summary.activeSubmission.total_sites}
                                </span>
                                <span>{progress}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-stone-800">
                                <div
                                  className="h-2 rounded-full bg-sky-300 transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="w-full max-w-sm">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {copy.productCard.launchCount}
                              </div>
                              <div className="mt-2 text-2xl font-semibold text-white">
                                {summary.launchCount}
                              </div>
                            </div>
                            <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {copy.productCard.successfulActions}
                              </div>
                              <div className="mt-2 text-2xl font-semibold text-white">
                                {summary.totalSuccessfulActions}
                              </div>
                            </div>
                            <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {copy.productCard.channelsReady}
                              </div>
                              <div className="mt-2 text-2xl font-semibold text-white">
                                {liveChannelsForPlan.length}/{LIVE_CHANNEL_COUNT}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4 text-sm leading-7 text-stone-300">
                            <div className="text-xs uppercase tracking-[0.22em] text-stone-500">
                              {summary.latestSubmission
                                ? copy.productCard.latestRun
                                : copy.productCard.recommendationPrefix}
                            </div>
                            <div className="mt-2">
                              {summary.latestSubmission ? (
                                <>
                                  {latestChannel
                                    ? getLocalizedChannel(latestChannel, locale).name
                                    : summary.latestSubmission.channel}{" "}
                                  ·{" "}
                                  {formatDashboardDate(
                                    summary.latestSubmission.created_at,
                                    locale
                                  )}
                                </>
                              ) : recommendedChannelName ? (
                                recommendedChannelName
                              ) : (
                                copy.productCard.noRunsYet
                              )}
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            {launchAction ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleWorkspaceLaunch(
                                    summary.product.id,
                                    launchAction.channelId
                                  )
                                }
                                disabled={
                                  launchingKey ===
                                  `${summary.product.id}:${launchAction.channelId}`
                                }
                                className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                              >
                                {launchingKey ===
                                `${summary.product.id}:${launchAction.channelId}`
                                  ? copy.productCard.starting
                                  : launchAction.label}
                              </button>
                            ) : linkAction?.href.startsWith("/api/") ? (
                              <a
                                href={linkAction.href}
                                className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                              >
                                {linkAction.label}
                              </a>
                            ) : (
                              <Link
                                href={linkAction?.href || `/dashboard/product/${summary.product.id}`}
                                className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                              >
                                {linkAction?.label || copy.productCard.open}
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/product/${summary.product.id}`}
                              className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                            >
                              {copy.productCard.open}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.lanes.liveTitle}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">
                {copy.lanes.liveTitle}
              </h3>
              <p className="mt-2 text-sm leading-7 text-stone-400">
                {copy.lanes.liveBody}
              </p>

              <div className="mt-5 space-y-3">
                {liveChannels.map((channel) => {
                  const localizedChannel = getLocalizedChannel(channel, locale);
                  const available = isPaid && channel.plans.includes(currentPlan);
                  const minimumPlan = minimumPlanForChannel(channel);

                  return (
                    <div
                      key={channel.id}
                      className="flex items-start justify-between gap-4 rounded-[1.15rem] border border-[var(--line-soft)] bg-black/15 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {channel.icon} {localizedChannel.name}
                        </div>
                        <div className="mt-1 text-xs leading-6 text-stone-500">
                          {available
                            ? copy.lanes.availableNow
                            : `${copy.lanes.requires} ${formatPlanName(
                                minimumPlan,
                                locale
                              )}`}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                          available
                            ? "bg-emerald-300/10 text-emerald-200"
                            : "bg-white/6 text-stone-300"
                        }`}
                      >
                        {available ? copy.lanes.included : copy.lanes.locked}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.lanes.roadmapTitle}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">
                {copy.lanes.roadmapTitle}
              </h3>
              <p className="mt-2 text-sm leading-7 text-stone-400">
                {copy.lanes.roadmapBody}
              </p>

              <div className="mt-5 space-y-3">
                {roadmapChannels.map((channel) => {
                  const localizedChannel = getLocalizedChannel(channel, locale);
                  const includedWhenLive = isPaid && channel.plans.includes(currentPlan);
                  const minimumPlan = minimumPlanForChannel(channel);

                  return (
                    <div
                      key={channel.id}
                      className="flex items-start justify-between gap-4 rounded-[1.15rem] border border-[var(--line-soft)] bg-black/15 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {channel.icon} {localizedChannel.name}
                        </div>
                        <div className="mt-1 text-xs leading-6 text-stone-500">
                          {includedWhenLive
                            ? copy.lanes.whenRolledOut
                            : `${copy.lanes.requires} ${formatPlanName(
                                minimumPlan,
                                locale
                              )}`}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                          includedWhenLive
                            ? "bg-emerald-300/10 text-emerald-200"
                            : "bg-white/6 text-stone-300"
                        }`}
                      >
                        {includedWhenLive ? copy.lanes.included : copy.lanes.locked}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {products.length === 0 && !canAddProduct ? (
              <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                <h3 className="text-xl font-semibold text-white">
                  {copy.emptyState.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-400">
                  {copy.emptyState.body}
                </p>
                <button
                  onClick={openAddProduct}
                  className="mt-5 rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                >
                  {copy.emptyState.cta}
                </button>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
