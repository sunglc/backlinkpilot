"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import LocaleToggle from "@/components/locale-toggle";
import {
  CHANNELS,
  LIVE_CHANNEL_COUNT,
  TOTAL_CHANNEL_COUNT,
  type ChannelContract,
} from "@/lib/execution-contract";
import type { Locale } from "@/lib/locale-config";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface SiteResult {
  site: string;
  success: boolean;
  output: string;
}

interface Submission {
  id: string;
  channel: string;
  status: string;
  total_sites: number;
  completed_sites: number;
  success_sites: number;
  results: SiteResult[];
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  url: string;
  description: string;
  status: string;
}

interface HighQualityOutreachSource {
  source_id: string;
  root_domain: string;
  fit_score: number;
  article_title: string;
  source_type: string;
  reuse_segment: string;
  article_url: string;
}

interface HighQualityOutreachLibrary {
  root_domain_count: number;
  source_count: number;
  sources: HighQualityOutreachSource[];
}

interface OperationalInsights {
  reply_action_count: number;
  host_public_verified_count: number;
  today_action_count: number;
  today_action_root_domain_count: number;
  today_quality_result_count: number;
  source_library_root_domain_count: number;
}

const PLAN_ORDER = ["free", "starter", "growth", "scale"] as const;

function getProductDetailCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      nav: {
        dashboard: "工作台",
        execution: "产品执行页",
      },
      hero: {
        eyebrow: "产品执行页",
        freeTitle: "产品已经配置好了，下一步是解锁真实提交。",
        freeBody:
          "你已经完成了产品档案。升级后，目录和 stealth 两条已上线渠道可以直接从这份档案开始执行。",
        readyTitle: "这个产品已经准备好进入真实执行。",
        readyBody:
          "产品信息、计划权限和已上线渠道都已经就绪。你现在可以直接启动首轮提交，而不是再去填更多后台字段。",
        activeTitle: "有一条执行任务已经在跑。",
        activeBody:
          "详情页会自动刷新进度。你可以继续观察结果，也可以在下面的渠道区启动其他可用路线。",
        startRecommended: "启动推荐渠道",
        startChannel: "启动",
        viewHistory: "查看执行历史",
        unlockStarter: "解锁入门版",
        unlockGrowth: "解锁增长版",
        stats: {
          plan: "当前计划",
          status: "产品状态",
          liveChannels: "已解锁渠道",
          successful: "成功动作数",
        },
      },
      status: {
        free: "免费版",
        starter: "入门版",
        growth: "增长版",
        scale: "规模版",
        active: "执行中",
        completed: "就绪",
        pending: "排队中",
        draft: "草稿",
        queued: "排队中",
        running: "运行中",
        failed: "失败",
      },
      channels: {
        title: "执行渠道",
        body: `当前共有 ${LIVE_CHANNEL_COUNT} 个已上线渠道，${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} 个推进中渠道。这里最重要的是先把可跑的路线真正跑起来。`,
        liveEyebrow: "今天可执行",
        liveTitle: "先把已经能跑的路线真正跑起来。",
        roadmapEyebrow: "后续路线",
        roadmapTitle: "下一批会解锁的分发路线。",
        included: "已包含",
        requires: "需要计划",
        includedWhenLive: "已在你的计划内，等 rollout 落地后可运行。",
        rolloutOnly: "这条路线还在受控 rollout 中，暂时不能由用户直接执行。",
        notRunnable: "暂时不可直接执行",
        upgradeToUnlock: "升级后解锁",
        startSubmission: "开始提交",
        starting: "启动中...",
        queued: "已进入队列",
        runningPrefix: "执行中",
        ready: "已上线",
        planned: "推进中",
      },
      history: {
        title: "执行历史",
        body:
          "这里记录的是提交与外联动作本身。动作成功或 run 完成，并不等于公开可见的外链已经最终生效。",
        warning:
          "公开验证和编辑审核通常发生在动作发出之后。这里看的是执行进度，不是最终上线链接数。",
        empty: "还没有执行记录。先从上面的渠道里启动第一条路线。",
        successActions: "成功动作",
        progress: "执行中",
        pending: "等待中...",
        waitingWorker: "等待 worker 接手这个任务...",
      },
      recap: {
        title: "Launch 回顾",
        body: "这一块先把最近一轮执行翻译成正常人能看懂的结论，再告诉你下一步最合理的动作。",
        prelaunchEyebrow: "首轮启动前",
        prelaunchTitle: "还没有真实提交，先跑第一条 live 渠道。",
        prelaunchBody:
          "产品档案已经在位。先启动推荐渠道，让这个产品正式进入真实分发。",
        activeEyebrow: "正在执行",
        activeTitle: "当前任务还在处理中。",
        activeBody:
          "worker 正在跑这条渠道。等这轮结束后，这里会自动切成结果摘要和下一步建议。",
        completedEyebrow: "最新结果",
        completedTitle: "最近一轮已经跑完了。",
        completedBody:
          "先看这轮跑出来了多少有效动作，再决定是否继续扩展下一条渠道。",
        failedEyebrow: "最新结果",
        failedTitle: "最近一轮没有顺利完成。",
        failedBody:
          "先复盘这条渠道的结果，再决定是重跑同一条路线，还是切到下一条 live 渠道。",
        nextMoveTitle: "下一步建议",
        nextMoveUnlockTitle: "先解锁真实渠道",
        nextMoveUnlockBody:
          "你已经完成了配置。升级后，目录和 stealth 两条 live 渠道会直接用这份产品档案开始执行。",
        nextMoveWatchTitle: "先盯住当前这轮进度",
        nextMoveWatchBody:
          "现在最有价值的不是再点更多按钮，而是等这轮跑完，再基于结果做下一步判断。",
        nextMoveLaunchTitle: "启动下一条推荐渠道",
        nextMoveLaunchBody:
          "这条渠道是当前最值得先跑的下一步，可以把分发继续往外扩。",
        nextMoveReviewTitle: "先复盘结果，再决定要不要扩展",
        nextMoveReviewBody:
          "当前 live 渠道已经有结果可看，先看执行历史和站点结果，再决定是重跑还是加新产品。",
        attemptedSites: "尝试站点",
        successfulActions: "成功动作",
        conversionRate: "动作成功率",
        latestLane: "最近渠道",
        nextLane: "推荐下一条",
        seenSignals: "已看到的站点信号",
        noSignals:
          "当前还没有足够的成功站点样本。随着执行继续推进，这里会开始出现更具体的结果信号。",
        openHistory: "查看执行历史",
        openDashboard: "回到工作台",
        launchNext: "启动推荐渠道",
        retryLane: "重跑这一条渠道",
      },
      intelligence: {
        title: "执行智能",
        body:
          "这些不是展示用的数据，而是系统已经在真实执行中学到的可复用情报。它们应该帮助你判断下一步的分发策略。",
        sourcesTitle: "可复用的高质量外联源",
        sourcesBody:
          "执行引擎已经发现并同步过来的优质编辑/资源页目标，可以为后续产品复用。",
        rootDomains: "根域名",
        reusableSources: "可复用来源",
        fit: "匹配度",
        openSource: "打开来源",
        insightsTitle: "真实运行洞察",
        insightsBody:
          "这些指标来自真实回复、审核和验证信号，避免产品侧决策只凭想象推进。",
        replyActions: "回复动作",
        publicVerified: "公开验证",
        todayActions: "今日动作",
        todayRootDomains: "今日根域名",
        qualityResultsToday: "今日高质量结果",
        reusableToday: "可复用来源",
      },
      errors: {
        startFailed: "暂时无法创建这个提交任务。",
      },
      formatting: {
        successfulActions: "成功动作",
      },
    };
  }

  return {
    nav: {
      dashboard: "Dashboard",
      execution: "Product execution",
    },
    hero: {
      eyebrow: "Product execution",
      freeTitle: "Your product is configured. The next step is unlocking live submissions.",
      freeBody:
        "The product profile is already in place. Upgrade and the live directory and stealth lanes can execute directly from this saved profile.",
      readyTitle: "This product is ready for live execution.",
      readyBody:
        "The profile, plan access, and live channels are all ready. You can start a real submission run now instead of filling more backend forms.",
      activeTitle: "A submission run is already in progress.",
      activeBody:
        "This page auto-refreshes while the run is active. You can watch progress here or start another available lane below.",
      startRecommended: "Start Recommended Lane",
      startChannel: "Start",
      viewHistory: "View Submission History",
      unlockStarter: "Unlock Starter",
      unlockGrowth: "Unlock Growth",
      stats: {
        plan: "Current plan",
        status: "Product status",
        liveChannels: "Live lanes unlocked",
        successful: "Successful actions",
      },
    },
    status: {
      free: "Free",
      starter: "Starter",
      growth: "Growth",
      scale: "Scale",
      active: "Active",
      completed: "Ready",
      pending: "Queued",
      draft: "Draft",
      queued: "Queued",
      running: "Running",
      failed: "Failed",
    },
    channels: {
      title: "Execution lanes",
      body: `There are ${LIVE_CHANNEL_COUNT} live lanes today and ${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} lanes still rolling out. The main job here is to get the runnable lanes moving.`,
      liveEyebrow: "Live now",
      liveTitle: "Launch the lanes that already work.",
      roadmapEyebrow: "Roadmap",
      roadmapTitle: "What unlocks after the live lanes.",
      included: "Included",
      requires: "Requires",
      includedWhenLive:
        "This lane is already included in your plan and becomes runnable when rollout lands.",
      rolloutOnly:
        "This lane is still in controlled rollout and is not customer-runnable yet.",
      notRunnable: "Not customer-runnable yet",
      upgradeToUnlock: "Upgrade to unlock",
      startSubmission: "Start Submission",
      starting: "Starting...",
      queued: "Queued",
      runningPrefix: "Running",
      ready: "Live",
      planned: "Planned",
    },
    history: {
      title: "Submission history",
      body:
        "This tracks outreach and submission actions. A successful send or completed run does not automatically mean the backlink is publicly live yet.",
      warning:
        "Public verification and editorial approval usually happen after the action is sent. Treat this as operational progress, not confirmed live-link count.",
      empty: "No submissions yet. Start your first lane above.",
      successActions: "Successful actions",
      progress: "Submitting",
      pending: "Pending...",
      waitingWorker: "Waiting for worker to pick up this job...",
    },
    recap: {
      title: "Launch recap",
      body:
        "This section translates the latest run into normal product language first, then tells the user what the next sensible move is.",
      prelaunchEyebrow: "Before first launch",
      prelaunchTitle: "No live run yet. Start the first live lane.",
      prelaunchBody:
        "The product profile is already staged. Launch the recommended lane first so this product enters real distribution.",
      activeEyebrow: "Currently running",
      activeTitle: "The current run is still in progress.",
      activeBody:
        "The worker is still processing this lane. When it finishes, this area should turn into a result recap and next-step recommendation automatically.",
      completedEyebrow: "Latest result",
      completedTitle: "The latest run has finished.",
      completedBody:
        "First look at how many useful actions this lane produced, then decide whether to expand into the next lane.",
      failedEyebrow: "Latest result",
      failedTitle: "The latest run did not finish cleanly.",
      failedBody:
        "Review this lane first, then decide whether to retry the same route or switch to the next live lane.",
      nextMoveTitle: "Recommended next move",
      nextMoveUnlockTitle: "Unlock live lanes first",
      nextMoveUnlockBody:
        "You already did the setup work. Upgrade and Directory Submission plus Stealth can execute directly from this profile.",
      nextMoveWatchTitle: "Watch this run finish first",
      nextMoveWatchBody:
        "The valuable move right now is not clicking more buttons. Let this run finish, then act on the result.",
      nextMoveLaunchTitle: "Launch the recommended next lane",
      nextMoveLaunchBody:
        "This is the best next lane to expand distribution while the current product context is still fresh.",
      nextMoveReviewTitle: "Review the outcome before expanding",
      nextMoveReviewBody:
        "You already have something to learn from the live lanes. Review the result history first, then decide whether to relaunch or add another product.",
      attemptedSites: "Attempted sites",
      successfulActions: "Successful actions",
      conversionRate: "Action success rate",
      latestLane: "Latest lane",
      nextLane: "Recommended next lane",
      seenSignals: "Visible site signals",
      noSignals:
        "There are not enough successful site samples yet. As execution accumulates, more concrete result signals will appear here.",
      openHistory: "View Submission History",
      openDashboard: "Back to Dashboard",
      launchNext: "Launch Recommended Lane",
      retryLane: "Retry This Lane",
    },
    intelligence: {
      title: "Execution intelligence",
      body:
        "This is not vanity data. It is reusable signal the system has already learned from real runs, and it should shape the next distribution decision.",
      sourcesTitle: "Reusable high-quality outreach sources",
      sourcesBody:
        "Proven editorial and resource-page targets discovered by the execution engine and synced here for future products.",
      rootDomains: "Root domains",
      reusableSources: "Reusable sources",
      fit: "Fit",
      openSource: "Open source",
      insightsTitle: "Operational insights",
      insightsBody:
        "These numbers are synced from real reply, review, and verification signals so product-side decisions stay grounded in reality.",
      replyActions: "Reply actions",
      publicVerified: "Public verified",
      todayActions: "Today actions",
      todayRootDomains: "Today root domains",
      qualityResultsToday: "Quality results today",
      reusableToday: "Reusable sources",
    },
    errors: {
      startFailed: "Could not create that submission.",
    },
    formatting: {
      successfulActions: "successful actions",
    },
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

function localizedPlanName(plan: string, locale: Locale) {
  const mapping =
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

  return mapping[plan as keyof typeof mapping] || plan;
}

function localizedProductStatus(status: string, locale: Locale) {
  const mapping =
    locale === "zh"
      ? {
          active: "执行中",
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

  return mapping[status as keyof typeof mapping] || status;
}

function localizedSubmissionStatus(status: string, locale: Locale) {
  const mapping =
    locale === "zh"
      ? {
          queued: "排队中",
          running: "运行中",
          completed: "已完成",
          failed: "失败",
        }
      : {
          queued: "Queued",
          running: "Running",
          completed: "Completed",
          failed: "Failed",
        };

  return mapping[status as keyof typeof mapping] || status;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    queued: "bg-amber-300/10 text-amber-200",
    running: "bg-sky-300/10 text-sky-200",
    completed: "bg-emerald-300/10 text-emerald-200",
    failed: "bg-red-300/10 text-red-200",
    active: "bg-emerald-300/10 text-emerald-200",
    draft: "bg-stone-800 text-stone-300",
  };

  return styles[status] || "bg-stone-800 text-stone-300";
}

function supportBadge(status: ChannelContract["support_status"], locale: Locale) {
  if (status === "live") {
    return (
      <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-200">
        {locale === "zh" ? "已上线" : "Live"}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-stone-400">
      {locale === "zh" ? "推进中" : "Planned"}
    </span>
  );
}

function minimumPlanForChannel(channel: ChannelContract) {
  return (
    [...channel.plans].sort(
      (a, b) => PLAN_ORDER.indexOf(a as (typeof PLAN_ORDER)[number]) - PLAN_ORDER.indexOf(b as (typeof PLAN_ORDER)[number])
    )[0] || "starter"
  );
}

function checkoutHref(plan: string) {
  return `/api/stripe/checkout?plan=${plan}`;
}

function formatSubmissionDate(date: string, locale: Locale) {
  return new Date(date).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

export default function ProductDetail({
  locale,
  user,
  product,
  submissions,
  plan,
  outreachLibrary,
  operationalInsights,
}: {
  locale: Locale;
  user: User;
  product: Product;
  submissions: Submission[];
  plan: string;
  outreachLibrary: HighQualityOutreachLibrary;
  operationalInsights: OperationalInsights;
}) {
  const copy = getProductDetailCopy(locale);
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const sourcePreview = outreachLibrary.sources.slice(0, 6);

  const hasActive = submissions.some(
    (submission) => submission.status === "queued" || submission.status === "running"
  );

  useEffect(() => {
    if (!hasActive) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [hasActive, router]);

  async function startSubmission(channelId: string) {
    setSubmitting(channelId);
    setActionError("");

    const supabase = createClient();
    const { error } = await supabase.from("submissions").insert({
      user_id: user.id,
      product_id: product.id,
      channel: channelId,
      status: "queued",
    });

    if (error) {
      setActionError(error.message || copy.errors.startFailed);
      setSubmitting(null);
      return;
    }

    setSubmitting(null);
    router.refresh();
  }

  const liveChannels = CHANNELS.filter((channel) => channel.support_status === "live");
  const plannedChannels = CHANNELS.filter((channel) => channel.support_status !== "live");
  const availableLiveChannels = liveChannels.filter((channel) => channel.plans.includes(plan));
  const usedLiveChannelIds = new Set(
    submissions
      .filter((submission) =>
        liveChannels.some((channel) => channel.id === submission.channel)
      )
      .map((submission) => submission.channel)
  );
  const primaryLiveChannel = availableLiveChannels[0];
  const secondaryLiveChannel = availableLiveChannels[1];
  const nextUnusedLiveChannel =
    availableLiveChannels.find((channel) => !usedLiveChannelIds.has(channel.id)) || null;
  const recommendedNextLiveChannel =
    submissions.length === 0 ? primaryLiveChannel || null : nextUnusedLiveChannel;
  const totalSuccessfulActions = submissions.reduce(
    (sum, submission) => sum + submission.success_sites,
    0
  );
  const latestSubmission = submissions[0] || null;
  const activeSubmission = submissions.find(
    (submission) => submission.status === "queued" || submission.status === "running"
  );
  const latestResolvedSubmission =
    submissions.find(
      (submission) =>
        submission.status === "completed" || submission.status === "failed"
    ) || null;
  const recapSubmission = activeSubmission || latestResolvedSubmission || latestSubmission;
  const recapChannel = recapSubmission
    ? CHANNELS.find((channel) => channel.id === recapSubmission.channel) || null
    : null;
  const recapProgress =
    activeSubmission && activeSubmission.total_sites > 0
      ? (activeSubmission.completed_sites / activeSubmission.total_sites) * 100
      : 0;
  const recapSuccessRate =
    latestResolvedSubmission && latestResolvedSubmission.total_sites > 0
      ? (latestResolvedSubmission.success_sites / latestResolvedSubmission.total_sites) * 100
      : 0;
  const visibleSuccessfulSites =
    latestResolvedSubmission?.results.filter((result) => result.success).slice(0, 5) || [];

  let recapEyebrow = copy.recap.prelaunchEyebrow;
  let recapTitle = copy.recap.prelaunchTitle;
  let recapBody = copy.recap.prelaunchBody;
  let nextMoveTitle = copy.recap.nextMoveUnlockTitle;
  let nextMoveBody = copy.recap.nextMoveUnlockBody;

  let heroTitle = copy.hero.readyTitle;
  let heroBody = copy.hero.readyBody;

  if (plan === "free") {
    heroTitle = copy.hero.freeTitle;
    heroBody = copy.hero.freeBody;
  } else if (activeSubmission) {
    heroTitle = copy.hero.activeTitle;
    heroBody = copy.hero.activeBody;
  }

  if (plan === "free") {
    recapEyebrow = copy.recap.prelaunchEyebrow;
    recapTitle = copy.recap.prelaunchTitle;
    recapBody = copy.recap.prelaunchBody;
    nextMoveTitle = copy.recap.nextMoveUnlockTitle;
    nextMoveBody = copy.recap.nextMoveUnlockBody;
  } else if (activeSubmission) {
    recapEyebrow = copy.recap.activeEyebrow;
    recapTitle = copy.recap.activeTitle;
    recapBody = copy.recap.activeBody;
    nextMoveTitle = copy.recap.nextMoveWatchTitle;
    nextMoveBody = copy.recap.nextMoveWatchBody;
  } else if (!latestResolvedSubmission) {
    recapEyebrow = copy.recap.prelaunchEyebrow;
    recapTitle = copy.recap.prelaunchTitle;
    recapBody = copy.recap.prelaunchBody;
    nextMoveTitle = copy.recap.nextMoveLaunchTitle;
    nextMoveBody = copy.recap.nextMoveLaunchBody;
  } else if (latestResolvedSubmission.status === "failed") {
    recapEyebrow = copy.recap.failedEyebrow;
    recapTitle = copy.recap.failedTitle;
    recapBody = copy.recap.failedBody;
    nextMoveTitle = recommendedNextLiveChannel
      ? copy.recap.nextMoveLaunchTitle
      : copy.recap.nextMoveReviewTitle;
    nextMoveBody = recommendedNextLiveChannel
      ? copy.recap.nextMoveLaunchBody
      : copy.recap.nextMoveReviewBody;
  } else {
    recapEyebrow = copy.recap.completedEyebrow;
    recapTitle = copy.recap.completedTitle;
    recapBody = copy.recap.completedBody;
    nextMoveTitle = recommendedNextLiveChannel
      ? copy.recap.nextMoveLaunchTitle
      : copy.recap.nextMoveReviewTitle;
    nextMoveBody = recommendedNextLiveChannel
      ? copy.recap.nextMoveLaunchBody
      : copy.recap.nextMoveReviewBody;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="bp-grid absolute inset-0 opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.14),transparent_58%)]" />
      <div className="absolute -left-12 top-56 h-64 w-64 rounded-full bg-amber-300/8 blur-3xl" />
      <div className="absolute -right-16 top-28 h-72 w-72 rounded-full bg-emerald-300/8 blur-3xl" />

      <nav className="relative border-b border-[var(--line-soft)] bg-black/10 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium uppercase tracking-[0.28em] text-stone-300"
          >
            BacklinkPilot
          </Link>
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} />
            <span className="hidden text-sm text-stone-400 md:inline">{user.email}</span>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
          <Link href="/dashboard" className="transition hover:text-white">
            {copy.nav.dashboard}
          </Link>
          <span>/</span>
          <span className="text-stone-300">{product.name}</span>
        </div>

        <section className="rounded-[2rem] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur md:p-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-amber-200/80">
                {copy.hero.eyebrow}
              </p>
              <h1 className="font-display mt-4 text-4xl leading-[0.95] text-stone-50 md:text-6xl">
                {product.name}
              </h1>
              <a
                href={product.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm text-amber-200 transition hover:text-amber-100"
              >
                {product.url}
              </a>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300">
                {product.description}
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-[var(--line-soft)] bg-black/15 p-5">
                <h2 className="text-xl font-semibold text-stone-50">{heroTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400 md:text-base">
                  {heroBody}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {plan === "free" ? (
                    <>
                      <a
                        href={checkoutHref("starter")}
                        className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {copy.hero.unlockStarter}
                      </a>
                      <a
                        href={checkoutHref("growth")}
                        className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                      >
                        {copy.hero.unlockGrowth}
                      </a>
                    </>
                  ) : activeSubmission ? (
                    <a
                      href="#submission-history"
                      className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                    >
                      {copy.hero.viewHistory}
                    </a>
                  ) : (
                    <>
                      {primaryLiveChannel ? (
                        <button
                          type="button"
                          onClick={() => startSubmission(primaryLiveChannel.id)}
                          disabled={submitting === primaryLiveChannel.id}
                          className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                        >
                          {submitting === primaryLiveChannel.id
                            ? copy.channels.starting
                            : `${copy.hero.startRecommended}: ${
                                getLocalizedChannel(primaryLiveChannel, locale).name
                              }`}
                        </button>
                      ) : null}
                      {secondaryLiveChannel ? (
                        <button
                          type="button"
                          onClick={() => startSubmission(secondaryLiveChannel.id)}
                          disabled={submitting === secondaryLiveChannel.id}
                          className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6 disabled:opacity-60"
                        >
                          {submitting === secondaryLiveChannel.id
                            ? copy.channels.starting
                            : `${copy.hero.startChannel}: ${
                                getLocalizedChannel(secondaryLiveChannel, locale).name
                              }`}
                        </button>
                      ) : (
                        <a
                          href="#submission-history"
                          className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                        >
                          {copy.hero.viewHistory}
                        </a>
                      )}
                    </>
                  )}
                </div>

                {actionError ? (
                  <p className="mt-4 text-sm text-red-300">{actionError}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: copy.hero.stats.plan,
                  value: localizedPlanName(plan, locale),
                  tone: "text-amber-100",
                },
                {
                  label: copy.hero.stats.status,
                  value: localizedProductStatus(product.status, locale),
                  tone: "text-stone-50",
                },
                {
                  label: copy.hero.stats.liveChannels,
                  value: `${availableLiveChannels.length}/${LIVE_CHANNEL_COUNT}`,
                  tone: "text-emerald-200",
                },
                {
                  label: copy.hero.stats.successful,
                  value: `${totalSuccessfulActions}`,
                  tone: "text-sky-200",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-[var(--line-soft)] bg-black/15 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    {item.label}
                  </p>
                  <p className={`mt-3 text-3xl font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}

              {activeSubmission ? (
                <div className="rounded-[1.5rem] border border-sky-300/15 bg-sky-300/5 p-5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-sky-200">
                        {localizedSubmissionStatus(activeSubmission.status, locale)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-50">
                        {getLocalizedChannel(
                          CHANNELS.find((channel) => channel.id === activeSubmission.channel) ||
                            CHANNELS[0],
                          locale
                        ).name}
                      </p>
                    </div>
                    {activeSubmission.total_sites > 0 ? (
                      <div className="text-right">
                        <p className="text-lg font-semibold text-stone-50">
                          {activeSubmission.completed_sites}/{activeSubmission.total_sites}
                        </p>
                        <p className="text-xs text-stone-500">
                          {copy.history.successActions}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  {activeSubmission.total_sites > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
                        <span>
                          {copy.channels.runningPrefix}{" "}
                          {activeSubmission.completed_sites}/{activeSubmission.total_sites}
                        </span>
                        <span>
                          {Math.round(
                            (activeSubmission.completed_sites / activeSubmission.total_sites) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-800">
                        <div
                          className="h-2 rounded-full bg-sky-300 transition-all duration-500"
                          style={{
                            width: `${
                              (activeSubmission.completed_sites / activeSubmission.total_sites) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {recapEyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.recap.title}
            </h2>
            <h3 className="mt-4 text-xl font-semibold text-white">{recapTitle}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400 md:text-base">
              {recapBody}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                  {copy.recap.latestLane}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {recapChannel ? getLocalizedChannel(recapChannel, locale).name : "—"}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                  {copy.recap.attemptedSites}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {recapSubmission?.total_sites ?? 0}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                  {activeSubmission
                    ? copy.history.progress
                    : copy.recap.conversionRate}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {activeSubmission
                    ? formatPercent(recapProgress)
                    : formatPercent(recapSuccessRate)}
                </div>
              </div>
            </div>

            {latestResolvedSubmission ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.recap.successfulActions}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {latestResolvedSubmission.success_sites}
                  </div>
                  <div className="mt-2 text-xs text-stone-500">
                    {formatSubmissionDate(latestResolvedSubmission.created_at, locale)}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.recap.nextLane}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {recommendedNextLiveChannel
                      ? getLocalizedChannel(recommendedNextLiveChannel, locale).name
                      : "—"}
                  </div>
                  <div className="mt-2 text-xs text-stone-500">
                    {recommendedNextLiveChannel
                      ? getLocalizedChannel(recommendedNextLiveChannel, locale).desc
                      : copy.recap.nextMoveReviewBody}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.recap.seenSignals}
              </div>
              {visibleSuccessfulSites.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleSuccessfulSites.map((result, index) => (
                    <span
                      key={`${result.site}-${index}`}
                      className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200"
                      title={result.output}
                    >
                      {result.site}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-stone-400">
                  {copy.recap.noSignals}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.recap.nextMoveTitle}
            </p>
            <h3 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {nextMoveTitle}
            </h3>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {nextMoveBody}
            </p>

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.recap.nextLane}
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {recommendedNextLiveChannel
                  ? getLocalizedChannel(recommendedNextLiveChannel, locale).name
                  : recapChannel
                    ? getLocalizedChannel(recapChannel, locale).name
                    : "—"}
              </div>
              <p className="mt-2 text-sm leading-7 text-stone-400">
                {recommendedNextLiveChannel
                  ? getLocalizedChannel(recommendedNextLiveChannel, locale).desc
                  : recapChannel
                    ? getLocalizedChannel(recapChannel, locale).desc
                    : nextMoveBody}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {plan === "free" ? (
                <>
                  <a
                    href={checkoutHref("starter")}
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.hero.unlockStarter}
                  </a>
                  <a
                    href={checkoutHref("growth")}
                    className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.hero.unlockGrowth}
                  </a>
                </>
              ) : activeSubmission ? (
                <>
                  <a
                    href="#submission-history"
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.recap.openHistory}
                  </a>
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.recap.openDashboard}
                  </Link>
                </>
              ) : latestResolvedSubmission?.status === "failed" ? (
                <>
                  <button
                    type="button"
                    onClick={() => startSubmission(latestResolvedSubmission.channel)}
                    disabled={submitting === latestResolvedSubmission.channel}
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                  >
                    {submitting === latestResolvedSubmission.channel
                      ? copy.channels.starting
                      : copy.recap.retryLane}
                  </button>
                  <a
                    href="#submission-history"
                    className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.recap.openHistory}
                  </a>
                </>
              ) : recommendedNextLiveChannel ? (
                <>
                  <button
                    type="button"
                    onClick={() => startSubmission(recommendedNextLiveChannel.id)}
                    disabled={submitting === recommendedNextLiveChannel.id}
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                  >
                    {submitting === recommendedNextLiveChannel.id
                      ? copy.channels.starting
                      : copy.recap.launchNext}
                  </button>
                  <a
                    href="#submission-history"
                    className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.recap.openHistory}
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="#submission-history"
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.recap.openHistory}
                  </a>
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                  >
                    {copy.recap.openDashboard}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.channels.liveEyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.channels.liveTitle}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {copy.channels.body}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {liveChannels.map((channel) => {
              const localizedChannel = getLocalizedChannel(channel, locale);
              const available = channel.plans.includes(plan);
              const activeForChannel = submissions.find(
                (submission) =>
                  submission.channel === channel.id &&
                  (submission.status === "queued" || submission.status === "running")
              );
              const minimumPlan = minimumPlanForChannel(channel);

              return (
                <div
                  key={channel.id}
                  className={`rounded-[1.75rem] border p-6 ${
                    available
                      ? "border-[var(--line-soft)] bg-white/[0.04]"
                      : "border-[var(--line-soft)] bg-black/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl">{channel.icon}</div>
                      <h3 className="mt-4 text-xl font-semibold text-stone-50">
                        {localizedChannel.name}
                      </h3>
                    </div>
                    {supportBadge(channel.support_status, locale)}
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-400">
                    {localizedChannel.desc}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-500">
                    <span className="rounded-full border border-[var(--line-soft)] px-3 py-1.5">
                      {copy.channels.requires}: {localizedPlanName(minimumPlan, locale)}
                    </span>
                    {available ? (
                      <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">
                        {copy.channels.included}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    {available ? (
                      activeForChannel ? (
                        <div className="rounded-[1.25rem] border border-sky-300/15 bg-sky-300/5 p-4">
                          <p className="text-sm font-medium text-sky-200">
                            {activeForChannel.status === "queued"
                              ? copy.channels.queued
                              : `${copy.channels.runningPrefix} ${activeForChannel.completed_sites}/${activeForChannel.total_sites}`}
                          </p>
                          {activeForChannel.total_sites > 0 ? (
                            <div className="mt-3 h-2 w-full rounded-full bg-stone-800">
                              <div
                                className="h-2 rounded-full bg-sky-300 transition-all duration-500"
                                style={{
                                  width: `${
                                    (activeForChannel.completed_sites / activeForChannel.total_sites) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startSubmission(channel.id)}
                          disabled={submitting === channel.id}
                          className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                        >
                          {submitting === channel.id
                            ? copy.channels.starting
                            : copy.channels.startSubmission}
                        </button>
                      )
                    ) : (
                      <a
                        href={checkoutHref(minimumPlan)}
                        className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
                      >
                        {copy.channels.upgradeToUnlock}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.channels.roadmapEyebrow}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {copy.channels.roadmapTitle}
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {plannedChannels.map((channel) => {
                const localizedChannel = getLocalizedChannel(channel, locale);
                const available = channel.plans.includes(plan);
                const minimumPlan = minimumPlanForChannel(channel);

                return (
                  <div
                    key={channel.id}
                    className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/10 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl">{channel.icon}</div>
                        <h3 className="mt-4 text-xl font-semibold text-stone-50">
                          {localizedChannel.name}
                        </h3>
                      </div>
                      {supportBadge(channel.support_status, locale)}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-stone-400">
                      {localizedChannel.desc}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-500">
                      <span className="rounded-full border border-[var(--line-soft)] px-3 py-1.5">
                        {copy.channels.requires}: {localizedPlanName(minimumPlan, locale)}
                      </span>
                      {available ? (
                        <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">
                          {copy.channels.included}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-stone-400">
                      {available ? copy.channels.includedWhenLive : copy.channels.rolloutOnly}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="submission-history" className="mt-12 scroll-mt-24">
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.history.title}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {copy.history.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-400">
                {copy.history.body}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-300/15 bg-amber-300/5 px-5 py-4 text-sm leading-7 text-amber-100">
              {copy.history.warning}
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="mt-8 rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-10 text-center">
              <p className="text-sm text-stone-400">{copy.history.empty}</p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {submissions.map((submission) => {
                const isActive =
                  submission.status === "running" || submission.status === "queued";
                const progress =
                  submission.total_sites > 0
                    ? Math.round(
                        (submission.completed_sites / submission.total_sites) * 100
                      )
                    : 0;
                const results = submission.results || [];
                const channel =
                  CHANNELS.find((item) => item.id === submission.channel) || CHANNELS[0];

                return (
                  <div
                    key={submission.id}
                    className="overflow-hidden rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-6 p-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-white">
                            {getLocalizedChannel(channel, locale).name}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                              submission.status
                            )}`}
                          >
                            {localizedSubmissionStatus(submission.status, locale)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-stone-500">
                          {formatSubmissionDate(submission.created_at, locale)}
                        </p>
                      </div>

                      {submission.total_sites > 0 ? (
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-stone-50">
                            {submission.success_sites}
                            <span className="text-sm text-stone-500">
                              /{submission.total_sites}
                            </span>
                          </p>
                          <p className="text-xs text-stone-500">
                            {copy.formatting.successfulActions}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {isActive && submission.total_sites > 0 ? (
                      <div className="px-6 pb-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
                          <span>
                            {copy.history.progress} {submission.completed_sites}/
                            {submission.total_sites}
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

                    {results.length > 0 ? (
                      <div className="border-t border-[var(--line-soft)] px-6 py-4">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                          {results.map((result, index) => (
                            <div
                              key={`${result.site}-${index}`}
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                                result.success
                                  ? "bg-emerald-300/5 text-emerald-200"
                                  : "bg-red-300/5 text-red-200"
                              }`}
                              title={result.output}
                            >
                              <span>{result.success ? "✓" : "✗"}</span>
                              <span className="truncate">{result.site}</span>
                            </div>
                          ))}
                          {isActive && submission.total_sites > results.length
                            ? Array.from({
                                length: Math.min(submission.total_sites - results.length, 4),
                              }).map((_, index) => (
                                <div
                                  key={`pending-${submission.id}-${index}`}
                                  className="flex items-center gap-2 rounded-xl bg-stone-800/60 px-3 py-2 text-xs text-stone-500"
                                >
                                  <span className="animate-pulse">⏳</span>
                                  <span>{copy.history.pending}</span>
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                    ) : null}

                    {submission.status === "queued" && results.length === 0 ? (
                      <div className="border-t border-[var(--line-soft)] px-6 py-4 text-sm text-stone-400">
                        <span className="animate-pulse">⏳</span>{" "}
                        {copy.history.waitingWorker}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.intelligence.title}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.intelligence.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {copy.intelligence.body}
            </p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {copy.intelligence.sourcesTitle}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-400">
                    {copy.intelligence.sourcesBody}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <div>
                    {outreachLibrary.root_domain_count}{" "}
                    {copy.intelligence.rootDomains}
                  </div>
                  <div>
                    {outreachLibrary.source_count}{" "}
                    {copy.intelligence.reusableSources}
                  </div>
                </div>
              </div>

              {sourcePreview.length > 0 ? (
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {sourcePreview.map((source) => (
                    <div
                      key={source.source_id}
                      className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-white">
                          {source.root_domain}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-200">
                          {copy.intelligence.fit} {source.fit_score}/10
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-stone-400">
                        {source.article_title}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        <span>{source.source_type}</span>
                        <span>{source.reuse_segment}</span>
                      </div>
                      <a
                        href={source.article_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex text-xs text-amber-200 transition hover:text-amber-100"
                      >
                        {copy.intelligence.openSource}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5 text-sm text-stone-400">
                  {locale === "zh"
                    ? "当前还没有同步到可复用的高质量外联源。后续执行积累后，这里会开始出现真正可参考的目标。"
                    : "No reusable high-quality outreach sources are synced yet. This section fills in as real execution data accumulates."}
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {copy.intelligence.insightsTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-stone-400">
                    {copy.intelligence.insightsBody}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <div>
                    {operationalInsights.reply_action_count}{" "}
                    {copy.intelligence.replyActions}
                  </div>
                  <div>
                    {operationalInsights.host_public_verified_count}{" "}
                    {copy.intelligence.publicVerified}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                  <div className="text-stone-500">{copy.intelligence.todayActions}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {operationalInsights.today_action_count}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                  <div className="text-stone-500">{copy.intelligence.todayRootDomains}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {operationalInsights.today_action_root_domain_count}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                  <div className="text-stone-500">
                    {copy.intelligence.qualityResultsToday}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {operationalInsights.today_quality_result_count}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                  <div className="text-stone-500">{copy.intelligence.reusableToday}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {operationalInsights.source_library_root_domain_count}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
