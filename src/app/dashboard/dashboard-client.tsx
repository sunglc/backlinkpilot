"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import LocaleToggle from "@/components/locale-toggle";
import {
  CHANNELS,
  LIVE_CHANNEL_COUNT,
  TOTAL_CHANNEL_COUNT,
  type ChannelContract,
} from "@/lib/execution-contract";
import { type Locale } from "@/lib/locale-config";
import type {
  ProductProofPriority,
  ProductProofSummary,
} from "@/lib/proof-pipeline";
import type { SaasCapabilityContract } from "@/lib/saas-capability-contract-types";
import type {
  SaasCapabilityHistory,
  SaasCapabilityHistoryEntry,
} from "@/lib/saas-capability-history-types";
import type {
  WorkspacePolicyClientSnapshot,
  WorkspacePolicyLane,
} from "@/lib/workspace-policy-types";
import type {
  OperationalInsights,
  OperationalInsightsDiscoveryMarket,
} from "@/lib/saas-operational-insights-types";
import type { SaasCapabilityReviewState } from "@/lib/saas-capability-review-state-types";
import type {
  WorkspaceSupplyOwnerSummary,
  WorkspaceSupplySnapshot,
} from "@/lib/workspace-supply-policy-types";
import type {
  WorkspaceTaskPlan,
  WorkspaceTaskPlanCoverageBreakdown,
  WorkspaceTaskPlanGranularity,
} from "@/lib/workspace-task-plans-types";
import {
  buildWorkspaceStrategy,
  type WorkspaceStrategyDecisionKey,
  type WorkspaceStrategyLaneKey,
} from "@/lib/workspace-strategy";
import { type WorkspaceCapacityLaneKey } from "@/lib/workspace-capacity";
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
type OutcomeStage =
  | "staged"
  | "launched"
  | "receipts"
  | "threads"
  | "close"
  | "proved";
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
type WorkflowStepStatus = "blocked" | "ready" | "active" | "done" | "live";
type WorkspaceTaskStage = "pending" | "planned" | "awaiting_effect" | "live";
type WorkspaceTaskKind = "profile" | "coverage" | "submission" | "proof";
type WorkspaceTaskBillingType =
  | "included"
  | "credit_on_success"
  | "premium_service";
type ProductBudgetDecisionKey = WorkspaceStrategyDecisionKey;
type BudgetAction =
  | {
      kind: "launch";
      label: string;
      channelId: string;
    }
  | {
      kind: "proof";
      label: string;
      proofAction: ProductProofAction;
    }
  | {
      kind: "link";
      label: string;
      href: string;
    };

interface WorkspaceTaskBillingRule {
  type: WorkspaceTaskBillingType;
  badge: string;
  detail: string;
  successDisplay: string;
  failureDisplay: string;
}

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
  proof: ProductProofSummary;
}

interface ProductBudgetDecision {
  key: ProductBudgetDecisionKey;
}

interface ProductProofSummaryRow extends ProductProofSummary {
  productId: string;
}

interface DashboardClientProps {
  locale: Locale;
  user: User;
  subscription: Subscription | null;
  products: Product[];
  submissions: Submission[];
  productProofSummaries: ProductProofSummaryRow[];
  capabilityContract: SaasCapabilityContract;
  capabilityHistory: SaasCapabilityHistory;
  capabilityReviewState: SaasCapabilityReviewState;
  operationalInsights: OperationalInsights;
  workspaceSupply: WorkspaceSupplySnapshot;
  workspaceTaskPlans: WorkspaceTaskPlan[];
  workspacePolicy: WorkspacePolicyClientSnapshot;
  checkoutState: CheckoutState;
}

interface WorkspaceTask {
  id: string;
  productId: string;
  productName: string;
  kind: WorkspaceTaskKind;
  taskPlanId?: string | null;
  taskPlanMode?: WorkspaceTaskPlan["mode"] | null;
  sourcePlanId?: string | null;
  sourcePlanTitle?: string | null;
  materializedChannelIds?: string[];
  childPlanIds?: string[];
  stage: WorkspaceTaskStage;
  title: string;
  preview: string;
  href: string;
  updatedAt: string;
  successCost: number;
  failureCost: number;
  focusLabel?: string;
  billingRule?: WorkspaceTaskBillingRule;
  coverageBreakdown?: WorkspaceTaskPlanCoverageBreakdown | null;
}

type ProductProofAction = {
  href: string;
  label: string;
  taskType: "verify_result" | "protect_publication" | "send_materials" | "review_commercial" | "follow_up" | "push_receipts";
  mode: "queue" | "open";
};

type TodayBriefMove =
  | {
      kind: "button";
      title: string;
      body: string;
      label: string;
    }
  | {
      kind: "refresh";
      title: string;
      body: string;
      label: string;
    }
  | {
      kind: "link";
      title: string;
      body: string;
      label: string;
      href: string;
    }
  | {
      kind: "launch";
      title: string;
      body: string;
      label: string;
      productId: string;
      channelId: string;
    }
  | {
      kind: "proof";
      title: string;
      body: string;
      label: string;
      productId: string;
      proofAction: ProductProofAction;
    };

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
        weeklyBurn: "预计本周 Credits",
        weeklyBurnNote: "仅统计普通 credits，高级服务另算",
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
        weeklyBurn: "本周 credits 预估",
        weeklyBurnNote: "仅普通 credits",
        budgetCall: "预算建议",
        budgetAction: "建议动作",
        reclaimTitle: "系统调度",
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
        budgetLabels: {
          build_queue: "继续铺任务",
          watch_effect: "先盯生效",
          prove_first: "先把结果做出来",
          upgrade_now: "该升级了",
          hold_premium: "先别开高级机会",
        },
        budgetBodies: {
          build_queue: "当前预算压力还不高，先把 coverage 和首轮任务铺起来。",
          watch_effect: "这周 burn 已经起来了，先等这批任务见效，不要同时再开太多新任务。",
          prove_first: "现在最值钱的是先把 receipt 和 reply 推成 proof，再继续烧 credits。",
          upgrade_now:
            "当前 burn 和推进密度已经接近 Starter 的舒适上限，升级后再扩渠道会更顺。",
          hold_premium:
            "付费机会先留在高级服务层，等普通 credits 路线先跑出 proof 再接入。",
        },
        budgetActions: {
          build_queue: "继续建任务",
          watch_effect: "查看执行进度",
          prove_first: "推进结果",
          upgrade_now: "升级到增长版",
          hold_premium: "查看高级机会",
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
      workflow: {
        eyebrow: "使用路径",
        title: "登录后先沿着这 4 步走",
        body:
          "工作台不该先给你一堵能力墙，而应该先把你送进产品登记、覆盖计划、任务执行和结果跟踪。",
        note:
          "手工外链清单导入、竞品自动覆盖计划和真实积分扣费，会在这条主路径稳定后再继续加深。",
        statuses: {
          blocked: "未开始",
          ready: "可继续",
          active: "进行中",
          done: "已就绪",
          live: "已有结果",
        },
        steps: {
          register: {
            title: "1. 登记产品",
            empty:
              "贴上首页，先自动识别产品名称和描述，形成一个能执行的基础档案。",
            done: "产品档案已经存在，可以继续进入覆盖计划和执行任务。",
            actionAdd: "登记产品",
            actionOpen: "打开产品",
          },
          plan: {
            title: "2. 生成覆盖计划",
            empty:
              "先有产品，系统才能基于 discovery 供给和 live 渠道生成覆盖路线。",
          ready:
              "系统已经能根据当前产品、今日供给和可用渠道，给出一版可执行覆盖计划。",
            action: "创建覆盖计划",
          },
          launch: {
            title: "3. 建立执行任务",
            empty: "先把产品档案建好，才能启动第一批真实外链任务。",
            running: "当前已经有任务在跑，优先盯住它，而不是继续堆信息。",
            ready: "现在最重要的是启动推荐渠道，让第一批任务真正跑起来。",
            actionLaunch: "启动推荐任务",
            actionQueue: "查看任务队列",
          },
          track: {
            title: "4. 跟踪阶段与积分",
            empty: "任务启动后，这里会告诉你每批外链现在走到哪一段。",
            active:
              "工作台会把任务拆成阶段视图，并给出每类任务的积分预估，让成本结构先变清楚。",
            live:
              "已经出现结果信号，下一步是把“待见效”和“已生效”的任务分开推进。",
            action: "查看任务阶段",
          },
        },
      },
      strategy: {
        eyebrow: "组合策略",
        title: "别把每个产品平均推进。",
        body:
          "长期看，这个系统应该像组合管理器，而不是待办清单。它需要告诉你这周哪些产品该先做 proof，哪些该继续 build，哪些先别开 premium。",
        modeLabel: "当前工作模式",
        allocationLabel: "本周 attention 分配",
        actionLabel: "全局建议动作",
        allocation: {
          prove: "推 proof",
          watch: "盯生效",
          build: "继续 build",
          premium: "高级机会",
        },
        modes: {
          unlock: {
            title: "先解锁第一条 live 渠道，再谈组合优化。",
            body:
              "你现在最缺的不是更多策略，而是第一条真实执行链。先把产品送进 live submission，后面的 proof 和预算分配才会成立。",
          },
          upgrade: {
            title: "工作台已经开始顶到当前计划上限。",
            body:
              "至少一个产品已经接近需要升级的密度。先扩可用计划，再继续堆渠道和任务，不然 burn 和能力边界会打架。",
          },
          prove: {
            title: "这周先把已有信号推成更公开的 proof。",
            body:
              "现在最值钱的不是新铺一层任务，而是把已经拿到的 receipt、reply 和接近发布的线程往前推。",
          },
          watch: {
            title: "让已经跑出去的任务先见效。",
            body:
              "这周更重要的是看哪些任务开始生效，而不是继续同时打开太多新动作。",
          },
          build: {
            title: "当前更像冷启动阶段，先把 coverage 和任务面做出来。",
            body:
              "还没有足够多的 proof 压力，所以最有效的动作仍然是生成计划、补齐目标和启动首轮 lane。",
          },
        },
        lanes: {
          prove: {
            title: "优先推 proof",
            body: "这些产品最接近公开结果，值得优先投入精力。",
          },
          watch: {
            title: "先盯生效",
            body: "这些产品已经开始消耗 credits，先观察结果再继续加速。",
          },
          build: {
            title: "继续 build",
            body: "这些产品还在搭建 coverage 和任务基础，适合继续铺第一层执行面。",
          },
          premium: {
            title: "先 hold premium",
            body: "这些产品有高级机会，但普通 proof 还不够，先不要把 premium 混进主线。",
          },
        },
        laneMetrics: {
          products: "产品数",
          burn: "相关 credits",
          open: "打开",
          empty: "当前没有产品落在这条策略里。",
        },
      },
      capacity: {
        eyebrow: "执行容量",
        title: "把本周开口收在可控范围内。",
        body:
          "长期上，这套系统不该只会推荐动作，还要控制每周同时打开多少 submission、proof 和 premium work，避免账户越来越像噪音机器。",
        policyLabel: "当前容量策略",
        laneLabels: {
          submission: "Submission 开口",
          proof: "Proof 开口",
          premium: "Premium 开口",
        },
        metrics: {
          used: "已占用",
          limit: "建议上限",
          remaining: "剩余空间",
          over: "超出",
        },
        states: {
          unlock: {
            title: "先解锁再谈容量",
            body: "还没进入可执行状态前，不需要同时打开太多口子。",
          },
          tighten: {
            title: "先收口",
            body: "当前开口已经偏多，优先把现有任务推向生效和 proof。",
          },
          balanced: {
            title: "保持平衡推进",
            body: "当前容量和策略基本一致，可以继续按当前节奏推进。",
          },
          expand: {
            title: "可以继续扩一点",
            body: "当前仍然偏 build 模式，还有空间继续铺首轮 submission 和 coverage。",
          },
        },
        fullError: {
          submission:
            "本周 submission 开口已经满了。先盯生效或推进 proof，再开新的提交任务。",
          proof:
            "本周 proof 开口已经满了。先把当前结果任务往前推完，再排新的 proof。",
          premium:
            "当前 premium 开口已经满了。先把普通 proof 路线跑顺，再继续接高级机会。",
        },
      },
      builder: {
        eyebrow: "Task Builder",
        title: "先把任务建出来，再谈放大执行",
        body:
          "这一层开始把“推荐覆盖计划”和“导入外链清单”变成真实任务，而不是只停留在看板判断。",
        productLabel: "目标产品",
        autoTitle: "系统生成覆盖计划",
        autoBody:
          "基于当前产品、已跑渠道和 discovery 供给，生成一版推荐覆盖计划，并落成任务。",
        autoAction: "生成覆盖计划",
        competitorTitle: "生成竞品覆盖规划",
        competitorBody:
          "贴上竞品网址，系统会把它们压成一版竞品覆盖任务，告诉你先该匹配哪些渠道。",
        competitorPlaceholder:
          "competitor-one.com\nhttps://competitor-two.com\ncompetitor-three.ai",
        competitorAction: "生成竞品规划",
        importTitle: "导入你的外链清单",
        importBody:
          "一行一个域名或 URL。你可以先按批次导入，也可以拆成每个外链一个任务。",
        importPlaceholder:
          "example.com\nhttps://directory.example/submit\nblog.example.com/tools",
        granularityLabel: "导入方式",
        granularityBatch: "按一批任务",
        granularityPerTarget: "按单个外链任务",
        importAction: "导入清单并建任务",
        loading: "处理中...",
        detectedCount: "识别到的条目",
        note:
          "这一步先把任务和阶段结构立住。后面再继续接真实导入执行和积分扣费。",
      },
    tasks: {
      eyebrow: "动作清单",
      title: "把执行进展翻成一眼能懂的动作清单",
      body:
        "每个产品登记、每批提交和每个结果推进动作，都会先变成一条可见动作。第一版先让用户看懂阶段和积分结构，再往真实计费接。",
      previewBadge: "预估版",
      empty:
          "还没有动作。先登记一个产品，让系统开始生成覆盖计划和执行动作。",
        labels: {
          stage: "阶段",
          preview: "任务预览",
          economics: "积分预估",
          billing: "计费规则",
          updatedAt: "最近更新",
          success: "成功",
          failure: "失败/辛苦费",
          focus: "当前权重",
          fromPlan: "来源",
          createNextTasks: "生成下一批任务",
          creatingTasks: "生成中...",
          unlockToCreateTasks: "升级后生成任务",
          open: "打开",
          directories: "该补哪些目录",
          outreach: "该跟哪些外联",
          paid: "哪些属于付费机会",
        },
        kinds: {
          profile: "产品登记",
          coverage: "覆盖计划",
          submission: "外链任务",
          proof: "结果推进",
        },
        stages: {
          pending: "待启动",
          planned: "计划中",
          awaiting_effect: "已发布/待生效",
          live: "已生效",
        },
      footer:
          "这批积分还是产品层预估，不会先于真实计费生效。它现在的作用，是先让用户理解每类任务的成本结构。",
        focusLabels: {
          prove_now: "最接近结果",
          watch_effect: "盯住生效",
          expand_lane: "继续扩量",
          build_queue: "补齐计划",
        },
        billingLabels: {
          included: "包含项",
          credit_on_success: "成功扣积分",
          premium_service: "高级服务",
        },
        billingDetails: {
          included: "登记、规划和任务编排先不扣积分，先把执行路径搭起来。",
          credit_on_success: "只有真实成功动作计入积分；失败只记辛苦费，不按成功任务收费。",
          premium_service:
            "这类机会不走普通 credit 包，后续按高级服务或单独商务处理。",
        },
        billingDisplays: {
          includedSuccess: "0",
          includedFailure: "0",
          premiumSuccess: "单独报价",
          premiumFailure: "商务评估",
        },
      },
      emptyState: {
        title: "添加你的第一个产品",
        body: "先补齐产品信息，我们就可以开始把它送进真正的外链执行链。",
        cta: "+ 添加产品",
      },
      discovery: {
        eyebrow: "供给情报",
        title: "把新增目标和收费机会变成一眼能懂的供给视图。",
        body:
          "系统每天都会持续补进新的可发目标，同时把收费型和商务型机会单独沉淀，避免和默认执行主线混在一起。",
        contractTitle: "能力同步状态",
        contractFresh: "当前已同步",
        contractChanged: "有新能力待同步",
        contractFreshBody:
          "当前能力指纹和上一版一致，没有新的 SaaS 同步动作被触发。",
        contractChangedBody:
          "能力指纹已变化。先看 required SaaS actions，再更新产品展示、文案和能力说明。",
        claimRuleTitle: "对外承诺边界",
        provenTitle: "Proven 市场",
        buildoutTitle: "Priority buildout 市场",
        watchlistTitle: "Watchlist 市场",
        anchorsTitle: "Anchor markets",
        adaptiveCopyTitle: "语言自适应文案",
        adaptiveCopyBody:
          "提交文案和外联消息会按目标语言适配，不再默认只用英文。",
        noAdaptiveCopyBody:
          "这项能力还没有进入 proven 合同，不该被当成现成卖点宣传。",
        reviewActionsTitle: "需要同步的 SaaS 动作",
        noReviewActions: "当前没有新的 SaaS 同步动作。",
        fingerprintLabel: "能力指纹",
        reviewPendingLabel: "待吸收",
        reviewedLabel: "已吸收",
        reviewedAtLabel: "已吸收时间",
        acknowledgeAction: "标记为已吸收",
        acknowledging: "标记中...",
        acknowledgeError: "能力合同状态更新失败，请稍后再试。",
        historyTitle: "能力升级历史",
        historyBody:
          "这里记录最近几次能力合同变化，方便产品、运营和销售理解现在的能力是怎么迭代出来的。",
        historyChanged: "有结构变化",
        historyStable: "当前能力快照",
        historyEmpty: "当前还没有能力升级历史可展示。",
        addedLabel: "新增能力",
        removedLabel: "移除能力",
        snapshotLabel: "状态快照",
        surfacesTitle: "需要同步的产品面",
        surfacesBody:
          "能力合同已经点名这些页面或界面需要跟着升级。这样产品团队知道应该先改哪里，而不是只看到一个 fingerprint。",
        surfacesEmpty: "当前没有登记具体的产品同步面。",
        customerAudience: "用户侧",
        internalAudience: "内部",
        copyImpactTitle: "文案与销售影响",
        copyImpactBody:
          "这里把这次能力升级对客户文案、销售演示和内部执行口径的影响压成短摘要，避免大家各自理解。",
        customerSummaryLabel: "对用户的核心说法",
        claimGuardrailLabel: "对外口径护栏",
        salesNoteLabel: "销售/演示说明",
        operatorNoteLabel: "内部执行说明",
        copyImpactEmpty: "当前没有新的文案影响摘要。",
        progressLabel: "今日发现进度",
        targetLabel: "今日硬目标",
        gapLabel: "今日剩余缺口",
        paidBacklogLabel: "收费目标库存",
        paidRootsLabel: "收费目标根域",
        paidNewLabel: "今日新增收费目标",
        progressReached: "今日供给地板已达成",
        progressRunning: "今日还在持续补货",
        supplyTitle: "发现供给层",
        supplyBody:
          "用户可以直接看到系统今天已经补进多少新目标、距离每日 100 个值得发的新根域目标还差多少。",
        inventoryTitle: "收费情报层",
        inventoryBody:
          "收费型和商务型机会会持续被收集，但不会混进默认免费执行队列，避免执行量污染策略质量。",
        sampleTitle: "代表性收费目标",
        sampleEmpty: "当前还没有代表性收费目标样例，下一轮巡航后会自动出现。",
        openTarget: "查看目标",
        sourceLabel: "发现来源",
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
      weeklyBurn: "Est. weekly credits",
      weeklyBurnNote: "Credits only. Premium work excluded.",
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
        weeklyBurn: "Weekly credit estimate",
        weeklyBurnNote: "Credits only",
        budgetCall: "Budget call",
        budgetAction: "Recommended action",
        reclaimTitle: "Workspace routing",
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
        budgetLabels: {
          build_queue: "Keep building",
          watch_effect: "Watch effect",
          prove_first: "Turn spend into proof",
          upgrade_now: "Upgrade now",
          hold_premium: "Hold premium work",
        },
        budgetBodies: {
          build_queue:
            "Budget pressure is still light, so the right move is filling the coverage and first task queue.",
          watch_effect:
            "Weekly burn is already rising. Let the current tasks land before opening too many new ones.",
          prove_first:
            "The highest-value move now is turning receipts and replies into proof before burning more credits.",
          upgrade_now:
            "The current burn and execution density are pushing past a comfortable Starter cadence. Upgrade before expanding further.",
          hold_premium:
            "Keep paid opportunities in the premium lane until the normal credit path produces proof first.",
        },
        budgetActions: {
          build_queue: "Keep building tasks",
          watch_effect: "Watch execution",
          prove_first: "Push toward proof",
          upgrade_now: "Upgrade to Growth",
          hold_premium: "Review premium work",
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
    workflow: {
      eyebrow: "User Path",
      title: "After login, move through these four steps first",
      body:
        "The workspace should not hit you with a wall of capability copy. It should move you into product setup, coverage planning, task execution, and result tracking.",
      note:
        "Manual backlink-list import, competitor-linked coverage plans, and real credit charging should come after this core path is stable.",
      statuses: {
        blocked: "Not started",
        ready: "Ready",
        active: "In progress",
        done: "Ready to use",
        live: "Result live",
      },
      steps: {
        register: {
          title: "1. Register the product",
          empty:
            "Paste the homepage first so the app can detect the product name and description and turn it into a workable profile.",
          done: "The product profile already exists, so the next move is planning and execution.",
          actionAdd: "Register product",
          actionOpen: "Open product",
        },
        plan: {
          title: "2. Build the coverage plan",
          empty:
            "The system needs a product profile before it can turn discovery supply and live lanes into a coverage path.",
          ready:
            "The app can already turn the current product, today's discovery supply, and available live lanes into an executable coverage plan.",
          action: "Create coverage plan",
        },
        launch: {
          title: "3. Create execution tasks",
          empty:
            "Finish the product profile first so the first real backlink tasks can be created.",
          running:
            "A real task is already moving. Watch that instead of reading more capability copy.",
          ready:
            "The highest-value move now is launching the recommended lane so the first task batch actually starts.",
          actionLaunch: "Launch recommended task",
          actionQueue: "Open task queue",
        },
        track: {
          title: "4. Track stages and credits",
          empty:
            "Once a task starts, this is where the workspace should show what stage each batch is in.",
          active:
            "The workspace now breaks work into task stages and a credit preview so the cost structure becomes visible before billing is wired in.",
          live:
            "Real result signal already exists, so the next move is separating 'awaiting effect' work from 'live' outcomes.",
          action: "View task stages",
        },
      },
    },
      strategy: {
        eyebrow: "本周重心",
        title: "别把每个产品都平均推进。",
        body:
          "系统要直接告诉你这周先盯哪个产品、先推哪个结果、哪些高级机会先别开，而不是让你自己在一堆卡片里判断。",
        modeLabel: "当前节奏",
        allocationLabel: "本周注意力",
        actionLabel: "当前最该做的事",
        allocation: {
          prove: "推结果",
          watch: "Watch effect",
          build: "继续铺量",
          premium: "高级机会",
        },
      modes: {
        unlock: {
          title: "Unlock the first live lane before optimizing the portfolio.",
          body:
            "The missing piece is not more strategy. It is getting the first product into live execution so proof and budget guidance have something real to work with.",
        },
        upgrade: {
          title: "The workspace is starting to push past the current plan ceiling.",
          body:
            "At least one product is reaching upgrade density. Expand the plan before stacking more lanes and tasks, or the burn pressure and capability boundary will fight each other.",
        },
        prove: {
          title: "Turn existing signal into more public proof this week.",
          body:
            "The highest-value move is not opening another layer of tasks. It is pushing current receipts, replies, and near-publication threads closer to visible proof.",
        },
        watch: {
          title: "Let the work already in motion land first.",
          body:
            "The better move this week is watching which tasks start to take effect instead of opening too many new actions at once.",
        },
        build: {
          title: "This workspace is still in build mode, so expand coverage and the task surface.",
          body:
            "There is not enough proof pressure yet, so the best move is still creating plans, filling the target base, and launching the first lanes.",
        },
      },
      lanes: {
        prove: {
          title: "Push proof now",
          body: "These products are closest to visible results and deserve the first attention.",
        },
        watch: {
          title: "Watch effect",
          body: "These products are already consuming credits, so watch outcomes before accelerating again.",
        },
        build: {
          title: "Keep building",
          body: "These products still need more coverage and first-layer execution before they should dominate the workspace.",
        },
        premium: {
          title: "Hold premium work",
          body: "These products have premium opportunities, but normal proof should land before premium becomes the main path.",
        },
      },
      laneMetrics: {
        products: "Products",
        burn: "Related credits",
        open: "Open",
        empty: "No products are sitting in this strategy lane right now.",
      },
    },
      capacity: {
        eyebrow: "本周开口",
        title: "把本周同时推进的动作收在可控范围内。",
        body:
          "系统不只要推荐动作，还要控制这周同时打开多少提交、结果推进和高级机会，避免越跑越乱。",
        policyLabel: "当前节奏状态",
        laneLabels: {
          submission: "提交名额",
          proof: "结果名额",
          premium: "高级机会名额",
        },
      metrics: {
        used: "Used",
        limit: "Suggested cap",
        remaining: "Remaining",
        over: "Over",
      },
      states: {
        unlock: {
          title: "Unlock first, then worry about capacity.",
          body: "Before live execution is really open, there is no value in opening too many lanes at once.",
        },
        tighten: {
          title: "Tighten the aperture first.",
          body: "The workspace is already carrying too many openings. Push current work toward effect and proof before opening more.",
        },
        balanced: {
          title: "The current pace is balanced.",
          body: "Capacity and strategy are mostly aligned, so the workspace can keep moving at the current rhythm.",
        },
        expand: {
          title: "There is still room to expand.",
          body: "The workspace is still in build mode and has room to open more first-pass submission and coverage work.",
        },
      },
      fullError: {
        submission:
          "The submission lane is already full for this week. Let current work land or push proof before opening more submissions.",
        proof:
          "The proof lane is already full for this week. Finish pushing the current result tasks before queuing another proof task.",
        premium:
          "The premium lane is already full right now. Keep premium work separate until the standard proof path is clearer.",
      },
    },
    builder: {
      eyebrow: "Task Builder",
      title: "Create the task first, then scale the execution",
      body:
        "This is where recommended coverage plans and imported backlink lists become real workspace tasks instead of staying as dashboard judgment.",
      productLabel: "Product",
      autoTitle: "Generate a system coverage plan",
        autoBody:
          "Use the current product, completed lanes, and discovery supply to generate a recommended coverage plan and turn it into a task.",
        autoAction: "Generate coverage plan",
        competitorTitle: "Build a competitor coverage map",
        competitorBody:
          "Paste competitor URLs and the app will turn them into a competitor coverage task that shows which lanes your product should match first.",
        competitorPlaceholder:
          "competitor-one.com\nhttps://competitor-two.com\ncompetitor-three.ai",
        competitorAction: "Generate competitor plan",
        importTitle: "Import your backlink list",
        importBody:
          "Use one domain or URL per line. You can import them as one batch or split them into one task per target.",
      importPlaceholder:
        "example.com\nhttps://directory.example/submit\nblog.example.com/tools",
      granularityLabel: "Import mode",
      granularityBatch: "One batch task",
      granularityPerTarget: "One task per target",
      importAction: "Import list and create tasks",
      loading: "Working...",
      detectedCount: "Detected lines",
      note:
        "This step focuses on making the task and stage structure real first. Real execution and billing can plug in after that.",
    },
    tasks: {
      eyebrow: "Action List",
      title: "Turn execution into a simple action list",
      body:
        "Each product setup, submission batch, and result push becomes one visible action. This first version focuses on stage and credit clarity before real billing is attached.",
      previewBadge: "Preview",
      empty:
        "There are no actions yet. Register one product first and the system can start building the coverage and execution flow.",
      labels: {
        stage: "Stage",
        preview: "Task preview",
        economics: "Credit preview",
        billing: "Billing rule",
        updatedAt: "Updated",
        success: "Success",
        failure: "Failure / ops fee",
        focus: "Current focus",
        fromPlan: "From",
        createNextTasks: "Create next tasks",
        creatingTasks: "Creating...",
        unlockToCreateTasks: "Unlock to create tasks",
        open: "Open",
        directories: "Directory gaps",
        outreach: "Outreach lanes",
        paid: "Paid opportunities",
      },
      kinds: {
        profile: "Product setup",
        coverage: "Coverage plan",
        submission: "Backlink task",
        proof: "Proof task",
      },
      stages: {
        pending: "Pending",
        planned: "Planned",
        awaiting_effect: "Published / awaiting effect",
        live: "Live",
      },
      footer:
        "These credits are still a product-layer preview. They do not charge before the real billing model exists. Right now they help users understand the cost structure of each task type.",
      focusLabels: {
        prove_now: "Closest to proof",
        watch_effect: "Watch effect",
        expand_lane: "Expand next",
        build_queue: "Build queue",
      },
      billingLabels: {
        included: "Included",
        credit_on_success: "Credits on success",
        premium_service: "Premium service",
      },
      billingDetails: {
        included:
          "Profile setup, planning, and task orchestration stay unmetered while the execution path is being staged.",
        credit_on_success:
          "Only real successful actions count toward credits. Failures stay as ops fees instead of success charges.",
        premium_service:
          "These opportunities do not run through the normal credit pack and should route into premium handling or custom pricing.",
      },
      billingDisplays: {
        includedSuccess: "0",
        includedFailure: "0",
        premiumSuccess: "Custom quote",
        premiumFailure: "Ops review",
      },
    },
    emptyState: {
      title: "Add your first product",
      body: "Add the product details and we can move it into live backlink execution.",
      cta: "+ Add Product",
    },
      discovery: {
        eyebrow: "Supply view",
        title: "Turn fresh targets and paid opportunities into a clear supply view.",
        body:
          "The system keeps replenishing worthwhile targets every day while keeping paid and commercial opportunities separate from the default execution path.",
        contractTitle: "Capability sync status",
        contractFresh: "Up to date",
        contractChanged: "New capability update pending",
        contractFreshBody:
          "The current capability fingerprint matches the previous one, so no new SaaS sync work is being triggered right now.",
        contractChangedBody:
          "The capability fingerprint changed. Review the required SaaS actions before updating product claims, copy, and capability explanations.",
        claimRuleTitle: "Claim boundary",
        provenTitle: "Proven markets",
        buildoutTitle: "Priority buildout markets",
        watchlistTitle: "Watchlist markets",
        anchorsTitle: "Anchor markets",
        adaptiveCopyTitle: "Language-adaptive copy",
        adaptiveCopyBody:
          "Submission copy and outreach messaging adapt to the target language instead of defaulting to English-only messaging.",
        noAdaptiveCopyBody:
          "This capability is not in the proven contract yet, so it should not be marketed as a live differentiator.",
        reviewActionsTitle: "Required SaaS actions",
        noReviewActions: "There are no new SaaS sync actions right now.",
        fingerprintLabel: "Capability fingerprint",
        reviewPendingLabel: "Needs adoption",
        reviewedLabel: "Adopted",
        reviewedAtLabel: "Adopted at",
        acknowledgeAction: "Mark as adopted",
        acknowledging: "Saving...",
        acknowledgeError: "Unable to update the capability contract state right now.",
        historyTitle: "Capability upgrade history",
        historyBody:
          "This keeps the recent capability-contract changes visible so product, ops, and sales can see how the current capability layer evolved.",
        historyChanged: "Structural change",
        historyStable: "Current capability snapshot",
        historyEmpty: "There is no capability upgrade history to show yet.",
        addedLabel: "Added",
        removedLabel: "Removed",
        snapshotLabel: "Snapshot",
        surfacesTitle: "Product surfaces to sync",
        surfacesBody:
          "The capability contract explicitly names the product surfaces that should absorb this upgrade, so the team knows where to update first instead of only seeing a fingerprint.",
        surfacesEmpty: "There are no explicit product surfaces registered right now.",
        customerAudience: "Customer-facing",
        internalAudience: "Internal",
        copyImpactTitle: "Copy and sales impact",
        copyImpactBody:
          "This compresses the customer-copy, sales-demo, and operator impact of the current capability layer into one place.",
        customerSummaryLabel: "Customer-facing summary",
        claimGuardrailLabel: "Public-claim guardrail",
        salesNoteLabel: "Sales/demo note",
        operatorNoteLabel: "Operator note",
        copyImpactEmpty: "There is no new copy-impact guidance right now.",
        progressLabel: "Today's discovery progress",
        targetLabel: "Daily floor",
        gapLabel: "Remaining gap today",
      paidBacklogLabel: "Paid target backlog",
      paidRootsLabel: "Paid target root domains",
      paidNewLabel: "New paid targets today",
      progressReached: "Today's supply floor is already met",
      progressRunning: "The system is still replenishing today's supply",
      supplyTitle: "Discovery supply layer",
      supplyBody:
        "Users can see how much fresh target supply has already been discovered today and how far the engine still is from the 100-worthy-root-domain floor.",
      inventoryTitle: "Paid intelligence layer",
      inventoryBody:
        "Paid and commercial opportunities are collected continuously, but kept separate from the default free-send queue so strategic quality does not get polluted by raw volume.",
      sampleTitle: "Representative paid targets",
      sampleEmpty:
        "There are no representative paid targets yet. The next discovery run should fill them in automatically.",
      openTarget: "Open target",
      sourceLabel: "Discovery source",
    },
    detectedLabel: "Detected from",
  };
}

function getProofBoardCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      eyebrow: "Proof Board",
      title: "优先推进最接近结果的产品",
      body:
        "全局最优不是盯着每个局部动作，而是优先把最接近可证明结果的产品推到结果层。",
      stats: {
        receipts: "动作回执",
        threads: "真实回复",
        close: "接近发布",
        verify: "待验证",
      },
      globalFocusLabel: "当前全局优先级",
      empty:
        "当前还没有明显接近结果的产品。先继续跑 live 渠道，把结果信号做厚。",
      noCandidates: "还没有明确候选",
      openProduct: "打开产品",
      openTopProduct: "打开全局优先产品",
      latestSignal: "最近信号",
      candidates: "候选",
      activeTaskLabel: "当前进行中的结果任务",
      actionLabels: {
        verify_published: "验证结果",
        protect_publication: "推进接近发布",
        send_materials: "补齐资料",
        review_commercial: "评估商务条件",
        hold_review: "继续跟进",
        push_receipts: "推进回执证明",
        build_signal: "打开产品",
        open_active: "打开正在进行的任务",
      },
      taskStatus: {
        queued: "已排队",
        in_progress: "进行中",
        proved: "已证明",
        dropped: "已放弃",
      },
      priorities: {
        verify_published: {
          title: "先验证最接近上线的产品",
          body: "这些产品已经接近拿到公开证明，应该优先抓证据并沉淀结果。",
        },
        protect_publication: {
          title: "先守住接近发布的线程",
          body: "这些产品离结果只差最后一段推进，优先盯住它们最划算。",
        },
        send_materials: {
          title: "先补资料，不要让高质量线程卡住",
          body: "有回复但卡在素材和描述时，继续开新线程的价值远低于补齐资料。",
        },
        review_commercial: {
          title: "先筛掉不值得付费的机会",
          body: "涉及价格和商务条件的线程，要快速判断值不值得继续。",
        },
        hold_review: {
          title: "先守住审核中的机会",
          body: "这些线程还在内部评估，关键是别让它们自然冷掉。",
        },
        push_receipts: {
          title: "先把提交回执推进到公开证明",
          body: "虽然还没有强回复，但已有真实动作成功，值得继续追公开结果。",
        },
        build_signal: {
          title: "先继续堆厚结果信号",
          body: "当前还没有足够强的 proof 候选，继续执行比局部微调更重要。",
        },
      },
    };
  }

  return {
    eyebrow: "Proof Board",
    title: "Push the products closest to real results first",
    body:
      "Global optimization means prioritizing the products that are nearest to provable outcomes, not polishing isolated local steps.",
    stats: {
      receipts: "Action receipts",
      threads: "Live replies",
      close: "Close to publication",
      verify: "Ready to verify",
    },
    globalFocusLabel: "Current global priority",
    empty:
      "There are no obvious proof-front products yet. Keep running live lanes until the result layer gets thicker.",
    noCandidates: "No named candidates yet",
    openProduct: "Open Product",
    openTopProduct: "Open top proof product",
    latestSignal: "Latest signal",
    candidates: "Candidates",
    activeTaskLabel: "Active proof task",
    actionLabels: {
      verify_published: "Verify result",
      protect_publication: "Protect publication",
      send_materials: "Send materials",
      review_commercial: "Review terms",
      hold_review: "Follow up",
      push_receipts: "Push receipts",
      build_signal: "Open product",
      open_active: "Open active task",
    },
    taskStatus: {
      queued: "Queued",
      in_progress: "In progress",
      proved: "Proved",
      dropped: "Dropped",
    },
    priorities: {
      verify_published: {
        title: "Verify the products closest to going live",
        body: "These products are closest to public proof and should be converted into visible results first.",
      },
      protect_publication: {
        title: "Protect the threads closest to publication",
        body: "These products are one step away from a result, so defending the final step matters most.",
      },
      send_materials: {
        title: "Send the missing materials before opening more threads",
        body: "When a strong thread is waiting on assets or copy, that is worth more than opening new surface area.",
      },
      review_commercial: {
        title: "Filter the paid opportunities quickly",
        body: "Pricing and sponsorship threads should be triaged fast so budget goes to the right opportunities.",
      },
      hold_review: {
        title: "Protect the products under review",
        body: "These conversations are still being evaluated, so follow-up discipline matters most.",
      },
      push_receipts: {
        title: "Push submission receipts toward public proof",
        body: "There may not be strong live replies yet, but real actions already landed and should be driven further.",
      },
      build_signal: {
        title: "Keep building result signal",
        body: "There are not enough strong proof candidates yet, so more execution matters more than local polishing.",
      },
    },
  };
}

function getTodayBriefCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      eyebrow: "Today Brief",
      title: "把今天最重要的判断压成三张卡",
      body:
        "实战里最怕的是信息很多，但方向不清。这里先告诉你今天最强的结果信号、最大的阻塞，以及唯一最该做的动作。",
      cards: {
        signal: "最强信号",
        blocker: "最大阻塞",
        move: "唯一推荐动作",
      },
      emptySignalTitle: "还没有进入结果层的产品",
      emptySignalBody: "先让第一个产品进入真实执行，再谈 proof 和扩张。",
      activeSignalTitle: "今天有 live 渠道在跑",
      activeSignalBody: "最该看的不是更多设置，而是这一轮什么时候开始产出真实结果。",
      readySignalTitle: "已经出现可推进的结果信号",
      readySignalBody: "这个产品最接近进入公开 proof，应该优先推进它。",
      noProductBlockerTitle: "还没有可执行的产品档案",
      noProductBlockerBody: "没有产品，后面的 proof、外联和升级都没有承载点。",
      freeBlockerTitle: "真实渠道还没解锁",
      freeBlockerBody: "产品已经配好，但还停在免费配置层，真实提交和结果还没开始累积。",
      syncBlockerTitle: "付款后同步还没完成",
      syncBlockerBody: "通常只是 webhook 在追平。先刷新一次，别在半同步状态下误判。",
      discoveryBlockerTitle: "今天的目标供给还在补货",
      discoveryBlockerBody: "发现引擎还没补满今天的目标地板，后续执行面还会继续变厚。",
      proofBlockerTitle: "结果信号还不够厚",
      proofBlockerBody: "现在更重要的是继续执行，先把 receipt 和 reply 层做厚，再谈局部优化。",
      actionSetupTitle: "先把第一个产品加进来",
      actionSetupBody: "先形成一个可执行档案，后面的 launch、proof 和 managed inbox 才有落点。",
      actionUnlockTitle: "先解锁 Starter",
      actionUnlockBody: "这是从配置态进入真实提交态的分水岭，目录和 stealth 会立刻开始产生结果信号。",
      actionSyncTitle: "先刷新工作台",
      actionSyncBody: "计划状态同步完以后，这一屏的推荐动作才会切换成真正可执行。",
      actionProofTitle: "先推进最接近结果的产品",
      actionProofBody: "不要平均用力。先把最接近 proof 的产品推过去，结果感会最强。",
      actionLaunchTitle: "先启动推荐渠道",
      actionLaunchBody: "当前最值得做的是把推荐 lane 跑起来，让结果层开始积累。",
      actionReviewTitle: "先打开最值得看的产品",
      actionReviewBody: "如果没有更强动作，先回到最关键的产品页看清楚它现在卡在哪。",
      refresh: "刷新工作台",
      openProduct: "打开产品",
    };
  }

  return {
    eyebrow: "Today Brief",
    title: "Compress today's product judgment into three cards",
    body:
      "Real usage breaks when the screen is full of information but short on direction. Start with the strongest signal, the biggest blocker, and the single move that matters most.",
    cards: {
      signal: "Strongest signal",
      blocker: "Biggest blocker",
      move: "Single best move",
    },
    emptySignalTitle: "No product has entered the result layer yet",
    emptySignalBody: "Get the first product into live execution before worrying about proof or expansion.",
    activeSignalTitle: "A live lane is running today",
    activeSignalBody: "The thing to watch now is not more setup. It is when this run starts producing real result signal.",
    readySignalTitle: "A product is already showing proof pressure",
    readySignalBody: "This product is the closest to public proof and should be pushed first.",
    noProductBlockerTitle: "There is no executable product profile yet",
    noProductBlockerBody: "Without a product, proof, outreach, and upgrades have nothing real to operate on.",
    freeBlockerTitle: "Live lanes are still locked",
    freeBlockerBody: "The product is staged, but the workspace is still stuck in setup mode and not accumulating real submission signal.",
    syncBlockerTitle: "Post-checkout sync is still catching up",
    syncBlockerBody: "This is usually just the webhook finishing. Refresh once before judging the workspace state.",
    discoveryBlockerTitle: "Today's target supply is still filling in",
    discoveryBlockerBody: "The discovery engine has not finished replenishing today's floor, so the execution surface is still getting thicker.",
    proofBlockerTitle: "The result layer is still too thin",
    proofBlockerBody: "More execution matters more than local polishing until receipts and replies get thicker.",
    actionSetupTitle: "Add the first product first",
    actionSetupBody: "You need a real product profile before launch, proof, and managed inbox can become meaningful.",
    actionUnlockTitle: "Unlock Starter first",
    actionUnlockBody: "This is the line between setup mode and real execution. Directory and Stealth start producing signal immediately.",
    actionSyncTitle: "Refresh the workspace first",
    actionSyncBody: "The right move only becomes visible after the plan sync is complete.",
    actionProofTitle: "Push the product closest to proof first",
    actionProofBody: "Do not spread effort evenly. Move the product closest to proof and the result feeling gets stronger faster.",
    actionLaunchTitle: "Launch the recommended lane first",
    actionLaunchBody: "The highest-value move right now is starting the recommended lane so the result layer can compound.",
    actionReviewTitle: "Open the product that matters most",
    actionReviewBody: "If there is no stronger move, go to the key product page and get clarity on what is blocking it.",
    refresh: "Refresh workspace",
    openProduct: "Open product",
  };
}

function getOutcomeLadderCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      eyebrow: "Outcome Ladder",
      title: "用同一条结果路径看所有产品",
      body:
        "真正的消费级体验不是让你学会一堆运营术语，而是让你知道每个产品目前处在哪一步，以及离下一个结果还差什么。",
      stageLabel: "当前阶段",
      nextLabel: "下一步门槛",
      actionLabel: "推进动作",
      empty: "还没有产品进入结果路径。先添加一个产品，把第一条执行链跑起来。",
      stages: {
        staged: "档案已就绪",
        launched: "首轮已启动",
        receipts: "拿到动作回执",
        threads: "拿到真实回复",
        close: "接近公开 proof",
        proved: "已进入 proof",
      },
      stageBody: {
        staged: "这个产品已经有基本档案，但还没有进入真实执行。",
        launched: "这个产品已经开始跑真实渠道，下一步是等第一批有效动作回执。",
        receipts: "已经出现真实动作成功，下一步要把它推进到回复或公开结果。",
        threads: "已经拿到真实回复，重点是别让高质量线程冷掉。",
        close: "它已经接近公开 proof，最值得优先推进。",
        proved: "这个产品已经拿到最强结果信号，接下来应该复制和扩张。",
      },
      nextBody: {
        staged: "把第一个 live 渠道跑起来。",
        launched: "拿到第一批成功动作回执。",
        receipts: "把回执推进到回复或公开证据。",
        threads: "把回复推进到接近发布或公开结果。",
        close: "拿到最终 proof 并沉淀成成果。",
        proved: "把这套打法复制到下一条渠道或下一个产品。",
      },
      actionBody: {
        staged: "现在最值钱的动作是启动，而不是继续改文案。",
        launched: "现在最值钱的动作是盯住进度和第一批结果。",
        receipts: "现在最值钱的动作是把已成功的信号推进到回复层。",
        threads: "现在最值钱的动作是守住高质量线程，别让它们自然流失。",
        close: "现在最值钱的动作是抓 proof，而不是分散到别的产品。",
        proved: "现在最值钱的动作是复制这条结果路径。",
      },
      openProduct: "打开产品",
    };
  }

  return {
    eyebrow: "Outcome Ladder",
    title: "Map every product onto the same result path",
    body:
      "A consumer-grade product should not make you learn ops jargon. It should show what stage each product is in and what is missing before the next real outcome.",
    stageLabel: "Current stage",
    nextLabel: "Next threshold",
    actionLabel: "Best move",
    empty: "No product has entered the result ladder yet. Add one product and start the first execution path.",
    stages: {
      staged: "Profile staged",
      launched: "First lane launched",
      receipts: "Receipts landed",
      threads: "Replies landed",
      close: "Close to public proof",
      proved: "Proof reached",
    },
    stageBody: {
      staged: "The product profile exists, but it has not entered live execution yet.",
      launched: "A real lane has started. The next threshold is the first useful action receipt.",
      receipts: "Real actions have landed. The next move is pushing them toward replies or public outcomes.",
      threads: "Real replies are live now, so the priority is protecting the strong threads.",
      close: "This product is close to public proof and deserves priority.",
      proved: "This product already has the strongest result signal. Now the job is replication and expansion.",
    },
    nextBody: {
      staged: "Launch the first live lane.",
      launched: "Land the first successful action receipts.",
      receipts: "Push receipts toward replies or public evidence.",
      threads: "Push replies toward publication or proof.",
      close: "Capture the final proof and turn it into visible outcome.",
      proved: "Replicate this path into the next lane or product.",
    },
    actionBody: {
      staged: "The highest-value move now is launching, not polishing more copy.",
      launched: "The highest-value move now is watching for the first real outcome.",
      receipts: "The highest-value move now is pushing successful signal toward replies.",
      threads: "The highest-value move now is protecting the strongest live threads.",
      close: "The highest-value move now is capturing proof instead of spreading attention.",
      proved: "The highest-value move now is copying the winning pattern.",
    },
    openProduct: "Open product",
  };
}

function workflowStatusClasses(status: WorkflowStepStatus) {
  return {
    blocked: "border-white/10 bg-white/[0.04] text-stone-300",
    ready: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    active: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    done: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    live: "border-lime-300/15 bg-lime-300/[0.08] text-lime-100",
  }[status];
}

function workspaceTaskStageClasses(stage: WorkspaceTaskStage) {
  return {
    pending: "border-white/10 bg-white/[0.04] text-stone-300",
    planned: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    awaiting_effect: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    live: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
  }[stage];
}

function workspaceTaskStageRank(stage: WorkspaceTaskStage) {
  return {
    pending: 0,
    planned: 1,
    awaiting_effect: 2,
    live: 3,
  }[stage];
}

function workspaceTaskPriorityScore(task: WorkspaceTask) {
  const baseStageScore = {
    pending: 10,
    planned: 30,
    awaiting_effect: 60,
    live: 90,
  }[task.stage];

  if (task.kind === "proof") {
    return baseStageScore + 70;
  }

  if (task.kind === "submission") {
    return baseStageScore + 45;
  }

  if (
    task.kind === "coverage" &&
    task.taskPlanMode === "competitor_map" &&
    (task.materializedChannelIds?.length || 0) > 0
  ) {
    return baseStageScore + 35;
  }

  if (task.kind === "coverage") {
    return baseStageScore + 15;
  }

  return baseStageScore;
}

function workspaceTaskFocusLabel(
  task: WorkspaceTask,
  copy: ReturnType<typeof getDashboardCopy>
) {
  if (task.kind === "proof" || task.stage === "live") {
    return copy.tasks.focusLabels.prove_now;
  }

  if (task.kind === "submission" || task.stage === "awaiting_effect") {
    return copy.tasks.focusLabels.watch_effect;
  }

  if (
    task.kind === "coverage" &&
    ((task.taskPlanMode === "competitor_map" &&
      (task.materializedChannelIds?.length || 0) > 0) ||
      task.sourcePlanId)
  ) {
    return copy.tasks.focusLabels.expand_lane;
  }

  return copy.tasks.focusLabels.build_queue;
}

function workspaceTaskBillingRule(
  task: WorkspaceTask,
  copy: ReturnType<typeof getDashboardCopy>
): WorkspaceTaskBillingRule {
  const premiumWatchlistTask =
    task.kind === "coverage" &&
    task.taskPlanMode === "import_list" &&
    task.sourcePlanId &&
    task.successCost === 1 &&
    task.failureCost === 1;

  if (premiumWatchlistTask) {
    return {
      type: "premium_service",
      badge: copy.tasks.billingLabels.premium_service,
      detail: copy.tasks.billingDetails.premium_service,
      successDisplay: copy.tasks.billingDisplays.premiumSuccess,
      failureDisplay: copy.tasks.billingDisplays.premiumFailure,
    };
  }

  if (task.kind === "submission" || task.kind === "proof") {
    return {
      type: "credit_on_success",
      badge: copy.tasks.billingLabels.credit_on_success,
      detail: copy.tasks.billingDetails.credit_on_success,
      successDisplay: String(task.successCost),
      failureDisplay: String(task.failureCost),
    };
  }

  return {
    type: "included",
    badge: copy.tasks.billingLabels.included,
    detail: copy.tasks.billingDetails.included,
    successDisplay: copy.tasks.billingDisplays.includedSuccess,
    failureDisplay: copy.tasks.billingDisplays.includedFailure,
  };
}

function weeklyBurnWeight(task: WorkspaceTask) {
  if (task.kind === "proof") {
    return {
      pending: 0.6,
      planned: 1,
      awaiting_effect: 0.5,
      live: 0.25,
    }[task.stage];
  }

  if (task.kind === "submission") {
    return {
      pending: 0.8,
      planned: 1,
      awaiting_effect: 0.25,
      live: 0,
    }[task.stage];
  }

  return 0;
}

function taskWeeklyBurnEstimate(task: WorkspaceTask) {
  if (task.billingRule?.type !== "credit_on_success") {
    return 0;
  }

  return Math.round(task.successCost * weeklyBurnWeight(task) * 10) / 10;
}

function formatCreditsEstimate(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function productBudgetDecision(args: {
  summary: ProductSummary;
  weeklyBurn: number;
  productTasks: WorkspaceTask[];
  currentPlan: string;
}): ProductBudgetDecision {
  const premiumTaskCount = args.productTasks.filter(
    (task) => task.billingRule?.type === "premium_service"
  ).length;

  if (
    premiumTaskCount > 0 &&
    args.summary.proof.counts.verify === 0 &&
    args.summary.proof.counts.close === 0
  ) {
    return { key: "hold_premium" };
  }

  if (
    args.currentPlan === "starter" &&
    args.weeklyBurn >= 8 &&
    (args.summary.launchCount >= 2 || args.summary.activeSubmission)
  ) {
    return { key: "upgrade_now" };
  }

  if (
    args.weeklyBurn >= 4 &&
    (args.summary.proof.priority !== "build_signal" ||
      args.summary.proof.counts.close > 0 ||
      args.summary.proof.counts.threads > 0)
  ) {
    return { key: "prove_first" };
  }

  if (args.weeklyBurn >= 3 && (args.summary.activeSubmission || args.summary.launchCount > 0)) {
    return { key: "watch_effect" };
  }

  return { key: "build_queue" };
}

function workspaceBurnNote(args: {
  locale: Locale;
  productName: string | null;
  decision: ProductBudgetDecision | null;
  fallback: string;
}) {
  if (!args.productName || !args.decision) {
    return args.fallback;
  }

  if (args.locale === "zh") {
    if (args.decision.key === "upgrade_now") {
      return `${args.productName} 的 burn 已经顶到升级线，先扩计划再继续加速。`;
    }
    if (args.decision.key === "prove_first") {
      return `先把 ${args.productName} 推成 proof，再继续烧 credits。`;
    }
    if (args.decision.key === "hold_premium") {
      return `${args.productName} 的高级机会先别开，先跑出普通 proof。`;
    }
    if (args.decision.key === "watch_effect") {
      return `先盯 ${args.productName} 这一轮见效，再决定要不要继续加任务。`;
    }
  } else {
    if (args.decision.key === "upgrade_now") {
      return `${args.productName} is already pushing past a comfortable Starter burn. Upgrade before accelerating further.`;
    }
    if (args.decision.key === "prove_first") {
      return `Turn ${args.productName} into proof before adding more burn.`;
    }
    if (args.decision.key === "hold_premium") {
      return `Keep the premium opportunities on ${args.productName} separate until the normal proof path lands.`;
    }
    if (args.decision.key === "watch_effect") {
      return `Let ${args.productName} land before opening more tasks.`;
    }
  }

  return args.fallback;
}

function productBudgetDecisionClasses(decision: ProductBudgetDecisionKey) {
  return {
    build_queue: "border-white/10 bg-white/[0.06] text-stone-200",
    watch_effect: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    prove_first: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    upgrade_now: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    hold_premium: "border-fuchsia-300/15 bg-fuchsia-300/[0.08] text-fuchsia-100",
  }[decision];
}

function budgetActionForSummary(args: {
  locale: Locale;
  summary: ProductSummary;
  decision: ProductBudgetDecision;
  currentPlan: string;
  productPolicy?:
    | WorkspacePolicyClientSnapshot["products"][number]
    | undefined;
}): BudgetAction {
  const proofAction =
    args.summary.proof.priority !== "build_signal"
      ? proofActionForSummary(args.summary, getProofBoardCopy(args.locale))
      : null;
  const launchAction = isLaunchAction(args.summary.primaryAction)
    ? args.summary.primaryAction
    : null;
  const linkAction = isLinkAction(args.summary.primaryAction)
    ? args.summary.primaryAction
    : null;
  const budgetLabels = getDashboardCopy(args.locale).productCard.budgetActions;
  const reclaimReason = args.productPolicy?.reclaimReason;

  if (reclaimReason === "settled_proof") {
    if (proofAction) {
      return {
        kind: "proof",
        label: budgetLabels.prove_first,
        proofAction,
      };
    }

    return {
      kind: "link",
      label: budgetLabels.watch_effect,
      href: `/dashboard/product/${args.summary.product.id}#submission-history`,
    };
  }

  if (reclaimReason === "stalled_pipeline") {
    if (proofAction) {
      return {
        kind: "proof",
        label: budgetLabels.prove_first,
        proofAction,
      };
    }

    return {
      kind: "link",
      label: getDashboardCopy(args.locale).productCard.open,
      href: `/dashboard/product/${args.summary.product.id}`,
    };
  }

  if (args.decision.key === "upgrade_now") {
    return {
      kind: "link",
      label: budgetLabels.upgrade_now,
      href:
        args.currentPlan === "starter"
          ? "/api/stripe/checkout?plan=growth"
          : "/api/stripe/checkout?plan=starter",
    };
  }

  if (args.decision.key === "prove_first") {
    if (proofAction) {
      return {
        kind: "proof",
        label: budgetLabels.prove_first,
        proofAction,
      };
    }

    return {
      kind: "link",
      label: budgetLabels.prove_first,
      href: `/dashboard/product/${args.summary.product.id}#proof-pipeline`,
    };
  }

  if (args.decision.key === "watch_effect") {
    return {
      kind: "link",
      label: budgetLabels.watch_effect,
      href: `/dashboard/product/${args.summary.product.id}#submission-history`,
    };
  }

  if (args.decision.key === "hold_premium") {
    return {
      kind: "link",
      label: budgetLabels.hold_premium,
      href: "#task-queue",
    };
  }

  if (launchAction) {
    return {
      kind: "launch",
      label: budgetLabels.build_queue,
      channelId: launchAction.channelId,
    };
  }

  return {
    kind: "link",
    label: budgetLabels.build_queue,
    href: linkAction?.href || `/dashboard/product/${args.summary.product.id}`,
  };
}

function workspaceStrategyModeClasses(mode: "unlock" | "upgrade" | "prove" | "watch" | "build") {
  return {
    unlock: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    upgrade: "border-rose-300/15 bg-rose-300/[0.08] text-rose-100",
    prove: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    watch: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    build: "border-white/10 bg-white/[0.06] text-stone-200",
  }[mode];
}

function workspaceStrategyLaneClasses(lane: WorkspaceStrategyLaneKey) {
  return {
    prove: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    watch: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    build: "border-white/10 bg-white/[0.06] text-stone-200",
    premium: "border-fuchsia-300/15 bg-fuchsia-300/[0.08] text-fuchsia-100",
  }[lane];
}

function workspaceCapacityPolicyClasses(policy: "unlock" | "tighten" | "balanced" | "expand") {
  return {
    unlock: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    tighten: "border-rose-300/15 bg-rose-300/[0.08] text-rose-100",
    balanced: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    expand: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
  }[policy];
}

function workspaceCapacityLaneClasses(lane: WorkspaceCapacityLaneKey) {
  return {
    submission: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    proof: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    premium: "border-fuchsia-300/15 bg-fuchsia-300/[0.08] text-fuchsia-100",
  }[lane];
}

function formatNaturalList(values: string[], locale: Locale) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (locale === "zh") {
    return values.join("、");
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function workspaceLaneReservationReason(
  lane: WorkspacePolicyLane,
  locale: Locale
) {
  if (locale === "zh") {
    return {
      submission:
        "新的 submission 开口优先给还需要 fresh live distribution 的产品，避免谁先点谁先占。",
      proof:
        "新的 proof 开口优先给最接近公开结果、但当前还没有活跃 proof push 的产品。",
      premium:
        "premium 开口只给已经跑出基础信号、且不会把主线 proof 稀释掉的产品。",
    }[lane];
  }

  return {
    submission:
      "New submission openings go to products that still need fresh live distribution instead of whoever clicks first.",
    proof:
      "New proof openings go to the product closest to visible proof that is not already carrying an active proof push.",
    premium:
      "Premium openings stay with products that can justify premium work without diluting the core proof path.",
  }[lane];
}

function workspaceLaneReservationEmpty(args: {
  lane: WorkspacePolicyLane;
  locale: Locale;
  hasRemaining: boolean;
}) {
  if (!args.hasRemaining) {
    return args.locale === "zh"
      ? "当前没有剩余开口。"
      : "No openings remain right now.";
  }

  return args.locale === "zh"
    ? "当前没有明确预留对象。"
    : "No product is explicitly holding the remaining opening right now.";
}

function workspaceLaneGuardMessage(args: {
  lane: WorkspacePolicyLane;
  locale: Locale;
  productId: string;
  workspacePolicy: WorkspacePolicyClientSnapshot;
  fullError: Record<WorkspacePolicyLane, string>;
}) {
  const laneState = args.workspacePolicy.capacity.lanes[args.lane];
  if (laneState.remaining <= 0) {
    return args.fullError[args.lane];
  }

  if (args.workspacePolicy.allowances[args.productId]?.[args.lane]) {
    return null;
  }

  const laneOwners = args.workspacePolicy.laneOwners[args.lane];
  if (laneOwners.length === 0) {
    return null;
  }

  const ownerLabel = formatNaturalList(
    laneOwners.slice(0, 2).map((owner) => owner.productName),
    args.locale
  );

  if (args.locale === "zh") {
    return {
      submission: `本周剩余的 submission 开口当前优先给 ${ownerLabel}。先让这些产品继续往前走，再在这里开新的提交任务。`,
      proof: `本周剩余的 proof 开口当前优先给 ${ownerLabel}。先把那边的结果推出来，再在这里排新的 proof。`,
      premium: `当前剩余的 premium 开口优先给 ${ownerLabel}。先让那边消化掉，再继续在这里开高级机会。`,
    }[args.lane];
  }

  return {
    submission: `This week's remaining submission openings are currently reserved for ${ownerLabel}. Let those products move first before opening another submission task here.`,
    proof: `This week's remaining proof opening is currently reserved for ${ownerLabel}. Push proof there first before queueing another proof task here.`,
    premium: `The remaining premium opening is currently reserved for ${ownerLabel}. Let that product use it first before opening premium work here.`,
  }[args.lane];
}

function workspaceSupplyReasonLabel(
  owner: WorkspaceSupplyOwnerSummary,
  locale: Locale
) {
  if (locale === "zh") {
    return {
      needs_first_signal: "这个产品还缺第一批真实结果，最适合先吃新增供给。",
      idle_lane: "它当前有空余执行位，继续补新供给不会把节奏打乱。",
      has_receipt_base: "它已经有基础回执，更适合承接下一层 buildout 供给。",
      proof_in_motion: "这条产品线已经有 proof 在动，先把供给集中在它身上更稳。",
      managed_inbox_ready: "托管发件身份已经就绪，适合先吃收费型和商务型机会。",
    }[owner.reason];
  }

  return {
    needs_first_signal:
      "This product still needs the first real signal, so it should absorb fresh supply first.",
    idle_lane:
      "This product has room in the execution lane, so fresh supply will not disrupt the current rhythm.",
    has_receipt_base:
      "This product already has a receipt base, which makes it the better home for buildout supply.",
    proof_in_motion:
      "Proof is already moving here, so concentrating new supply on this product is the more stable path.",
    managed_inbox_ready:
      "The managed inbox is ready here, so paid and commercial opportunities can land without extra setup.",
  }[owner.reason];
}

function workspaceReclaimGuidance(args: {
  locale: Locale;
  summary: ProductSummary;
  productPolicy:
    | WorkspacePolicyClientSnapshot["products"][number]
    | undefined;
}) {
  const reason = args.productPolicy?.reclaimReason;

  if (!reason) {
    return null;
  }

  const lastSignalLabel = args.productPolicy?.lastSignalAt
    ? formatDashboardDate(args.productPolicy.lastSignalAt, args.locale)
    : args.locale === "zh"
      ? "最近没有记录到新信号"
      : "No recent signal recorded";

  if (reason === "settled_proof") {
    return {
      tone: "border-emerald-300/15 bg-emerald-300/8 text-emerald-100",
      title:
        args.locale === "zh"
          ? "这个产品已经进入结果层，新的开口会先让给别的产品。"
          : "This product already reached the result layer, so fresh openings are being routed elsewhere.",
      body:
        args.locale === "zh"
          ? `最近信号：${lastSignalLabel}。现在更该盯住 proof 和生效结果，而不是继续往这里加新任务。`
          : `Latest signal: ${lastSignalLabel}. The better move now is watching proof and effect instead of opening more work here.`,
    };
  }

  const hasProofSignal =
    args.summary.proof.counts.receipts > 0 ||
    args.summary.proof.priority !== "build_signal";

  return {
    tone: "border-amber-300/15 bg-amber-300/8 text-amber-100",
    title:
      args.locale === "zh"
        ? "这条产品线停滞太久，系统先停止继续加量。"
        : "This product has been stalled too long, so the system is holding back fresh openings.",
    body:
      args.locale === "zh"
        ? hasProofSignal
          ? `最近信号：${lastSignalLabel}。先把现有 receipt 或 reply 推成 proof，再决定是否继续开新任务。`
          : `最近信号：${lastSignalLabel}。先换下一个产品拿新信号，不要继续把任务堆在这里。`
        : hasProofSignal
          ? `Latest signal: ${lastSignalLabel}. Turn the existing receipts or replies into proof before opening more work here.`
          : `Latest signal: ${lastSignalLabel}. Move to the next product and get a fresh signal instead of stacking more work here.`,
  };
}

function workspaceSupplyFocusCopy(args: {
  locale: Locale;
  workspaceSupply: WorkspaceSupplySnapshot;
}) {
  if (args.locale === "zh") {
    return {
      review_contract: {
        title: "先吸收能力合同，再动新增供给。",
        body: "能力合同刚变，先同步 required SaaS actions，避免前台宣称和真实能力继续漂移。",
      },
      unlock_plan: {
        title: "先完成解锁，不急着分配新增供给。",
        body: "免费层先把产品登记和路径看清楚。真正的自动供给分配要等 live execution 解锁后再放量。",
      },
      push_proof: {
        title: "先把现有 proof 推出来，再开新的自动供给。",
        body: "当前更值钱的是把正在接近结果的产品推到 proof，而不是继续铺新的 auto coverage。",
      },
      feed_proven: {
        title: "先把 proven 供给喂给当前优先产品。",
        body: "新增 discovery supply 先走 proven 市场，避免还没站稳就把精力分散到 buildout。",
      },
      expand_buildout: {
        title: "基础结果已成型，可以开始扩到 buildout 市场。",
        body: "当前 proven 供给已经有承接基础，可以让第二层 buildout 供给开始进入规划。",
      },
      prepare_premium: {
        title: "标准 proof 路径稳定后，再吃 premium 机会。",
        body: "收费型和商务型机会要继续独立处理，只让已准备好的产品先接这类供给。",
      },
      hold_supply: {
        title: "当前不该再自动开新供给。",
        body: "先把已有任务和结果节奏收住，再决定要不要继续开新的 auto coverage。",
      },
    }[args.workspaceSupply.focus];
  }

  return {
    review_contract: {
      title: "Absorb the capability contract before routing fresh supply.",
      body: "The capability contract changed. Sync the required SaaS actions first so public claims do not drift away from reality.",
    },
    unlock_plan: {
      title: "Unlock the execution layer before allocating fresh supply.",
      body: "The free layer should stage products and clarify the path first. Real auto-supply routing should open up after live execution is unlocked.",
    },
    push_proof: {
      title: "Push the current proof path before opening fresh auto supply.",
      body: "The higher-value move right now is turning existing proof candidates into results instead of opening another auto-coverage plan.",
    },
    feed_proven: {
      title: "Feed proven supply into the current priority product first.",
      body: "Fresh discovery supply should start in proven markets so the workspace does not spread itself across buildout lanes too early.",
    },
    expand_buildout: {
      title: "The base is stable enough to start expanding into buildout markets.",
      body: "Proven supply already has a base to land on, which means the next buildout layer can start entering the planning mix.",
    },
    prepare_premium: {
      title: "Only open premium opportunities after the standard proof path is stable.",
      body: "Paid and commercial opportunities should stay separate, with only prepared products taking that extra supply.",
    },
    hold_supply: {
      title: "Do not open more auto-generated supply right now.",
      body: "Let the current tasks and proof rhythm settle before creating another auto-coverage plan.",
    },
  }[args.workspaceSupply.focus];
}

function plannerSelectionStatusCopy(args: {
  locale: Locale;
  selectedProductName: string;
  recommendedProductName: string;
  followsRecommendation: boolean;
}) {
  if (args.locale === "zh") {
    return args.followsRecommendation
      ? {
          badge: "跟随当前优先产品",
          body: `系统当前把新增任务优先路由给 ${args.recommendedProductName}。你仍然可以手动切到别的有效产品。`,
        }
      : {
          badge: "手动切换中",
          body: `你当前手动选中了 ${args.selectedProductName}。系统建议仍然是 ${args.recommendedProductName}，但不会覆盖你的选择。`,
        };
  }

  return args.followsRecommendation
    ? {
        badge: "Following the current lead",
        body: `The workspace is routing new tasks into ${args.recommendedProductName} right now. You can still switch to another valid product manually.`,
      }
    : {
        badge: "Manual override",
        body: `You are currently building tasks for ${args.selectedProductName}. The workspace still recommends ${args.recommendedProductName}, but it will not override your choice.`,
      };
}

function workspaceLeadSummaryCopy(args: {
  locale: Locale;
  leadProductName: string;
  mode: "unlock" | "upgrade" | "prove" | "watch" | "build";
}) {
  if (args.locale === "zh") {
    return {
      unlock: `当前系统先把 ${args.leadProductName} 作为主产品，先完成第一条可执行路径的解锁。`,
      upgrade: `当前系统先把 ${args.leadProductName} 放在最前面，因为下一步价值更像升级而不是继续铺新任务。`,
      prove: `当前系统先推 ${args.leadProductName}，因为它最接近变成 proof。`,
      watch: `当前系统先盯 ${args.leadProductName}，因为它更该先看生效和结果信号。`,
      build: `当前系统先把新增任务喂给 ${args.leadProductName}，因为它最适合吸收本周新增供给。`,
    }[args.mode];
  }

  return {
    unlock: `${args.leadProductName} is the current lead because the workspace should unlock its first executable path before spreading wider.`,
    upgrade: `${args.leadProductName} is the current lead because the next move looks more like an upgrade decision than more task volume.`,
    prove: `${args.leadProductName} is the current lead because it is the closest product to turning into proof.`,
    watch: `${args.leadProductName} is the current lead because the better move is watching effect and result signals first.`,
    build: `${args.leadProductName} is the current lead because it is the best product to absorb this week's fresh supply.`,
  }[args.mode];
}

function withPriorityContext(href: string, productId: string, isCurrentPriority: boolean) {
  if (!isCurrentPriority) {
    return href;
  }

  const productPrefix = `/dashboard/product/${productId}`;
  if (!href.startsWith(productPrefix)) {
    return href;
  }

  const [pathWithQuery, hash = ""] = href.split("#");
  if (pathWithQuery.includes("priority=1")) {
    return href;
  }

  const joiner = pathWithQuery.includes("?") ? "&" : "?";
  return `${pathWithQuery}${joiner}priority=1${hash ? `#${hash}` : ""}`;
}

function workspaceAutoCoverageGuardMessage(args: {
  locale: Locale;
  productId: string;
  workspaceSupply: WorkspaceSupplySnapshot;
}) {
  if (args.workspaceSupply.reviewPending) {
    return args.locale === "zh"
      ? "能力合同刚变化，先吸收 required SaaS actions，再把新的 discovery supply 路由进 auto coverage。"
      : "The capability contract changed. Absorb the required SaaS actions before routing fresh discovery supply into another auto-coverage plan.";
  }

  if (args.workspaceSupply.focus === "push_proof") {
    return args.locale === "zh"
      ? "当前应该先把 proof 往前推，不要再开新的 auto coverage。"
      : "The workspace should push current proof work forward before opening another auto-coverage plan.";
  }

  const owner =
    (args.workspaceSupply.provenOwner &&
      args.workspaceSupply.provenOwner.productId ===
        args.workspaceSupply.recommendedAutoCoverageProductId
      ? args.workspaceSupply.provenOwner
      : null) ||
    (args.workspaceSupply.buildoutOwner &&
      args.workspaceSupply.buildoutOwner.productId ===
        args.workspaceSupply.recommendedAutoCoverageProductId
      ? args.workspaceSupply.buildoutOwner
      : null);
  if (
    !owner ||
    !args.workspaceSupply.recommendedAutoCoverageProductId ||
    owner.productId === args.productId
  ) {
    return null;
  }

  if (args.locale === "zh") {
    return `当前新增 discovery supply 优先分配给 ${owner.productName}。先让它吃下下一批 auto coverage，再决定是否切到这个产品。`;
  }

  return `Fresh discovery supply is currently routed to ${owner.productName}. Let that product absorb the next auto-coverage plan first.`;
}

function workspaceBuildoutGuardMessage(args: {
  locale: Locale;
  productId: string;
  workspaceSupply: WorkspaceSupplySnapshot;
}) {
  if (!args.workspaceSupply.release.buildout.open) {
    return workspaceSupplyReleaseReasonCopy({
      locale: args.locale,
      snapshot: args.workspaceSupply,
      tier: "buildout",
    });
  }

  const owner = args.workspaceSupply.buildoutOwner;
  if (
    !owner ||
    !args.workspaceSupply.release.buildout.recommendedProductId ||
    owner.productId === args.productId
  ) {
    return null;
  }

  if (args.locale === "zh") {
    return `当前 buildout 供给优先给 ${owner.productName}。先让它吃下下一批 buildout 任务，再在这里继续扩。`;
  }

  return `Buildout supply is currently routed to ${owner.productName}. Let that product absorb the next buildout wave first.`;
}

function workspaceSupplyReleaseLabel(args: {
  locale: Locale;
  open: boolean;
}) {
  if (args.locale === "zh") {
    return args.open ? "已放闸" : "暂缓释放";
  }

  return args.open ? "Release open" : "Held";
}

function workspaceSupplyReleaseClasses(open: boolean) {
  return open
    ? "border-emerald-300/15 bg-emerald-300/10 text-emerald-100"
    : "border-white/10 bg-white/[0.04] text-stone-300";
}

function workspaceSupplyReleaseReasonCopy(args: {
  locale: Locale;
  snapshot: WorkspaceSupplySnapshot;
  tier: "proven" | "buildout" | "premium";
}) {
  const reason = args.snapshot.release[args.tier].reason;

  if (args.locale === "zh") {
    return {
      review_pending: "能力合同刚变化，先完成吸收动作，再放出这一层供给。",
      unlock_required:
        args.tier === "proven"
          ? "先解锁 live execution，再让系统自动分配新的 discovery supply。"
          : "这层供给要等更高计划或更完整执行层解锁后再放开。",
      capacity_full: "当前这条执行开口已经满了，先让现有任务消化掉。",
      proof_priority: "当前更值钱的是先把 proof 往前推，不该继续放这层供给。",
      missing_owner: "当前没有产品具备承接这一层供给的条件。",
      awaiting_proven_base:
        "标准 proven 基础还不够稳，这一层供给暂时不该放开。",
      awaiting_premium_base:
        "proof 和 receipt 基础还不够强，这一层 premium 供给先继续关着。",
      history_unstable:
        "最近的能力历史还不稳定，先把合同和产品面同步稳定下来，再继续释放这一层供给。",
      ready:
        "这层供给已经满足放闸条件，可以开始向当前优先产品分配。",
    }[reason];
  }

  return {
    review_pending:
      "The capability contract just changed. Absorb the review actions before releasing this supply layer.",
    unlock_required:
      args.tier === "proven"
        ? "Unlock live execution before the system starts routing fresh discovery supply automatically."
        : "This layer stays closed until the higher plan or deeper execution layer is unlocked.",
    capacity_full:
      "This execution lane is already full right now, so let the current work land first.",
    proof_priority:
      "The higher-value move right now is pushing proof forward instead of releasing this layer.",
    missing_owner:
      "No product is ready to absorb this supply layer yet.",
    awaiting_proven_base:
      "The standard proven base is not stable enough yet, so this layer should stay closed.",
    awaiting_premium_base:
      "The proof and receipt base is not strong enough yet, so premium supply should stay closed.",
    history_unstable:
      "Recent capability history is still unstable, so stabilize the contract and product surfaces before releasing this supply layer.",
    ready:
      "This supply layer is ready to open and can start flowing into the current priority product.",
  }[reason];
}

function workspaceOwnershipSummary(
  lanes: WorkspacePolicyLane[],
  locale: Locale
) {
  if (lanes.length === 0) {
    return null;
  }

  const laneLabels =
    locale === "zh"
      ? {
          submission: "Submission 开口",
          proof: "Proof 开口",
          premium: "Premium 开口",
        }
      : {
          submission: "Submission opening",
          proof: "Proof opening",
          premium: "Premium opening",
        };

  const label = formatNaturalList(lanes.map((lane) => laneLabels[lane]), locale);

  return locale === "zh"
    ? `这个产品当前拿到了本周剩余的 ${label} 优先权。`
    : `This product currently owns the remaining ${label} for this week.`;
}

function discoveryMarketToneClasses(
  tone: "proven" | "buildout" | "watchlist" | "feature"
) {
  return {
    proven: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    buildout: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    watchlist: "border-white/10 bg-white/[0.06] text-stone-200",
    feature: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
  }[tone];
}

function formatFingerprint(value: string) {
  if (!value) {
    return "n/a";
  }

  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function capabilityHistoryToneClasses(entry: SaasCapabilityHistoryEntry) {
  if (entry.capabilities_changed || entry.requires_saas_review) {
    return "border-amber-300/15 bg-amber-300/[0.06] text-amber-100";
  }
  return "border-white/10 bg-white/[0.04] text-stone-200";
}

function formatMarketChips(
  markets: OperationalInsightsDiscoveryMarket[],
  fallbackLanguages: string[],
  locale: Locale
) {
  if (markets.length > 0) {
    return markets.map((market) => market.market_label);
  }

  return fallbackLanguages.map((language) =>
    locale === "zh" ? `${language.toUpperCase()} 市场` : `${language.toUpperCase()} market`
  );
}

function proofTaskTitle(
  type: ProductProofAction["taskType"],
  locale: Locale
) {
  const labels =
    locale === "zh"
      ? {
          verify_result: "验证结果",
          protect_publication: "守住待发布机会",
          send_materials: "补齐资料",
          review_commercial: "评估商务条件",
          follow_up: "继续跟进",
          push_receipts: "推进回执证明",
        }
      : {
          verify_result: "Verify result",
          protect_publication: "Protect publication",
          send_materials: "Send materials",
          review_commercial: "Review commercial terms",
          follow_up: "Follow up",
          push_receipts: "Push receipts",
        };

  return labels[type];
}

function submissionTaskStage(
  summary: ProductSummary,
  submission: Submission
): WorkspaceTaskStage {
  if (summary.proof.counts.verify > 0) {
    return "live";
  }

  if (
    submission.status === "completed" ||
    submission.status === "failed" ||
    submission.success_sites > 0
  ) {
    return "awaiting_effect";
  }

  if (submission.status === "running") {
    return "planned";
  }

  return "pending";
}

function describeCompetitorPlanExecution(args: {
  locale: Locale;
  plan: WorkspaceTaskPlan;
  summary: ProductSummary;
  workspaceTaskPlans: WorkspaceTaskPlan[];
}) {
  const linkedSubmissions = args.summary.submissions.filter((submission) =>
    (args.plan.materializedChannelIds || []).includes(submission.channel)
  );
  const linkedChildPlans = (args.plan.childPlanIds || [])
    .map((planId) => args.workspaceTaskPlans.find((plan) => plan.id === planId))
    .filter((plan): plan is WorkspaceTaskPlan => Boolean(plan));
  const fallbackChildPlans = args.workspaceTaskPlans.filter(
    (plan) =>
      plan.sourcePlanId === args.plan.id &&
      !linkedChildPlans.some((childPlan) => childPlan.id === plan.id)
  );
  const childPlans = [...linkedChildPlans, ...fallbackChildPlans];
  const stageCounts = {
    pending: 0,
    planned: 0,
    awaiting_effect: 0,
    live: 0,
  } satisfies Record<WorkspaceTaskStage, number>;

  linkedSubmissions.forEach((submission) => {
    stageCounts[submissionTaskStage(args.summary, submission)] += 1;
  });

  const paidWatchlistTargets = childPlans
    .filter((plan) => plan.title === "Paid opportunity watchlist")
    .reduce((sum, plan) => sum + plan.targets.length, 0);
  const channelNames = Array.from(
    new Set(
      linkedSubmissions.map((submission) => {
        const channel =
          CHANNELS.find((item) => item.id === submission.channel) || null;
        return channel
          ? getLocalizedChannel(channel, args.locale).name
          : submission.channel;
      })
    )
  );

  let stage = args.plan.stage;
  if (stageCounts.live > 0) {
    stage = "live";
  } else if (stageCounts.awaiting_effect > 0) {
    stage = "awaiting_effect";
  } else if (stageCounts.planned > 0) {
    stage = "planned";
  } else if (
    stageCounts.pending > 0 ||
    childPlans.length > 0 ||
    args.plan.stage === "pending"
  ) {
    stage = "pending";
  }

  if (linkedSubmissions.length === 0 && paidWatchlistTargets === 0) {
    return {
      stage,
      preview: args.plan.summary,
    };
  }

  const statusSegments =
    args.locale === "zh"
      ? [
          stageCounts.pending > 0 ? `${stageCounts.pending} 条待启动` : null,
          stageCounts.planned > 0 ? `${stageCounts.planned} 条计划中` : null,
          stageCounts.awaiting_effect > 0
            ? `${stageCounts.awaiting_effect} 条待生效`
            : null,
          stageCounts.live > 0 ? `${stageCounts.live} 条已生效` : null,
        ].filter(Boolean)
      : [
          stageCounts.pending > 0 ? `${stageCounts.pending} pending` : null,
          stageCounts.planned > 0 ? `${stageCounts.planned} in progress` : null,
          stageCounts.awaiting_effect > 0
            ? `${stageCounts.awaiting_effect} awaiting effect`
            : null,
          stageCounts.live > 0 ? `${stageCounts.live} live` : null,
        ].filter(Boolean);

  if (args.locale === "zh") {
    if (linkedSubmissions.length === 0) {
      return {
        stage,
        preview: `这份竞品规划已生成 ${paidWatchlistTargets} 个付费机会跟踪项，live 渠道没有新增排队。`,
      };
    }

    return {
      stage,
      preview: `这份竞品规划已转成 ${linkedSubmissions.length} 条执行任务（${channelNames
        .slice(0, 3)
        .join("、")}）。当前：${statusSegments.join("，")}。${
        paidWatchlistTargets > 0
          ? `另有 ${paidWatchlistTargets} 个付费机会进入 watchlist。`
          : ""
      }`,
    };
  }

  if (linkedSubmissions.length === 0) {
    return {
      stage,
      preview: `This competitor plan already created ${paidWatchlistTargets} paid opportunity watchlist items, but no new live lanes had to be queued.`,
    };
  }

  return {
    stage,
    preview: `This competitor plan has already turned into ${linkedSubmissions.length} execution tasks (${channelNames
      .slice(0, 3)
      .join(", ")}). Current state: ${statusSegments.join(", ")}.${
      paidWatchlistTargets > 0
        ? ` ${paidWatchlistTargets} paid opportunities are also in the watchlist.`
        : ""
    }`,
  };
}

function proofTaskStage(
  status: "queued" | "in_progress" | "proved" | "dropped"
): WorkspaceTaskStage {
  if (status === "proved") {
    return "live";
  }

  if (status === "in_progress") {
    return "planned";
  }

  if (status === "dropped") {
    return "awaiting_effect";
  }

  return "pending";
}

function taskEconomics(args: {
  kind: WorkspaceTaskKind;
  channelId?: string;
  proofType?: ProductProofAction["taskType"];
}) {
  if (args.kind === "profile" || args.kind === "coverage") {
    return { successCost: 0, failureCost: 0 };
  }

  if (args.kind === "submission") {
    if (args.channelId === "stealth") {
      return { successCost: 4, failureCost: 1 };
    }
    return { successCost: 3, failureCost: 1 };
  }

  if (args.proofType === "verify_result" || args.proofType === "protect_publication") {
    return { successCost: 2, failureCost: 1 };
  }

  if (args.proofType === "review_commercial") {
    return { successCost: 1, failureCost: 1 };
  }

  return { successCost: 2, failureCost: 1 };
}

function getOutcomeStage(summary: ProductSummary): OutcomeStage {
  if (summary.proof.counts.verify > 0) {
    return "proved";
  }

  if (summary.proof.counts.close > 0) {
    return "close";
  }

  if (summary.proof.counts.threads > 0) {
    return "threads";
  }

  if (summary.proof.counts.receipts > 0) {
    return "receipts";
  }

  if (summary.launchCount > 0 || summary.activeSubmission) {
    return "launched";
  }

  return "staged";
}

function getOutcomeStageRank(stage: OutcomeStage) {
  return {
    staged: 0,
    launched: 1,
    receipts: 2,
    threads: 3,
    close: 4,
    proved: 5,
  }[stage];
}

function proofPriorityClasses(priority: ProductProofPriority) {
  const classes: Record<ProductProofPriority, string> = {
    verify_published: "border-lime-300/15 bg-lime-300/[0.08] text-lime-100",
    protect_publication:
      "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    send_materials: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    review_commercial:
      "border-fuchsia-300/15 bg-fuchsia-300/[0.08] text-fuchsia-100",
    hold_review: "border-sky-300/15 bg-sky-300/[0.08] text-sky-100",
    push_receipts: "border-white/10 bg-white/[0.06] text-stone-100",
    build_signal: "border-white/10 bg-white/[0.04] text-stone-300",
  };

  return classes[priority];
}

function proofActionForSummary(
  summary: ProductSummary,
  proofCopy: ReturnType<typeof getProofBoardCopy>
): ProductProofAction {
  const baseHref = `/dashboard/product/${summary.product.id}`;
  const activeTask = summary.proof.activeTask;

  if (summary.proof.priority === "verify_published") {
    if (activeTask?.type === "verify_result") {
      return {
        href: `${baseHref}#proof-pipeline`,
        label: proofCopy.actionLabels.open_active,
        taskType: "verify_result",
        mode: "open",
      };
    }
    return {
      href: `${baseHref}#proof-pipeline`,
      label: proofCopy.actionLabels.verify_published,
      taskType: "verify_result",
      mode: "queue",
    };
  }

  if (summary.proof.priority === "protect_publication") {
    if (activeTask?.type === "protect_publication") {
      return {
        href: `${baseHref}#managed-inbox`,
        label: proofCopy.actionLabels.open_active,
        taskType: "protect_publication",
        mode: "open",
      };
    }
    return {
      href: `${baseHref}#managed-inbox`,
      label: proofCopy.actionLabels.protect_publication,
      taskType: "protect_publication",
      mode: "queue",
    };
  }

  if (summary.proof.priority === "send_materials") {
    if (activeTask?.type === "send_materials") {
      return {
        href: `${baseHref}#managed-inbox`,
        label: proofCopy.actionLabels.open_active,
        taskType: "send_materials",
        mode: "open",
      };
    }
    return {
      href: `${baseHref}#managed-inbox`,
      label: proofCopy.actionLabels.send_materials,
      taskType: "send_materials",
      mode: "queue",
    };
  }

  if (summary.proof.priority === "review_commercial") {
    if (activeTask?.type === "review_commercial") {
      return {
        href: `${baseHref}#managed-inbox`,
        label: proofCopy.actionLabels.open_active,
        taskType: "review_commercial",
        mode: "open",
      };
    }
    return {
      href: `${baseHref}#managed-inbox`,
      label: proofCopy.actionLabels.review_commercial,
      taskType: "review_commercial",
      mode: "queue",
    };
  }

  if (summary.proof.priority === "hold_review") {
    if (activeTask?.type === "follow_up") {
      return {
        href: `${baseHref}#managed-inbox`,
        label: proofCopy.actionLabels.open_active,
        taskType: "follow_up",
        mode: "open",
      };
    }
    return {
      href: `${baseHref}#managed-inbox`,
      label: proofCopy.actionLabels.hold_review,
      taskType: "follow_up",
      mode: "queue",
    };
  }

  if (summary.proof.priority === "push_receipts") {
    if (activeTask?.type === "push_receipts") {
      return {
        href: `${baseHref}#proof-pipeline`,
        label: proofCopy.actionLabels.open_active,
        taskType: "push_receipts",
        mode: "open",
      };
    }
    return {
      href: `${baseHref}#proof-pipeline`,
      label: proofCopy.actionLabels.push_receipts,
      taskType: "push_receipts",
      mode: "queue",
    };
  }

  return {
    href: baseHref,
    label: proofCopy.actionLabels.build_signal,
    taskType: "push_receipts",
    mode: "open",
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
  const parsed = new Date(date.includes("T") ? date : date.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return date || "—";
  }
  return parsed.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProofTaskStatusLabel(
  status: "queued" | "in_progress" | "proved" | "dropped",
  proofCopy: ReturnType<typeof getProofBoardCopy>
) {
  return proofCopy.taskStatus[status as keyof typeof proofCopy.taskStatus] || status;
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
  productProofSummaries,
  capabilityContract,
  capabilityHistory,
  capabilityReviewState,
  operationalInsights,
  workspaceSupply,
  workspaceTaskPlans,
  workspacePolicy,
  checkoutState,
}: DashboardClientProps) {
  const copy = getDashboardCopy(locale);
  const todayBriefCopy = getTodayBriefCopy(locale);
  const proofCopy = getProofBoardCopy(locale);
  const outcomeCopy = getOutcomeLadderCopy(locale);
  const workflowCopy = copy.workflow;
  const taskQueueCopy = copy.tasks;
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
  const [proofActionKey, setProofActionKey] = useState<string | null>(null);
  const [workspaceActionError, setWorkspaceActionError] = useState("");
  const [plannerProductId, setPlannerProductId] = useState(
    workspaceSupply.recommendedAutoCoverageProductId || products[0]?.id || ""
  );
  const [importList, setImportList] = useState("");
  const [competitorList, setCompetitorList] = useState("");
  const [importGranularity, setImportGranularity] =
    useState<WorkspaceTaskPlanGranularity>("batch");
  const [builderAction, setBuilderAction] = useState<
    "auto" | "competitor" | "import" | null
  >(null);
  const [builderError, setBuilderError] = useState("");
  const [materializingPlanId, setMaterializingPlanId] = useState<string | null>(
    null
  );
  const [capabilityReview, setCapabilityReview] =
    useState<SaasCapabilityReviewState>(capabilityReviewState);
  const [capabilityReviewAction, setCapabilityReviewAction] = useState(false);
  const [capabilityReviewError, setCapabilityReviewError] = useState("");
  const previousRecommendedPlannerProductId = useRef(
    workspaceSupply.recommendedAutoCoverageProductId || products[0]?.id || ""
  );

  useEffect(() => {
    setCapabilityReview(capabilityReviewState);
  }, [capabilityReviewState]);

  useEffect(() => {
    if (!products.some((product) => product.id === plannerProductId)) {
      setPlannerProductId(
        workspaceSupply.recommendedAutoCoverageProductId || products[0]?.id || ""
      );
    }
  }, [plannerProductId, products, workspaceSupply.recommendedAutoCoverageProductId]);

  const isPaid = subscription?.status === "active";
  const currentPlan = isPaid ? subscription?.plan || "starter" : "free";
  const planName = formatPlanName(currentPlan, locale);
  const proofSummaryByProductId = new Map(
    productProofSummaries.map((summary) => [summary.productId, summary])
  );
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
  const discoveryProgressTarget =
    operationalInsights.discovery_target_new_worthy_root_domains;
  const discoveryProgressCount =
    operationalInsights.discovery_counted_new_worthy_root_domain_count;
  const discoveryProgressPercent =
    discoveryProgressTarget > 0
      ? Math.min(
          100,
          Math.round((discoveryProgressCount / discoveryProgressTarget) * 100)
        )
      : 0;
  const capabilityReviewPending = capabilityReview.reviewPending;
  const capabilityFingerprint = formatFingerprint(
    capabilityContract.capability_fingerprint
  );
  const provenMarkets = formatMarketChips(
    operationalInsights.discovery_proven_markets,
    capabilityContract.market_tiers.proven_languages,
    locale
  );
  const buildoutMarkets = formatMarketChips(
    operationalInsights.discovery_priority_buildout_markets,
    capabilityContract.market_tiers.buildout_languages,
    locale
  );
  const watchlistMarkets = formatMarketChips(
    operationalInsights.discovery_watchlist_markets,
    capabilityContract.market_tiers.watchlist_languages,
    locale
  );
  const anchorMarkets = operationalInsights.discovery_anchor_markets.length
    ? operationalInsights.discovery_anchor_markets
    : capabilityContract.product_claim_policy.anchor_markets;
  const hasLanguageAdaptiveCopyCapability =
    capabilityContract.reusable_capability_ids.includes(
      "language_adaptive_submission_copy"
    );
  const capabilityCurrentFocus =
    capabilityContract.team_handoff_summary.current_focus ||
    capabilityContract.team_handoff_summary.one_line ||
    operationalInsights.discovery_market_claim_rule;
  const requiredCapabilityActions = capabilityReviewPending
    ? capabilityContract.required_saas_actions.slice(0, 4)
    : [];
  const capabilitySurfaces = capabilityContract.product_surfaces_to_sync.slice(0, 6);
  const capabilityCopyGuidance = capabilityContract.copy_update_guidance;
  const recentCapabilityHistory = capabilityHistory.history.slice(0, 4);
  const productPolicyById = new Map(
    workspacePolicy.products.map((product) => [product.productId, product] as const)
  );

  async function acknowledgeCapabilityContractReview() {
    setCapabilityReviewAction(true);
    setCapabilityReviewError("");

    try {
      const response = await fetch("/api/capability-contract/review", {
        method: "POST",
      });
      const data = (await response.json()) as
        | { reviewState?: SaasCapabilityReviewState; error?: string }
        | null;

      if (!response.ok || !data?.reviewState) {
        throw new Error(data?.error || copy.discovery.acknowledgeError);
      }

      setCapabilityReview(data.reviewState);
      router.refresh();
    } catch (error) {
      setCapabilityReviewError(
        error instanceof Error ? error.message : copy.discovery.acknowledgeError
      );
    } finally {
      setCapabilityReviewAction(false);
    }
  }

  const productSummaries: ProductSummary[] = products.map((product) => {
    const productSubmissions = submissions.filter(
      (submission) => submission.product_id === product.id
    );
    const proof =
      proofSummaryByProductId.get(product.id) || {
        productId: product.id,
        counts: {
          receipts: 0,
          threads: 0,
          close: 0,
          verify: 0,
        },
        priority: "build_signal" as const,
        topStage: null,
        score: 0,
        lastSignalAt: null,
        candidateLabels: [],
        activeTask: null,
        latestTask: null,
      };
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
      proof,
    };
  });
  const proofLedProducts = productSummaries
    .filter(
      (summary) =>
        summary.proof.priority !== "build_signal" || summary.proof.score > 0
    )
    .slice()
    .sort((left, right) => {
      if (right.proof.score !== left.proof.score) {
        return right.proof.score - left.proof.score;
      }
      return (right.proof.lastSignalAt || "").localeCompare(
        left.proof.lastSignalAt || ""
      );
    });
  const topProofProducts = proofLedProducts.slice(0, 3);
  const outcomeLeaders = productSummaries
    .slice()
    .sort((left, right) => {
      const leftStage = getOutcomeStage(left);
      const rightStage = getOutcomeStage(right);
      const rankDelta =
        getOutcomeStageRank(rightStage) - getOutcomeStageRank(leftStage);

      if (rankDelta !== 0) {
        return rankDelta;
      }

      if (right.proof.score !== left.proof.score) {
        return right.proof.score - left.proof.score;
      }

      return (right.proof.lastSignalAt || "").localeCompare(
        left.proof.lastSignalAt || ""
      );
    });
  const outcomeStageCounts = productSummaries.reduce(
    (counts, summary) => {
      const stage = getOutcomeStage(summary);
      counts[stage] += 1;
      return counts;
    },
    {
      staged: 0,
      launched: 0,
      receipts: 0,
      threads: 0,
      close: 0,
      proved: 0,
    } satisfies Record<OutcomeStage, number>
  );
  const workspaceProofStats = productSummaries.reduce(
    (totals, summary) => ({
      receipts: totals.receipts + summary.proof.counts.receipts,
      threads: totals.threads + summary.proof.counts.threads,
      close: totals.close + summary.proof.counts.close,
      verify: totals.verify + summary.proof.counts.verify,
    }),
    {
      receipts: 0,
      threads: 0,
      close: 0,
      verify: 0,
    }
  );
  const globalProofPriority =
    topProofProducts[0]?.proof.priority || ("build_signal" as const);
  const actionableProofProducts = topProofProducts.filter(
    (summary) => !productPolicyById.get(summary.product.id)?.reclaimReason
  );
  const actionableProductSummaries = productSummaries.filter(
    (summary) => !productPolicyById.get(summary.product.id)?.reclaimReason
  );
  const featuredCandidates =
    actionableProductSummaries.length > 0
      ? actionableProductSummaries
      : productSummaries;
  const featuredProduct =
    actionableProofProducts[0] ||
    featuredCandidates.find((summary) => summary.activeSubmission) ||
    featuredCandidates.find((summary) => summary.stage === "ready") ||
    featuredCandidates.find((summary) => summary.stage === "unlock") ||
    featuredCandidates[0] ||
    null;
  const topProofAction =
    actionableProofProducts[0]
      ? proofActionForSummary(actionableProofProducts[0], proofCopy)
      : null;
  const featuredProofAction =
    featuredProduct && featuredProduct.proof.priority !== "build_signal"
      ? proofActionForSummary(featuredProduct, proofCopy)
      : null;
  const featuredLaunchAction =
    featuredProduct && isLaunchAction(featuredProduct.primaryAction)
      ? featuredProduct.primaryAction
      : null;
  const importLineCount = importList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const competitorLineCount = competitorList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const workspaceTaskPlanById = new Map(
    workspaceTaskPlans.map((plan) => [plan.id, plan])
  );
  const allWorkspaceTasks = productSummaries
    .flatMap((summary) => {
      const tasks: WorkspaceTask[] = [];
      const baseHref = `/dashboard/product/${summary.product.id}`;
      const taskPlans = workspaceTaskPlans.filter(
        (plan) => plan.productId === summary.product.id
      );

      taskPlans.forEach((plan) => {
        const economics = taskEconomics({ kind: "coverage" });
        const sourcePlan = plan.sourcePlanId
          ? workspaceTaskPlanById.get(plan.sourcePlanId) || null
          : null;
        const competitorExecution =
          plan.mode === "competitor_map"
            ? describeCompetitorPlanExecution({
                locale,
                plan,
                summary,
                workspaceTaskPlans: taskPlans,
              })
            : null;
        if (plan.granularity === "per_target") {
          plan.targets.slice(0, 3).forEach((target) => {
            tasks.push({
              id: `${plan.id}:${target.id}`,
              productId: summary.product.id,
              productName: summary.product.name,
              kind: "coverage",
              taskPlanId: plan.id,
              taskPlanMode: plan.mode,
              sourcePlanId: plan.sourcePlanId,
              sourcePlanTitle: sourcePlan?.title || null,
              materializedChannelIds: plan.materializedChannelIds || [],
              childPlanIds: plan.childPlanIds || [],
              stage: plan.stage,
              title:
                locale === "zh"
                  ? `导入目标：${target.label}`
                  : `Imported target: ${target.label}`,
              preview: target.detail || plan.summary,
              href: "/dashboard#task-builder",
              updatedAt: plan.updatedAt,
              successCost: plan.successCost,
              failureCost: plan.failureCost,
              coverageBreakdown: null,
            });
          });
          return;
        }

        tasks.push({
          id: plan.id,
          productId: summary.product.id,
          productName: summary.product.name,
          kind: "coverage",
          taskPlanId: plan.id,
          taskPlanMode: plan.mode,
          sourcePlanId: plan.sourcePlanId,
          sourcePlanTitle: sourcePlan?.title || null,
          materializedChannelIds: plan.materializedChannelIds || [],
          childPlanIds: plan.childPlanIds || [],
          stage: competitorExecution?.stage || plan.stage,
          title: plan.title,
          preview: competitorExecution?.preview || plan.summary,
          href: "/dashboard#task-builder",
          updatedAt: plan.updatedAt,
          successCost: plan.successCost,
          failureCost: plan.failureCost,
          coverageBreakdown: plan.coverageBreakdown,
        });
      });

      if (summary.submissions.length === 0) {
        const economics = taskEconomics({ kind: "profile" });
        tasks.push({
          id: `profile:${summary.product.id}`,
          productId: summary.product.id,
          productName: summary.product.name,
          kind: "profile",
          taskPlanId: null,
          taskPlanMode: null,
          sourcePlanId: null,
          sourcePlanTitle: null,
          materializedChannelIds: [],
          childPlanIds: [],
          stage: summary.product.status === "draft" ? "pending" : "planned",
          title:
            locale === "zh"
              ? `登记 ${summary.product.name}`
              : `Set up ${summary.product.name}`,
          preview:
            summary.product.description ||
            (locale === "zh"
              ? "先确认首页解析结果，再进入第一条渠道。"
              : "Confirm the parsed homepage profile before launching the first lane."),
          href: baseHref,
          updatedAt: summary.product.created_at,
          ...economics,
          coverageBreakdown: null,
        });
      }

      summary.submissions.slice(0, 2).forEach((submission) => {
        const channel =
          CHANNELS.find((item) => item.id === submission.channel) || null;
        const localizedChannel = channel
          ? getLocalizedChannel(channel, locale).name
          : submission.channel;
        const economics = taskEconomics({
          kind: "submission",
          channelId: submission.channel,
        });
        const stage = submissionTaskStage(summary, submission);
        const preview =
          stage === "pending"
            ? locale === "zh"
              ? `${localizedChannel} 已排入队列，等待开始。`
              : `${localizedChannel} is queued and waiting to start.`
            : stage === "planned"
              ? locale === "zh"
                ? `${submission.completed_sites}/${submission.total_sites} 已处理，任务还在推进。`
                : `${submission.completed_sites}/${submission.total_sites} processed and still moving.`
              : stage === "awaiting_effect"
                ? locale === "zh"
                  ? `${submission.success_sites} 个成功动作已落地，接下来等回复或公开结果。`
                  : `${submission.success_sites} successful actions landed. Now wait for replies or public proof.`
                : locale === "zh"
                  ? `这批 ${localizedChannel} 已经进入结果层。`
                  : `This ${localizedChannel} batch is already feeding the result layer.`;

        tasks.push({
          id: `submission:${submission.id}`,
          productId: summary.product.id,
          productName: summary.product.name,
          kind: "submission",
          taskPlanId: null,
          taskPlanMode: null,
          sourcePlanId: null,
          sourcePlanTitle: null,
          materializedChannelIds: [],
          childPlanIds: [],
          stage,
          title:
            locale === "zh"
              ? `${localizedChannel} 批任务`
              : `${localizedChannel} batch`,
          preview,
          href: `${baseHref}#submission-history`,
          updatedAt: submission.created_at,
          ...economics,
          coverageBreakdown: null,
        });
      });

      const proofTask = summary.proof.activeTask || summary.proof.latestTask;
      if (proofTask) {
        const economics = taskEconomics({
          kind: "proof",
          proofType: proofTask.type,
        });

        tasks.push({
          id: `proof:${summary.product.id}:${proofTask.id}`,
          productId: summary.product.id,
          productName: summary.product.name,
          kind: "proof",
          taskPlanId: null,
          taskPlanMode: null,
          sourcePlanId: null,
          sourcePlanTitle: null,
          materializedChannelIds: [],
          childPlanIds: [],
          stage: proofTaskStage(proofTask.status),
          title: proofTaskTitle(proofTask.type, locale),
          preview:
            summary.proof.candidateLabels[0] ||
            (locale === "zh"
              ? "把最接近结果的线程往前推进。"
              : "Push the thread that is closest to a visible result."),
          href: `${baseHref}#proof-pipeline`,
          updatedAt: proofTask.updatedAt || proofTask.createdAt,
          ...economics,
          coverageBreakdown: null,
        });
      }

      return tasks;
    })
    .map((task) => ({
      ...task,
      focusLabel: workspaceTaskFocusLabel(task, copy),
      billingRule: workspaceTaskBillingRule(task, copy),
    }))
    .slice()
    .sort((left, right) => {
      const priorityDelta =
        workspaceTaskPriorityScore(right) - workspaceTaskPriorityScore(left);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const stageDelta =
        workspaceTaskStageRank(right.stage) - workspaceTaskStageRank(left.stage);

      if (stageDelta !== 0) {
        return stageDelta;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  const productWeeklyBurnById = new Map<string, number>();
  const productTasksById = new Map<string, WorkspaceTask[]>();

  allWorkspaceTasks.forEach((task) => {
    const current = productWeeklyBurnById.get(task.productId) || 0;
    productWeeklyBurnById.set(
      task.productId,
      Math.round((current + taskWeeklyBurnEstimate(task)) * 10) / 10
    );
    const productTasks = productTasksById.get(task.productId) || [];
    productTasks.push(task);
    productTasksById.set(task.productId, productTasks);
  });

  const workspaceWeeklyBurn = Math.round(
    Array.from(productWeeklyBurnById.values()).reduce((sum, value) => sum + value, 0) *
      10
  ) / 10;
  const workspaceTasks = allWorkspaceTasks.slice(0, 8);
  const productBudgetDecisionById = new Map(
    productSummaries.map((summary) => {
      const weeklyBurn = productWeeklyBurnById.get(summary.product.id) || 0;
      return [
        summary.product.id,
        productBudgetDecision({
          summary,
          weeklyBurn,
          productTasks: productTasksById.get(summary.product.id) || [],
          currentPlan,
        }),
      ] as const;
    })
  );
  const workspaceStrategy = buildWorkspaceStrategy({
    currentPlan,
    products: productSummaries.map((summary) => ({
      productId: summary.product.id,
      productName: summary.product.name,
      weeklyBurn: productWeeklyBurnById.get(summary.product.id) || 0,
      budgetDecision:
        productBudgetDecisionById.get(summary.product.id)?.key || "build_queue",
      proofPriority: summary.proof.priority,
      proofCounts: summary.proof.counts,
    })),
  });
  const workspaceStrategyCopy = copy.strategy;
  const workspaceCapacity = workspacePolicy.capacity;
  const workspaceCapacityCopy = copy.capacity;
  const workspaceStrategyLead =
    productSummaries.find(
      (summary) =>
        summary.product.id === workspaceStrategy.leadProductId &&
        !productPolicyById.get(summary.product.id)?.reclaimReason
    ) || featuredProduct;
  const recommendedPlannerProductId =
    workspaceStrategyLead?.product.id ||
    workspaceSupply.recommendedAutoCoverageProductId ||
    featuredProduct?.product.id ||
    products[0]?.id ||
    "";
  const plannerProductExists = plannerProductId
    ? products.some((product) => product.id === plannerProductId)
    : false;
  const plannerProductReclaimed = plannerProductId
    ? Boolean(productPolicyById.get(plannerProductId)?.reclaimReason)
    : false;
  const resolvedPlannerProductId =
    plannerProductExists && !plannerProductReclaimed
      ? plannerProductId
      : recommendedPlannerProductId;
  const resolvedPlannerSummary =
    productSummaries.find((summary) => summary.product.id === resolvedPlannerProductId) ||
    null;
  const recommendedPlannerSummary =
    productSummaries.find(
      (summary) => summary.product.id === recommendedPlannerProductId
    ) || resolvedPlannerSummary;
  const plannerFollowsRecommendation =
    !resolvedPlannerProductId ||
    resolvedPlannerProductId === recommendedPlannerProductId;
  const plannerSelectionStatus =
    resolvedPlannerSummary && recommendedPlannerSummary
      ? plannerSelectionStatusCopy({
          locale,
          selectedProductName: resolvedPlannerSummary.product.name,
          recommendedProductName: recommendedPlannerSummary.product.name,
          followsRecommendation: plannerFollowsRecommendation,
        })
      : null;
  const builderTargetText = resolvedPlannerSummary
    ? locale === "zh"
      ? `这次会为 ${resolvedPlannerSummary.product.name} 建任务。`
      : `This will create tasks for ${resolvedPlannerSummary.product.name}.`
    : null;
  const workspaceBudgetLead =
    featuredCandidates
      .slice()
      .sort((left, right) => {
        const leftBurn = productWeeklyBurnById.get(left.product.id) || 0;
        const rightBurn = productWeeklyBurnById.get(right.product.id) || 0;
        return rightBurn - leftBurn;
      })[0] || null;
  const laneOwnersByLane = workspacePolicy.laneOwners;
  const workspaceSupplyAutoOwner =
    (workspaceSupply.provenOwner &&
      workspaceSupply.provenOwner.productId ===
        workspaceSupply.recommendedAutoCoverageProductId
      ? workspaceSupply.provenOwner
      : null) ||
    (workspaceSupply.buildoutOwner &&
      workspaceSupply.buildoutOwner.productId ===
        workspaceSupply.recommendedAutoCoverageProductId
      ? workspaceSupply.buildoutOwner
      : null);
  const workspaceSupplyFocus = workspaceSupplyFocusCopy({
    locale,
    workspaceSupply,
  });
  const productOwnedLanesById = new Map(
    productSummaries.map((summary) => {
      const ownedLanes = (
        ["submission", "proof", "premium"] as const
      ).filter(
        (lane) =>
          workspacePolicy.allowances[summary.product.id]?.[lane] &&
          workspacePolicy.capacity.lanes[lane].remaining > 0
      );

      return [summary.product.id, ownedLanes] as const;
    })
  );
  const workflowLeadProduct = workspaceStrategyLead || featuredProduct || null;
  const workflowLeadLaunchAction =
    workspaceStrategyLead && isLaunchAction(workspaceStrategyLead.primaryAction)
      ? workspaceStrategyLead.primaryAction
      : featuredLaunchAction;
  const workflowLeadDetailHref = workflowLeadProduct
    ? withPriorityContext(
        `/dashboard/product/${workflowLeadProduct.product.id}`,
        workflowLeadProduct.product.id,
        workspaceStrategyLead?.product.id === workflowLeadProduct.product.id
      )
    : null;
  const workflowLeadHistoryHref = workflowLeadProduct
    ? withPriorityContext(
        `/dashboard/product/${workflowLeadProduct.product.id}#submission-history`,
        workflowLeadProduct.product.id,
        workspaceStrategyLead?.product.id === workflowLeadProduct.product.id
      )
    : null;

  const workflowSteps = [
    {
      id: "register",
      status:
        products.length === 0
          ? ("blocked" as const)
          : workflowLeadProduct
            ? ("done" as const)
            : ("ready" as const),
      title: workflowCopy.steps.register.title,
      body:
        products.length === 0
          ? workflowCopy.steps.register.empty
          : workflowCopy.steps.register.done,
      href:
        products.length === 0
          ? null
          : workflowLeadDetailHref || `/dashboard/product/${products[0].id}`,
      actionLabel:
        products.length === 0
          ? workflowCopy.steps.register.actionAdd
          : workflowCopy.steps.register.actionOpen,
    },
    {
      id: "plan",
      status:
        products.length === 0
          ? ("blocked" as const)
          : workspaceTaskPlans.length > 0
            ? ("done" as const)
            : operationalInsights.discovery_counted_new_worthy_root_domain_count > 0 ||
                liveChannelsForPlan.length > 0
              ? ("ready" as const)
              : ("active" as const),
      title: workflowCopy.steps.plan.title,
      body:
        products.length === 0
          ? workflowCopy.steps.plan.empty
          : workspaceTaskPlans.length > 0
            ? `${workflowCopy.steps.plan.ready} ${workspaceTaskPlans.length} ${
                locale === "zh" ? "个覆盖计划任务已创建。" : "coverage task plans are already queued."
              }`
            : `${workflowCopy.steps.plan.ready} ${copy.discovery.progressLabel}: ${discoveryProgressCount}/${discoveryProgressTarget || 0}.`,
      href:
        products.length === 0
          ? null
          : workspaceTaskPlans.length > 0
            ? "#task-queue"
            : "#task-builder",
      actionLabel: workflowCopy.steps.plan.action,
    },
    {
      id: "launch",
      status:
        products.length === 0
          ? ("blocked" as const)
          : activeLaunches > 0
            ? ("active" as const)
            : workflowLeadLaunchAction
              ? ("ready" as const)
              : submissions.length > 0
                ? ("done" as const)
                : ("ready" as const),
      title: workflowCopy.steps.launch.title,
      body:
        products.length === 0
          ? workflowCopy.steps.launch.empty
          : activeLaunches > 0
            ? workflowCopy.steps.launch.running
            : workflowCopy.steps.launch.ready,
      href:
        products.length === 0
          ? null
          : activeLaunches > 0
            ? "#task-queue"
            : workflowLeadLaunchAction && workflowLeadProduct
              ? workflowLeadHistoryHref ||
                `/dashboard/product/${workflowLeadProduct.product.id}#submission-history`
              : "#task-queue",
      actionLabel:
        activeLaunches > 0
          ? workflowCopy.steps.launch.actionQueue
          : workflowCopy.steps.launch.actionLaunch,
    },
    {
      id: "track",
      status:
        workspaceProofStats.verify > 0
          ? ("live" as const)
          : workspaceTasks.length > 0
            ? ("active" as const)
            : ("blocked" as const),
      title: workflowCopy.steps.track.title,
      body:
        workspaceProofStats.verify > 0
          ? workflowCopy.steps.track.live
          : workspaceTasks.length > 0
            ? workflowCopy.steps.track.active
            : workflowCopy.steps.track.empty,
      href: workspaceTasks.length > 0 ? "#task-queue" : null,
      actionLabel: workflowCopy.steps.track.action,
    },
  ];
  const workspaceStrategyLeadDecision =
    workspaceStrategyLead
      ? productBudgetDecisionById.get(workspaceStrategyLead.product.id) || {
          key: "build_queue" as const,
        }
      : null;
  const workspaceStrategyLeadLaunchAction =
    workspaceStrategyLead && isLaunchAction(workspaceStrategyLead.primaryAction)
      ? workspaceStrategyLead.primaryAction
      : null;
  const workspaceStrategyLeadLinkAction =
    workspaceStrategyLead && isLinkAction(workspaceStrategyLead.primaryAction)
      ? workspaceStrategyLead.primaryAction
      : null;
  const workspaceStrategyLeadAction =
    workspaceStrategyLead && workspaceStrategy.mode !== "unlock"
      ? budgetActionForSummary({
          locale,
          summary: workspaceStrategyLead,
          decision: workspaceStrategyLeadDecision || { key: "build_queue" },
          currentPlan,
          productPolicy: productPolicyById.get(workspaceStrategyLead.product.id),
        })
      : null;
  const workspaceLeadSummary = workspaceStrategyLead
    ? workspaceLeadSummaryCopy({
        locale,
        leadProductName: workspaceStrategyLead.product.name,
        mode: workspaceStrategy.mode,
      })
    : null;
  const taskBuilderLeadHref = recommendedPlannerSummary
    ? withPriorityContext(
        `/dashboard/product/${recommendedPlannerSummary.product.id}`,
        recommendedPlannerSummary.product.id,
        workspaceStrategyLead?.product.id === recommendedPlannerSummary.product.id
      )
    : null;
  const featuredProductDetailHref = featuredProduct
    ? withPriorityContext(
        `/dashboard/product/${featuredProduct.product.id}`,
        featuredProduct.product.id,
        workspaceStrategyLead?.product.id === featuredProduct.product.id
      )
    : null;
  const featuredProductHistoryHref = featuredProduct
    ? withPriorityContext(
        `/dashboard/product/${featuredProduct.product.id}#submission-history`,
        featuredProduct.product.id,
        workspaceStrategyLead?.product.id === featuredProduct.product.id
      )
    : null;
  const workspaceStrategyLeadDetailHref = workspaceStrategyLead
    ? withPriorityContext(
        `/dashboard/product/${workspaceStrategyLead.product.id}`,
        workspaceStrategyLead.product.id,
        true
      )
    : null;
  const todayBriefLeadLabel =
    locale === "zh" ? "当前优先" : "Current lead";
  const todayBriefLeadName =
    workspaceStrategyLead?.product.name || featuredProduct?.product.name || null;
  const todayBriefSignal = !products.length
    ? {
        title: todayBriefCopy.emptySignalTitle,
        body: todayBriefCopy.emptySignalBody,
        productName: null,
      }
    : workspaceProofStats.verify > 0 || globalProofPriority !== "build_signal"
      ? {
          title: todayBriefCopy.readySignalTitle,
          body: todayBriefCopy.readySignalBody,
          productName: todayBriefLeadName,
        }
      : activeLaunches > 0
        ? {
            title: todayBriefCopy.activeSignalTitle,
            body: todayBriefCopy.activeSignalBody,
            productName: featuredProduct?.product.name || todayBriefLeadName,
          }
        : {
            title: todayBriefCopy.emptySignalTitle,
            body: todayBriefCopy.emptySignalBody,
            productName: todayBriefLeadName,
          };
  const discoveryGap = Math.max(discoveryProgressTarget - discoveryProgressCount, 0);
  const todayBriefBlocker = !products.length
    ? {
        title: todayBriefCopy.noProductBlockerTitle,
        body: todayBriefCopy.noProductBlockerBody,
      }
    : !isPaid
      ? {
          title: todayBriefCopy.freeBlockerTitle,
          body: todayBriefCopy.freeBlockerBody,
        }
      : isPlanSyncPending
        ? {
            title: todayBriefCopy.syncBlockerTitle,
            body: todayBriefCopy.syncBlockerBody,
          }
        : discoveryGap > 0
          ? {
              title: todayBriefCopy.discoveryBlockerTitle,
              body: `${todayBriefCopy.discoveryBlockerBody} ${copy.discovery.progressLabel}: ${discoveryProgressCount}/${discoveryProgressTarget || 0}.`,
            }
          : {
              title: todayBriefCopy.proofBlockerTitle,
              body: todayBriefCopy.proofBlockerBody,
            };
  const todayBriefMove: TodayBriefMove = !products.length
    ? {
        kind: "button",
        title: todayBriefCopy.actionSetupTitle,
        body: todayBriefCopy.actionSetupBody,
        label: copy.header.addFirstProduct,
      }
    : !isPaid
      ? {
          kind: "link",
          title: todayBriefCopy.actionUnlockTitle,
          body: todayBriefCopy.actionUnlockBody,
          label: copy.hero.primaryUnlock,
          href: "/api/stripe/checkout?plan=starter",
        }
      : isPlanSyncPending
        ? {
            kind: "refresh",
            title: todayBriefCopy.actionSyncTitle,
            body: todayBriefCopy.actionSyncBody,
            label: todayBriefCopy.refresh,
          }
        : workspaceStrategy.mode === "unlock" &&
            workspaceStrategyLeadLaunchAction &&
            workspaceStrategyLead
          ? {
              kind: "launch",
              title: todayBriefCopy.actionLaunchTitle,
              body: todayBriefCopy.actionLaunchBody,
              label: workspaceStrategyLeadLaunchAction.label,
              productId: workspaceStrategyLead.product.id,
              channelId: workspaceStrategyLeadLaunchAction.channelId,
            }
          : workspaceStrategyLeadAction?.kind === "proof" && workspaceStrategyLead
            ? {
                kind: "proof",
                title: todayBriefCopy.actionProofTitle,
                body: todayBriefCopy.actionProofBody,
                label: workspaceStrategyLeadAction.label,
                productId: workspaceStrategyLead.product.id,
                proofAction: workspaceStrategyLeadAction.proofAction,
              }
            : workspaceStrategyLeadAction?.kind === "launch" && workspaceStrategyLead
              ? {
                  kind: "launch",
                  title: todayBriefCopy.actionLaunchTitle,
                  body: todayBriefCopy.actionLaunchBody,
                  label: workspaceStrategyLeadAction.label,
                  productId: workspaceStrategyLead.product.id,
                  channelId: workspaceStrategyLeadAction.channelId,
                }
              : workspaceStrategyLeadAction?.kind === "link"
                ? {
                    kind: "link",
                    title:
                      workspaceStrategy.mode === "prove"
                        ? todayBriefCopy.actionProofTitle
                        : workspaceStrategy.mode === "build"
                          ? todayBriefCopy.actionLaunchTitle
                          : todayBriefCopy.actionReviewTitle,
                    body:
                      workspaceStrategy.mode === "prove"
                        ? todayBriefCopy.actionProofBody
                        : workspaceStrategy.mode === "build"
                          ? todayBriefCopy.actionLaunchBody
                          : todayBriefCopy.actionReviewBody,
                    label: workspaceStrategyLeadAction.label,
                    href: workspaceStrategyLeadAction.href,
                  }
                : {
                    kind: "link",
                    title: todayBriefCopy.actionReviewTitle,
                    body: todayBriefCopy.actionReviewBody,
                    label: todayBriefCopy.openProduct,
                    href:
                      workspaceStrategyLeadDetailHref ||
                      featuredProductDetailHref ||
                      "/dashboard",
                  };
  const orderedProductSummaries = workspaceStrategyLead
    ? [
        workspaceStrategyLead,
        ...productSummaries.filter(
          (summary) => summary.product.id !== workspaceStrategyLead.product.id
        ),
      ]
    : productSummaries;

  useEffect(() => {
    const previousRecommended = previousRecommendedPlannerProductId.current;
    const shouldFollowRecommended =
      !plannerProductId ||
      !plannerProductExists ||
      plannerProductReclaimed ||
      plannerProductId === previousRecommended;

    if (
      shouldFollowRecommended &&
      recommendedPlannerProductId &&
      plannerProductId !== recommendedPlannerProductId
    ) {
      setPlannerProductId(recommendedPlannerProductId);
    }

    previousRecommendedPlannerProductId.current = recommendedPlannerProductId;
  }, [
    plannerProductExists,
    plannerProductId,
    plannerProductReclaimed,
    recommendedPlannerProductId,
  ]);

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
    const laneGuardMessage = workspaceLaneGuardMessage({
      lane: "submission",
      locale,
      productId,
      workspacePolicy,
      fullError: copy.capacity.fullError,
    });

    if (laneGuardMessage) {
      setWorkspaceActionError(laneGuardMessage);
      return;
    }

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

  async function handleWorkspaceProofAction(
    productId: string,
    action: ProductProofAction
  ) {
    if (action.mode === "open") {
      setWorkspaceActionError("");
      router.push(action.href);
      return;
    }

    const actionKey = `${productId}:${action.taskType}`;
    const laneGuardMessage = workspaceLaneGuardMessage({
      lane: "proof",
      locale,
      productId,
      workspacePolicy,
      fullError: copy.capacity.fullError,
    });

    if (laneGuardMessage) {
      setWorkspaceActionError(laneGuardMessage);
      return;
    }

    setProofActionKey(actionKey);
    setWorkspaceActionError("");

    try {
      const response = await fetch(`/api/products/${productId}/managed-inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "queue_proof_task",
          taskType: action.taskType,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Could not queue the proof task.");
      }

      router.push(action.href);
      router.refresh();
    } catch (error) {
      setWorkspaceActionError(
        error instanceof Error ? error.message : copy.errors.saveFailed
      );
    } finally {
      setProofActionKey(null);
    }
  }

  async function handleCreateTaskPlan(mode: "auto" | "competitor" | "import") {
    if (!resolvedPlannerProductId) {
      setBuilderError(copy.errors.saveFailed);
      return;
    }

    if (mode === "auto") {
      const supplyGuardMessage = workspaceAutoCoverageGuardMessage({
        locale,
        productId: resolvedPlannerProductId,
        workspaceSupply,
      });

      if (supplyGuardMessage) {
        setBuilderError(supplyGuardMessage);
        return;
      }
    }

    if (mode === "import" && !importList.trim()) {
      setBuilderError(
        locale === "zh"
          ? "请先粘贴至少一个域名或 URL。"
          : "Paste at least one domain or URL first."
      );
      return;
    }

    if (mode === "competitor" && !competitorList.trim()) {
      setBuilderError(
        locale === "zh"
          ? "请先粘贴至少一个竞品域名或网址。"
          : "Paste at least one competitor domain or URL first."
      );
      return;
    }

    setBuilderAction(mode);
    setBuilderError("");

    try {
      const response = await fetch(
        `/api/products/${resolvedPlannerProductId}/task-plans`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "auto"
              ? {
                  action: "create_auto_coverage",
                }
              : mode === "competitor"
                ? {
                    action: "create_competitor_plan",
                    competitorList,
                  }
              : {
                  action: "import_target_list",
                  rawList: importList,
                  granularity: importGranularity,
                }
          ),
        }
      );

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || copy.errors.saveFailed);
      }

      if (mode === "import") {
        setImportList("");
      } else if (mode === "competitor") {
        setCompetitorList("");
      }

      router.refresh();
    } catch (error) {
      setBuilderError(
        error instanceof Error ? error.message : copy.errors.saveFailed
      );
    } finally {
      setBuilderAction(null);
    }
  }

  async function handleMaterializeCompetitorPlan(
    productId: string,
    planId: string
  ) {
    const buildoutSupplyError = workspaceBuildoutGuardMessage({
      locale,
      productId,
      workspaceSupply,
    });
    if (buildoutSupplyError) {
      setWorkspaceActionError(buildoutSupplyError);
      return;
    }

    const laneGuardMessage = workspaceLaneGuardMessage({
      lane: "submission",
      locale,
      productId,
      workspacePolicy,
      fullError: copy.capacity.fullError,
    });

    if (laneGuardMessage) {
      setWorkspaceActionError(laneGuardMessage);
      return;
    }

    setMaterializingPlanId(planId);
    setWorkspaceActionError("");

    try {
      const response = await fetch(`/api/products/${productId}/task-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "materialize_competitor_plan",
          planId,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || copy.errors.saveFailed);
      }

      router.refresh();
    } catch (error) {
      setWorkspaceActionError(
        error instanceof Error ? error.message : copy.errors.saveFailed
      );
    } finally {
      setMaterializingPlanId(null);
    }
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
            {workspaceLeadSummary ? (
              <div className="mt-4 max-w-3xl rounded-[1.15rem] border border-[var(--line-soft)] bg-black/15 px-4 py-3 text-sm leading-7 text-stone-300">
                {workspaceLeadSummary}
              </div>
            ) : null}

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
              ) : products.length > 0 ? (
                <>
                  {todayBriefMove.kind === "refresh" ? (
                    <button
                      type="button"
                      onClick={() => router.refresh()}
                      className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                    >
                      {todayBriefMove.label}
                    </button>
                  ) : todayBriefMove.kind === "launch" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleWorkspaceLaunch(
                          todayBriefMove.productId,
                          todayBriefMove.channelId
                        )
                      }
                      disabled={
                        launchingKey ===
                        `${todayBriefMove.productId}:${todayBriefMove.channelId}`
                      }
                      className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                    >
                      {launchingKey ===
                      `${todayBriefMove.productId}:${todayBriefMove.channelId}`
                        ? copy.productCard.starting
                        : todayBriefMove.label}
                    </button>
                  ) : todayBriefMove.kind === "proof" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleWorkspaceProofAction(
                          todayBriefMove.productId,
                          todayBriefMove.proofAction
                        )
                      }
                      disabled={
                        proofActionKey ===
                        `${todayBriefMove.productId}:${todayBriefMove.proofAction.taskType}`
                      }
                      className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                    >
                      {proofActionKey ===
                      `${todayBriefMove.productId}:${todayBriefMove.proofAction.taskType}`
                        ? copy.productCard.starting
                        : todayBriefMove.label}
                    </button>
                  ) : todayBriefMove.kind === "link" ? (
                    todayBriefMove.href.startsWith("/api/") ? (
                      <a
                        href={todayBriefMove.href}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {todayBriefMove.label}
                      </a>
                    ) : (
                      <Link
                        href={todayBriefMove.href}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {todayBriefMove.label}
                      </Link>
                    )
                  ) : null}
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              {
                label: copy.stats.weeklyBurn,
                value: `~${formatCreditsEstimate(workspaceWeeklyBurn)}`,
                note: workspaceBurnNote({
                  locale,
                  productName: workspaceBudgetLead?.product.name || null,
                  decision: workspaceBudgetLead
                    ? productBudgetDecisionById.get(workspaceBudgetLead.product.id) || null
                    : null,
                  fallback: copy.stats.weeklyBurnNote,
                }),
                tone: "text-fuchsia-200",
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

        <section className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {todayBriefCopy.eyebrow}
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
              {todayBriefCopy.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              {todayBriefCopy.body}
            </p>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <article className="rounded-[1.35rem] border border-emerald-300/15 bg-emerald-300/[0.07] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/70">
                {todayBriefCopy.cards.signal}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {todayBriefSignal.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                {todayBriefSignal.body}
              </p>
              {todayBriefSignal.productName ? (
                <div className="mt-4 inline-flex rounded-full border border-emerald-300/15 bg-black/15 px-3 py-1.5 text-xs font-medium text-emerald-100">
                  {todayBriefLeadLabel}: {todayBriefSignal.productName}
                </div>
              ) : null}
            </article>

            <article className="rounded-[1.35rem] border border-amber-300/15 bg-amber-300/[0.07] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-100/70">
                {todayBriefCopy.cards.blocker}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {todayBriefBlocker.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                {todayBriefBlocker.body}
              </p>
            </article>

            <article className="rounded-[1.35rem] border border-sky-300/15 bg-sky-300/[0.07] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-100/70">
                {todayBriefCopy.cards.move}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {todayBriefMove.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                {todayBriefMove.body}
              </p>
              <div className="mt-5">
                {todayBriefMove.kind === "button" ? (
                  <button
                    type="button"
                    onClick={openAddProduct}
                    className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {todayBriefMove.label}
                  </button>
                ) : todayBriefMove.kind === "refresh" ? (
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {todayBriefMove.label}
                  </button>
                ) : todayBriefMove.kind === "launch" ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleWorkspaceLaunch(
                        todayBriefMove.productId,
                        todayBriefMove.channelId
                      )
                    }
                    disabled={
                      launchingKey ===
                      `${todayBriefMove.productId}:${todayBriefMove.channelId}`
                    }
                    className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                  >
                    {launchingKey ===
                    `${todayBriefMove.productId}:${todayBriefMove.channelId}`
                      ? copy.productCard.starting
                      : todayBriefMove.label}
                  </button>
                ) : todayBriefMove.kind === "proof" ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleWorkspaceProofAction(
                        todayBriefMove.productId,
                        todayBriefMove.proofAction
                      )
                    }
                    disabled={
                      proofActionKey ===
                      `${todayBriefMove.productId}:${todayBriefMove.proofAction.taskType}`
                    }
                    className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                  >
                    {proofActionKey ===
                    `${todayBriefMove.productId}:${todayBriefMove.proofAction.taskType}`
                      ? copy.productCard.starting
                      : todayBriefMove.label}
                  </button>
                ) : todayBriefMove.href.startsWith("/api/") ? (
                  <a
                    href={todayBriefMove.href}
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {todayBriefMove.label}
                  </a>
                ) : (
                  <Link
                    href={todayBriefMove.href}
                    className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {todayBriefMove.label}
                  </Link>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {workflowCopy.eyebrow}
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
              {workflowCopy.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              {workflowCopy.body}
            </p>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <div
                key={step.id}
                className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5"
              >
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${workflowStatusClasses(
                    step.status
                  )}`}
                >
                  {workflowCopy.statuses[step.status]}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{step.body}</p>
                <div className="mt-5">
                  {step.id === "register" && products.length === 0 ? (
                    <button
                      onClick={openAddProduct}
                      className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                    >
                      {step.actionLabel}
                    </button>
                  ) : step.id === "launch" &&
                    workflowLeadLaunchAction &&
                    workflowLeadProduct ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleWorkspaceLaunch(
                          workflowLeadProduct.product.id,
                          workflowLeadLaunchAction.channelId
                        )
                      }
                      disabled={
                        launchingKey ===
                        `${workflowLeadProduct.product.id}:${workflowLeadLaunchAction.channelId}`
                      }
                      className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                    >
                      {launchingKey ===
                      `${workflowLeadProduct.product.id}:${workflowLeadLaunchAction.channelId}`
                        ? copy.productCard.starting
                        : step.actionLabel}
                    </button>
                  ) : step.href ? (
                    <Link
                      href={step.href}
                      className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      {step.actionLabel}
                    </Link>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-stone-500">
                      {step.actionLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm leading-7 text-stone-500">{workflowCopy.note}</p>
        </section>

        {products.length > 0 ? (
          <section className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div>
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    {workspaceStrategyCopy.eyebrow}
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    {workspaceStrategyCopy.title}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-stone-400">
                    {workspaceStrategyCopy.body}
                  </p>
                </div>

                <div className="mt-6 rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {workspaceStrategyCopy.modeLabel}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${workspaceStrategyModeClasses(
                        workspaceStrategy.mode
                      )}`}
                    >
                      {workspaceStrategyCopy.modes[workspaceStrategy.mode].title}
                    </span>
                    {workspaceStrategyLead ? (
                      <span className="text-sm text-stone-400">
                        {workspaceStrategyLead.product.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-stone-300">
                    {workspaceStrategyCopy.modes[workspaceStrategy.mode].body}
                  </p>

                  <div className="mt-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {workspaceStrategyCopy.actionLabel}
                    </div>
                    <div className="mt-3">
                      {workspaceStrategy.mode === "unlock" && workspaceStrategyLead ? (
                        workspaceStrategyLeadLaunchAction ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleWorkspaceLaunch(
                                workspaceStrategyLead.product.id,
                                workspaceStrategyLeadLaunchAction.channelId
                              )
                            }
                            disabled={
                              launchingKey ===
                              `${workspaceStrategyLead.product.id}:${workspaceStrategyLeadLaunchAction.channelId}`
                            }
                            className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                          >
                            {launchingKey ===
                            `${workspaceStrategyLead.product.id}:${workspaceStrategyLeadLaunchAction.channelId}`
                              ? copy.productCard.starting
                              : workspaceStrategyLeadLaunchAction.label}
                          </button>
                        ) : workspaceStrategyLeadLinkAction?.href.startsWith("/api/") ? (
                          <a
                            href={workspaceStrategyLeadLinkAction.href}
                            className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                          >
                            {workspaceStrategyLeadLinkAction.label}
                          </a>
                        ) : (
                          <Link
                            href={
                              withPriorityContext(
                                workspaceStrategyLeadLinkAction?.href ||
                                  workspaceStrategyLeadDetailHref ||
                                  `/dashboard/product/${workspaceStrategyLead.product.id}`,
                                workspaceStrategyLead.product.id,
                                true
                              )
                            }
                            className="inline-flex rounded-full border border-[var(--line-soft)] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                          >
                            {workspaceStrategyLeadLinkAction?.label ||
                              copy.productCard.open}
                          </Link>
                        )
                      ) : workspaceStrategyLeadAction?.kind === "proof" && workspaceStrategyLead ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleWorkspaceProofAction(
                              workspaceStrategyLead.product.id,
                              workspaceStrategyLeadAction.proofAction
                            )
                          }
                          disabled={
                            proofActionKey ===
                            `${workspaceStrategyLead.product.id}:${workspaceStrategyLeadAction.proofAction.taskType}`
                          }
                          className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60"
                        >
                          {proofActionKey ===
                          `${workspaceStrategyLead.product.id}:${workspaceStrategyLeadAction.proofAction.taskType}`
                            ? copy.productCard.starting
                            : workspaceStrategyLeadAction.label}
                        </button>
                      ) : workspaceStrategyLeadAction?.kind === "launch" && workspaceStrategyLead ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleWorkspaceLaunch(
                              workspaceStrategyLead.product.id,
                              workspaceStrategyLeadAction.channelId
                            )
                          }
                          disabled={
                            launchingKey ===
                            `${workspaceStrategyLead.product.id}:${workspaceStrategyLeadAction.channelId}`
                          }
                          className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                        >
                          {launchingKey ===
                          `${workspaceStrategyLead.product.id}:${workspaceStrategyLeadAction.channelId}`
                            ? copy.productCard.starting
                            : workspaceStrategyLeadAction.label}
                        </button>
                      ) : workspaceStrategyLeadAction?.kind === "link" ? (
                        workspaceStrategyLeadAction.href.startsWith("/api/") ? (
                          <a
                            href={workspaceStrategyLeadAction.href}
                            className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                          >
                            {workspaceStrategyLeadAction.label}
                          </a>
                        ) : (
                          <Link
                            href={workspaceStrategyLeadAction.href}
                            className="inline-flex rounded-full border border-[var(--line-soft)] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                          >
                            {workspaceStrategyLeadAction.label}
                          </Link>
                        )
                      ) : (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-stone-400">
                          {workspaceStrategyCopy.modeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {workspaceStrategyCopy.allocationLabel}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {(
                        ["prove", "watch", "build", "premium"] as const
                      ).map((lane) => (
                        <div
                          key={lane}
                          className="rounded-[1.1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                        >
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-stone-200">
                              {workspaceStrategyCopy.allocation[lane]}
                            </span>
                            <span className="text-stone-500">
                              {workspaceStrategy.allocation[lane]}%
                            </span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-stone-900">
                            <div
                              className={`h-2 rounded-full ${lane === "prove" ? "bg-emerald-300" : lane === "watch" ? "bg-sky-300" : lane === "premium" ? "bg-fuchsia-300" : "bg-stone-200"}`}
                              style={{
                                width: `${Math.max(
                                  workspaceStrategy.allocation[lane],
                                  workspaceStrategy.allocation[lane] > 0 ? 8 : 0
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(
                  ["prove", "watch", "build", "premium"] as const
                ).map((lane) => {
                  const laneSummary = workspaceStrategy.lanes[lane];

                  return (
                    <article
                      key={lane}
                      className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${workspaceStrategyLaneClasses(
                            lane
                          )}`}
                        >
                          {workspaceStrategyCopy.lanes[lane].title}
                        </span>
                        <span className="text-xs text-stone-500">
                          {workspaceStrategyCopy.laneMetrics.products}:{" "}
                          {laneSummary.productCount}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-stone-300">
                        {workspaceStrategyCopy.lanes[lane].body}
                      </p>
                      <div className="mt-4 text-xs text-stone-500">
                        {workspaceStrategyCopy.laneMetrics.burn}: ~
                        {formatCreditsEstimate(laneSummary.estimatedBurn)}
                      </div>

                      <div className="mt-4 space-y-3">
                        {laneSummary.products.length > 0 ? (
                          laneSummary.products.slice(0, 3).map((product) => (
                            <div
                              key={`${lane}:${product.productId}`}
                              className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {product.productName}
                                  </div>
                                  <div className="mt-1 text-xs text-stone-500">
                                    ~{formatCreditsEstimate(product.weeklyBurn)}
                                  </div>
                                </div>
                                <Link
                                  href={withPriorityContext(
                                    `/dashboard/product/${product.productId}`,
                                    product.productId,
                                    workspaceStrategyLead?.product.id === product.productId
                                  )}
                                  className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                                >
                                  {workspaceStrategyCopy.laneMetrics.open}
                                </Link>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-3 text-sm leading-7 text-stone-500">
                            {workspaceStrategyCopy.laneMetrics.empty}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    {workspaceCapacityCopy.eyebrow}
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    {workspaceCapacityCopy.title}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-stone-400">
                    {workspaceCapacityCopy.body}
                  </p>
                </div>

                <div className="mt-6 rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {workspaceCapacityCopy.policyLabel}
                  </div>
                  <div className="mt-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${workspaceCapacityPolicyClasses(
                        workspaceCapacity.policy
                      )}`}
                    >
                      {
                        workspaceCapacityCopy.states[workspaceCapacity.policy]
                          .title
                      }
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-stone-300">
                    {workspaceCapacityCopy.states[workspaceCapacity.policy].body}
                  </p>
                </div>

                {workspaceActionError ? (
                  <p className="mt-5 text-sm text-red-300">{workspaceActionError}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {(
                  ["submission", "proof", "premium"] as const
                ).map((lane) => {
                  const laneState = workspaceCapacity.lanes[lane];
                  const laneOwners = laneOwnersByLane[lane];
                  const laneOwnerLabel =
                    laneOwners.length > 0
                      ? formatNaturalList(
                          laneOwners.map((owner) => owner.productName),
                          locale
                        )
                      : workspaceLaneReservationEmpty({
                          lane,
                          locale,
                          hasRemaining: laneState.remaining > 0,
                        });

                  return (
                    <article
                      key={lane}
                      className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5"
                    >
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${workspaceCapacityLaneClasses(
                          lane
                        )}`}
                      >
                        {workspaceCapacityCopy.laneLabels[lane]}
                      </span>

                      <div className="mt-5 grid gap-3">
                        <div className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {workspaceCapacityCopy.metrics.used}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {laneState.used}
                          </div>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {workspaceCapacityCopy.metrics.limit}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-white">
                            {laneState.limit}
                          </div>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {laneState.overLimit > 0
                              ? workspaceCapacityCopy.metrics.over
                              : workspaceCapacityCopy.metrics.remaining}
                          </div>
                          <div
                            className={`mt-2 text-2xl font-semibold ${
                              laneState.overLimit > 0
                                ? "text-rose-200"
                                : "text-stone-100"
                            }`}
                          >
                            {laneState.overLimit > 0
                              ? laneState.overLimit
                              : laneState.remaining}
                          </div>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {locale === "zh"
                              ? "当前优先产品"
                              : "Current priority product"}
                          </div>
                          <div className="mt-2 text-sm font-medium leading-7 text-stone-100">
                            {laneOwnerLabel}
                          </div>
                          <div className="mt-2 text-xs leading-6 text-stone-500">
                            {workspaceLaneReservationReason(lane, locale)}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section
            id="task-builder"
            className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7"
          >
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.builder.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                {copy.builder.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-400">
                {copy.builder.body}
              </p>
            </div>

            {recommendedPlannerSummary ? (
              <div className="mt-6 rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                      {locale === "zh"
                        ? "当前建任务优先"
                        : "Current build lead"}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-white">
                      {recommendedPlannerSummary.product.name}
                    </h3>
                  </div>
                  {taskBuilderLeadHref ? (
                    <Link
                      href={taskBuilderLeadHref}
                      className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      {locale === "zh"
                        ? "打开当前优先产品"
                        : "Open current lead"}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-300">
                  {workspaceLeadSummary ||
                    (locale === "zh"
                      ? `系统当前会先把新增任务路由给 ${recommendedPlannerSummary.product.name}。`
                      : `The workspace is routing new tasks into ${recommendedPlannerSummary.product.name} right now.`)}
                </p>
              </div>
            ) : null}

            <div className="mt-6 max-w-sm">
              <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-stone-500">
                {copy.builder.productLabel}
              </label>
              <select
                value={resolvedPlannerProductId}
                onChange={(event) => setPlannerProductId(event.target.value)}
                className="w-full rounded-[1.1rem] border border-[var(--line-soft)] bg-black/15 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
              >
                {productSummaries.map((summary) => (
                  <option key={summary.product.id} value={summary.product.id}>
                    {summary.product.name}
                    {summary.product.id === recommendedPlannerProductId
                      ? locale === "zh"
                        ? " · 当前优先"
                        : " · Current lead"
                      : ""}
                  </option>
                ))}
              </select>
              {plannerSelectionStatus ? (
                <div className="mt-3 rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {plannerSelectionStatus.badge}
                  </div>
                  {resolvedPlannerSummary ? (
                    <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-stone-200">
                      {locale === "zh"
                        ? `当前任务目标：${resolvedPlannerSummary.product.name}`
                        : `Current task target: ${resolvedPlannerSummary.product.name}`}
                    </div>
                  ) : null}
                  <p className="mt-2 text-sm leading-7 text-stone-300">
                    {plannerSelectionStatus.body}
                  </p>
                  {!plannerFollowsRecommendation && recommendedPlannerSummary ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPlannerProductId(recommendedPlannerSummary.product.id)
                      }
                      className="mt-3 rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      {locale === "zh"
                        ? `切回 ${recommendedPlannerSummary.product.name}`
                        : `Switch back to ${recommendedPlannerSummary.product.name}`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    {locale === "zh" ? "供给分配" : "Supply routing"}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {workspaceSupplyFocus.title}
                  </h3>
                </div>
                {workspaceSupplyAutoOwner ? (
                  <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    {locale === "zh"
                      ? `当前 auto coverage 默认给 ${workspaceSupplyAutoOwner.productName}`
                      : `Auto coverage defaults to ${workspaceSupplyAutoOwner.productName}`}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                {workspaceSupplyFocus.body}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  {
                    label:
                      locale === "zh"
                        ? "已验证供给优先产品"
                        : "Proven supply target",
                    owner: workspaceSupply.provenOwner,
                    tier: "proven" as const,
                  },
                  {
                    label:
                      locale === "zh"
                        ? "扩展供给优先产品"
                        : "Buildout supply target",
                    owner: workspaceSupply.buildoutOwner,
                    tier: "buildout" as const,
                  },
                  {
                    label:
                      locale === "zh"
                        ? "高级机会优先产品"
                        : "Premium supply target",
                    owner: workspaceSupply.premiumOwner,
                    tier: "premium" as const,
                  },
                ].map(({ label, owner, tier }) => (
                  <div
                    key={label}
                    className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                        {label}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${workspaceSupplyReleaseClasses(
                          workspaceSupply.release[tier].open
                        )}`}
                      >
                        {workspaceSupplyReleaseLabel({
                          locale,
                          open: workspaceSupply.release[tier].open,
                        })}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-medium leading-7 text-stone-100">
                      {owner
                        ? owner.productName
                        : locale === "zh"
                          ? "当前没有明确归属"
                          : "No explicit owner right now"}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-stone-500">
                      {owner
                        ? workspaceSupplyReasonLabel(owner, locale)
                        : locale === "zh"
                          ? "这一层供给暂时不应该继续往前开。"
                          : "This layer should stay closed for now."}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-stone-500">
                      {workspaceSupplyReleaseReasonCopy({
                        locale,
                        snapshot: workspaceSupply,
                        tier,
                      })}
                    </p>
                    {owner?.recommendedMarkets.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {owner.recommendedMarkets.map((market) => (
                          <span
                            key={`${label}:${market}`}
                            className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-stone-300"
                          >
                            {market}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
                <h3 className="text-xl font-semibold text-white">
                  {copy.builder.autoTitle}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  {copy.builder.autoBody}
                </p>
                {builderTargetText ? (
                  <p className="mt-3 text-xs leading-6 text-stone-500">
                    {builderTargetText}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleCreateTaskPlan("auto")}
                  disabled={builderAction !== null}
                  className="mt-5 rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                >
                  {builderAction === "auto"
                    ? copy.builder.loading
                    : copy.builder.autoAction}
                </button>
              </div>

              <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
                <h3 className="text-xl font-semibold text-white">
                  {copy.builder.competitorTitle}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  {copy.builder.competitorBody}
                </p>
                {builderTargetText ? (
                  <p className="mt-3 text-xs leading-6 text-stone-500">
                    {builderTargetText}
                  </p>
                ) : null}
                <textarea
                  value={competitorList}
                  onChange={(event) => setCompetitorList(event.target.value)}
                  rows={6}
                  placeholder={copy.builder.competitorPlaceholder}
                  className="mt-4 w-full resize-none rounded-[1.1rem] border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                />
                <div className="mt-3 text-xs text-stone-500">
                  {copy.builder.detectedCount}: {competitorLineCount}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateTaskPlan("competitor")}
                  disabled={builderAction !== null}
                  className="mt-5 rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                >
                  {builderAction === "competitor"
                    ? copy.builder.loading
                    : copy.builder.competitorAction}
                </button>
              </div>

              <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
                <h3 className="text-xl font-semibold text-white">
                  {copy.builder.importTitle}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  {copy.builder.importBody}
                </p>
                {builderTargetText ? (
                  <p className="mt-3 text-xs leading-6 text-stone-500">
                    {builderTargetText}
                  </p>
                ) : null}
                <textarea
                  value={importList}
                  onChange={(event) => setImportList(event.target.value)}
                  rows={6}
                  placeholder={copy.builder.importPlaceholder}
                  className="mt-4 w-full resize-none rounded-[1.1rem] border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                  <span>{copy.builder.granularityLabel}</span>
                  <button
                    type="button"
                    onClick={() => setImportGranularity("batch")}
                    className={`rounded-full border px-3 py-1.5 transition ${
                      importGranularity === "batch"
                        ? "border-amber-300/15 bg-amber-300/[0.08] text-amber-100"
                        : "border-[var(--line-soft)] bg-white/[0.04] text-stone-300"
                    }`}
                  >
                    {copy.builder.granularityBatch}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportGranularity("per_target")}
                    className={`rounded-full border px-3 py-1.5 transition ${
                      importGranularity === "per_target"
                        ? "border-amber-300/15 bg-amber-300/[0.08] text-amber-100"
                        : "border-[var(--line-soft)] bg-white/[0.04] text-stone-300"
                    }`}
                  >
                    {copy.builder.granularityPerTarget}
                  </button>
                </div>
                <div className="mt-3 text-xs text-stone-500">
                  {copy.builder.detectedCount}: {importLineCount}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateTaskPlan("import")}
                  disabled={builderAction !== null}
                  className="mt-5 rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                >
                  {builderAction === "import"
                    ? copy.builder.loading
                    : copy.builder.importAction}
                </button>
              </div>
            </div>

            {builderError ? (
              <p className="mt-5 text-sm text-red-300">{builderError}</p>
            ) : null}
            <p className="mt-5 text-sm leading-7 text-stone-500">
              {copy.builder.note}
            </p>
          </section>
        ) : null}

        <section
          id="task-queue"
          className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {taskQueueCopy.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                {taskQueueCopy.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-400">
                {taskQueueCopy.body}
              </p>
            </div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-stone-300">
              {taskQueueCopy.previewBadge}
            </span>
          </div>

          {workspaceTasks.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {workspaceTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-stone-300">
                          {taskQueueCopy.kinds[task.kind]}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${workspaceTaskStageClasses(
                            task.stage
                          )}`}
                        >
                          {taskQueueCopy.stages[task.stage]}
                        </span>
                        {task.focusLabel ? (
                          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-1 text-xs text-emerald-100">
                            {taskQueueCopy.labels.focus}: {task.focusLabel}
                          </span>
                        ) : null}
                        <span className="text-sm text-stone-500">{task.productName}</span>
                        {task.sourcePlanTitle ? (
                          <span className="text-sm text-stone-500">
                            {taskQueueCopy.labels.fromPlan}: {task.sourcePlanTitle}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-4 text-xl font-semibold text-white">
                        {task.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-stone-300">
                        {task.preview}
                      </p>
                      {task.coverageBreakdown ? (
                        <div className="mt-4 grid gap-3 xl:grid-cols-3">
                          {(
                            [
                              [
                                taskQueueCopy.labels.directories,
                                task.coverageBreakdown.directories,
                              ],
                              [
                                taskQueueCopy.labels.outreach,
                                task.coverageBreakdown.outreach,
                              ],
                              [
                                taskQueueCopy.labels.paid,
                                task.coverageBreakdown.paid,
                              ],
                            ] as const
                          ).map(([label, items]) => (
                            <div
                              key={`${task.id}:${label}`}
                              className="rounded-[1.05rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                            >
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {label}
                              </div>
                              <div className="mt-3 space-y-2">
                                {items.length > 0 ? (
                                  items.slice(0, 3).map((item) => (
                                    <div key={`${task.id}:${label}:${item.label}`}>
                                      <div className="text-sm font-medium text-stone-100">
                                        {item.label}
                                      </div>
                                      <div className="mt-1 text-xs leading-6 text-stone-400">
                                        {item.detail}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs leading-6 text-stone-500">
                                    {locale === "zh"
                                      ? "当前没有明确建议。"
                                      : "No clear recommendations yet."}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                      <div className="rounded-[1.15rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                          {taskQueueCopy.labels.economics}
                        </div>
                        <div className="mt-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                              task.billingRule?.type === "premium_service"
                                ? "border-fuchsia-300/15 bg-fuchsia-300/[0.08] text-fuchsia-100"
                                : task.billingRule?.type === "credit_on_success"
                                  ? "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100"
                                  : "border-white/10 bg-white/[0.05] text-stone-200"
                            }`}
                          >
                            {taskQueueCopy.labels.billing}: {task.billingRule?.badge}
                          </span>
                          {task.billingRule?.detail ? (
                            <p className="mt-3 text-xs leading-6 text-stone-400">
                              {task.billingRule.detail}
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-stone-200">
                          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-1.5">
                            {taskQueueCopy.labels.success}:{" "}
                            {task.billingRule?.successDisplay ?? task.successCost}
                          </span>
                          <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.08] px-3 py-1.5">
                            {taskQueueCopy.labels.failure}:{" "}
                            {task.billingRule?.failureDisplay ?? task.failureCost}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs text-stone-500">
                          {taskQueueCopy.labels.updatedAt}:{" "}
                          {formatDashboardDate(task.updatedAt, locale)}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {task.kind === "coverage" &&
                          task.taskPlanMode === "competitor_map" &&
                          task.taskPlanId ? (
                            isPaid ? (
                              task.stage === "planned" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMaterializeCompetitorPlan(
                                      task.productId,
                                      task.taskPlanId || ""
                                    )
                                  }
                                  disabled={materializingPlanId === task.taskPlanId}
                                  className="rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                                >
                                  {materializingPlanId === task.taskPlanId
                                    ? taskQueueCopy.labels.creatingTasks
                                    : taskQueueCopy.labels.createNextTasks}
                                </button>
                              ) : null
                            ) : (
                              <a
                                href="/api/stripe/checkout?plan=starter"
                                className="rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                              >
                                {taskQueueCopy.labels.unlockToCreateTasks}
                              </a>
                            )
                          ) : null}
                          <Link
                            href={task.href}
                            className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                          >
                            {taskQueueCopy.labels.open}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-7 text-stone-400">
              {taskQueueCopy.empty}
            </p>
          )}

          <p className="mt-6 text-sm leading-7 text-stone-500">
            {taskQueueCopy.footer}
          </p>
        </section>

        {products.length > 0 ? (
          <section className="mt-8 rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {outcomeCopy.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                {outcomeCopy.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-400">
                {outcomeCopy.body}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  "staged",
                  "launched",
                  "receipts",
                  "threads",
                  "close",
                  "proved",
                ] as const
              ).map((stage) => (
                <div
                  key={stage}
                  className="rounded-full border border-[var(--line-soft)] bg-black/15 px-4 py-2 text-xs text-stone-300"
                >
                  {outcomeCopy.stages[stage]} · {outcomeStageCounts[stage]}
                </div>
              ))}
            </div>

            {outcomeLeaders.length > 0 ? (
              <div className="mt-6 grid gap-4">
                {outcomeLeaders.slice(0, 4).map((summary) => {
                  const stage = getOutcomeStage(summary);
                  const proofAction =
                    summary.proof.priority !== "build_signal"
                      ? proofActionForSummary(summary, proofCopy)
                      : null;
                  const launchAction = isLaunchAction(summary.primaryAction)
                    ? summary.primaryAction
                    : null;

                  return (
                    <div
                      key={`${summary.product.id}:${stage}`}
                      className="rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-stone-100">
                              {outcomeCopy.stageLabel}: {outcomeCopy.stages[stage]}
                            </span>
                            <span className="text-lg font-semibold text-white">
                              {summary.product.name}
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-7 text-stone-300">
                            {outcomeCopy.stageBody[stage]}
                          </p>

                          <div className="mt-4 grid gap-3 xl:grid-cols-2">
                            <div className="rounded-[1.15rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {outcomeCopy.nextLabel}
                              </div>
                              <div className="mt-2 text-sm leading-7 text-stone-200">
                                {outcomeCopy.nextBody[stage]}
                              </div>
                            </div>
                            <div className="rounded-[1.15rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {outcomeCopy.actionLabel}
                              </div>
                              <div className="mt-2 text-sm leading-7 text-stone-200">
                                {outcomeCopy.actionBody[stage]}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {proofAction ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleWorkspaceProofAction(
                                  summary.product.id,
                                  proofAction
                                )
                              }
                              disabled={
                                proofActionKey ===
                                `${summary.product.id}:${proofAction.taskType}`
                              }
                              className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60"
                            >
                              {proofActionKey ===
                              `${summary.product.id}:${proofAction.taskType}`
                                ? copy.productCard.starting
                                : proofAction.label}
                            </button>
                          ) : launchAction ? (
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
                          ) : (
                            <Link
                              href={withPriorityContext(
                                `/dashboard/product/${summary.product.id}`,
                                summary.product.id,
                                workspaceStrategyLead?.product.id === summary.product.id
                              )}
                              className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                            >
                              {outcomeCopy.openProduct}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-sm leading-7 text-stone-400">
                {outcomeCopy.empty}
              </p>
            )}
          </section>
        ) : null}

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
                    ) : todayBriefMove.kind === "button" ? (
                      <button
                        onClick={openAddProduct}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {todayBriefMove.label}
                      </button>
                    ) : todayBriefMove.kind === "refresh" ? (
                      <button
                        onClick={() => router.refresh()}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {todayBriefMove.label}
                      </button>
                    ) : todayBriefMove.kind === "proof" ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleWorkspaceProofAction(
                            todayBriefMove.productId,
                            todayBriefMove.proofAction
                          )
                        }
                        disabled={
                          proofActionKey ===
                          `${todayBriefMove.productId}:${todayBriefMove.proofAction.taskType}`
                        }
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                      >
                        {proofActionKey ===
                        `${todayBriefMove.productId}:${todayBriefMove.proofAction.taskType}`
                          ? copy.productCard.starting
                          : todayBriefMove.label}
                      </button>
                    ) : todayBriefMove.kind === "launch" ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleWorkspaceLaunch(
                            todayBriefMove.productId,
                            todayBriefMove.channelId
                          )
                        }
                        disabled={
                          launchingKey ===
                          `${todayBriefMove.productId}:${todayBriefMove.channelId}`
                        }
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                      >
                        {launchingKey ===
                        `${todayBriefMove.productId}:${todayBriefMove.channelId}`
                          ? copy.productCard.starting
                          : todayBriefMove.label}
                      </button>
                    ) : todayBriefMove.href.startsWith("/api/") ? (
                      <a
                        href={todayBriefMove.href}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {todayBriefMove.label}
                      </a>
                    ) : (
                      <Link
                        href={todayBriefMove.href}
                        className="rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {todayBriefMove.label}
                      </Link>
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

        {products.length > 0 ? (
          <section className="mt-12 grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="rounded-[1.85rem] border border-[var(--line-strong)] bg-[linear-gradient(135deg,rgba(208,166,90,0.12),rgba(255,255,255,0.04))] p-7">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.discovery.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.discovery.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
              {copy.discovery.body}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(
                [
                  [
                    copy.discovery.progressLabel,
                    `${discoveryProgressCount}/${discoveryProgressTarget || 0}`,
                    operationalInsights.discovery_target_reached
                      ? copy.discovery.progressReached
                      : copy.discovery.progressRunning,
                  ],
                  [
                    copy.discovery.gapLabel,
                    `${operationalInsights.discovery_remaining_to_target}`,
                    copy.discovery.supplyBody,
                  ],
                  [
                    copy.discovery.paidBacklogLabel,
                    `${operationalInsights.paid_target_backlog_count}`,
                    copy.discovery.inventoryBody,
                  ],
                  [
                    copy.discovery.paidRootsLabel,
                    `${operationalInsights.paid_target_root_domain_count}`,
                    copy.discovery.inventoryBody,
                  ],
                  [
                    copy.discovery.paidNewLabel,
                    `${operationalInsights.paid_target_new_today_count}`,
                    copy.discovery.inventoryBody,
                  ],
                  [
                    copy.discovery.targetLabel,
                    `${discoveryProgressTarget || 0}`,
                    copy.discovery.supplyBody,
                  ],
                ] as const
              ).map(([label, value, note]) => (
                <div
                  key={label}
                  className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                  <div className="mt-2 text-xs leading-6 text-stone-500">{note}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.discovery.supplyTitle}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-stone-300">
                    {copy.discovery.supplyBody}
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-stone-200">
                  {operationalInsights.discovery_target_reached
                    ? copy.discovery.progressReached
                    : copy.discovery.progressRunning}
                </span>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
                  <span>
                    {copy.discovery.progressLabel} {discoveryProgressCount}/
                    {discoveryProgressTarget || 0}
                  </span>
                  <span>{discoveryProgressPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-800">
                  <div
                    className="h-2 rounded-full bg-[var(--accent-500)] transition-all duration-500"
                    style={{ width: `${discoveryProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.discovery.contractTitle}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${discoveryMarketToneClasses(
                        capabilityReviewPending ? "buildout" : "proven"
                      )}`}
                    >
                      {capabilityReviewPending
                        ? copy.discovery.contractChanged
                        : copy.discovery.contractFresh}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-stone-300">
                      {copy.discovery.fingerprintLabel}: {capabilityFingerprint}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    {capabilityReviewPending
                      ? copy.discovery.contractChangedBody
                      : copy.discovery.contractFreshBody}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span>
                      {capabilityReviewPending
                        ? copy.discovery.reviewPendingLabel
                        : copy.discovery.reviewedLabel}
                    </span>
                    {capabilityReview.acknowledgedAt ? (
                      <span>
                        {copy.discovery.reviewedAtLabel}:{" "}
                        {formatDashboardDate(
                          capabilityReview.acknowledgedAt,
                          locale
                        )}
                      </span>
                    ) : null}
                  </div>
                  {capabilityCurrentFocus ? (
                    <p className="mt-3 text-sm leading-7 text-stone-400">
                      {capabilityCurrentFocus}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs ${discoveryMarketToneClasses(
                    hasLanguageAdaptiveCopyCapability ? "feature" : "watchlist"
                  )}`}
                >
                  {copy.discovery.adaptiveCopyTitle}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                {hasLanguageAdaptiveCopyCapability
                  ? copy.discovery.adaptiveCopyBody
                  : copy.discovery.noAdaptiveCopyBody}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {capabilityReviewPending ? (
                  <button
                    type="button"
                    onClick={acknowledgeCapabilityContractReview}
                    disabled={capabilityReviewAction}
                    className="inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {capabilityReviewAction
                      ? copy.discovery.acknowledging
                      : copy.discovery.acknowledgeAction}
                  </button>
                ) : null}
                {capabilityReviewError ? (
                  <span className="text-xs text-red-300">{capabilityReviewError}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.discovery.eyebrow}
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {copy.discovery.inventoryTitle}
            </h3>
            <p className="mt-4 text-base leading-7 text-stone-300">
              {copy.discovery.inventoryBody}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {(
                [
                  [
                    copy.discovery.provenTitle,
                    provenMarkets,
                    discoveryMarketToneClasses("proven"),
                  ],
                  [
                    copy.discovery.buildoutTitle,
                    buildoutMarkets,
                    discoveryMarketToneClasses("buildout"),
                  ],
                  [
                    copy.discovery.watchlistTitle,
                    watchlistMarkets,
                    discoveryMarketToneClasses("watchlist"),
                  ],
                ] as const
              ).map(([title, markets, classes]) => (
                <div
                  key={title}
                  className="rounded-[1.15rem] border border-[var(--line-soft)] bg-black/15 p-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {title}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {markets.length > 0 ? (
                      markets.slice(0, 5).map((market) => (
                        <span
                          key={`${title}:${market}`}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
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

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.discovery.claimRuleTitle}
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                {operationalInsights.discovery_market_claim_rule ||
                  capabilityContract.product_claim_policy.rule}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-stone-200">
                  {copy.discovery.anchorsTitle}:{" "}
                  {anchorMarkets.length > 0
                    ? anchorMarkets
                        .map((market) => market.toUpperCase())
                        .join(locale === "zh" ? "、" : ", ")
                    : locale === "zh"
                      ? "无"
                      : "None"}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.discovery.reviewActionsTitle}
              </div>
              {requiredCapabilityActions.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {requiredCapabilityActions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-[1.05rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${discoveryMarketToneClasses(
                            action.required ? "buildout" : "feature"
                          )}`}
                        >
                          {action.priority}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {action.area}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-stone-200">
                        {action.action}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-stone-500">
                        {action.why}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {copy.discovery.noReviewActions}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.discovery.surfacesTitle}
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                {copy.discovery.surfacesBody}
              </p>
              {capabilitySurfaces.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {capabilitySurfaces.map((surface) => (
                    <div
                      key={surface.id}
                      className="rounded-[1.05rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${discoveryMarketToneClasses(
                            surface.audience === "customer" ? "feature" : "watchlist"
                          )}`}
                        >
                          {surface.audience === "customer"
                            ? copy.discovery.customerAudience
                            : copy.discovery.internalAudience}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {surface.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-stone-300">
                        {surface.summary}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {copy.discovery.surfacesEmpty}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.discovery.copyImpactTitle}
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                {copy.discovery.copyImpactBody}
              </p>
              {[
                [
                  copy.discovery.customerSummaryLabel,
                  capabilityCopyGuidance.customer_summary,
                ],
                [
                  copy.discovery.claimGuardrailLabel,
                  capabilityCopyGuidance.public_claim_guardrail,
                ],
                [
                  copy.discovery.salesNoteLabel,
                  capabilityCopyGuidance.sales_enablement_note,
                ],
                [
                  copy.discovery.operatorNoteLabel,
                  capabilityCopyGuidance.operator_note,
                ],
              ].some(([, value]) => Boolean(value)) ? (
                <div className="mt-4 grid gap-3">
                  {[
                    [
                      copy.discovery.customerSummaryLabel,
                      capabilityCopyGuidance.customer_summary,
                    ],
                    [
                      copy.discovery.claimGuardrailLabel,
                      capabilityCopyGuidance.public_claim_guardrail,
                    ],
                    [
                      copy.discovery.salesNoteLabel,
                      capabilityCopyGuidance.sales_enablement_note,
                    ],
                    [
                      copy.discovery.adaptiveCopyTitle,
                      capabilityCopyGuidance.localized_copy_note,
                    ],
                    [
                      copy.discovery.operatorNoteLabel,
                      capabilityCopyGuidance.operator_note,
                    ],
                  ]
                    .filter(([, value]) => Boolean(value))
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[1.05rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                      >
                        <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                          {label}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          {value}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {copy.discovery.copyImpactEmpty}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.discovery.historyTitle}
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                {copy.discovery.historyBody}
              </p>
              {recentCapabilityHistory.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {recentCapabilityHistory.map((entry) => (
                    <div
                      key={`${entry.capability_fingerprint}:${entry.generated_at}`}
                      className="rounded-[1.05rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {entry.current_focus}
                          </div>
                          <div className="mt-2 text-xs text-stone-500">
                            {formatDashboardDate(entry.generated_at, locale)}
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${capabilityHistoryToneClasses(
                            entry
                          )}`}
                        >
                          {entry.capabilities_changed || entry.requires_saas_review
                            ? copy.discovery.historyChanged
                            : copy.discovery.historyStable}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-400">
                        <span>
                          {copy.discovery.snapshotLabel}:{" "}
                          {entry.latest_state_snapshot_id || "—"}
                        </span>
                        <span>
                          {copy.discovery.fingerprintLabel}:{" "}
                          {formatFingerprint(entry.capability_fingerprint)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="rounded-[0.9rem] border border-white/10 bg-black/10 p-3">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                            {copy.discovery.addedLabel}
                          </div>
                          <div className="mt-2 text-xs leading-6 text-stone-300">
                            {entry.added_capability_ids.length > 0
                              ? entry.added_capability_ids.join(", ")
                              : locale === "zh"
                                ? "无"
                                : "none"}
                          </div>
                        </div>
                        <div className="rounded-[0.9rem] border border-white/10 bg-black/10 p-3">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                            {copy.discovery.removedLabel}
                          </div>
                          <div className="mt-2 text-xs leading-6 text-stone-300">
                            {entry.removed_capability_ids.length > 0
                              ? entry.removed_capability_ids.join(", ")
                              : locale === "zh"
                                ? "无"
                                : "none"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {copy.discovery.historyEmpty}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                {copy.discovery.sampleTitle}
              </div>

              {operationalInsights.top_paid_targets.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {operationalInsights.top_paid_targets.slice(0, 3).map((target) => (
                    <div
                      key={target.opportunity_id}
                      className="rounded-[1.05rem] border border-[var(--line-soft)] bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {target.platform_name}
                          </div>
                          <div className="mt-1 text-xs text-stone-500">
                            {target.root_domain}
                          </div>
                        </div>
                        <a
                          href={target.submit_url || target.platform_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                        >
                          {copy.discovery.openTarget}
                        </a>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-stone-300">
                        {target.why_now || target.recommended_action}
                      </p>
                      <div className="mt-3 text-xs text-stone-500">
                        {copy.discovery.sourceLabel}: {target.discovery_source}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {copy.discovery.sampleEmpty}
                </p>
              )}
            </div>
          </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section className="mt-12 grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[1.85rem] border border-[var(--line-strong)] bg-[linear-gradient(135deg,rgba(159,224,207,0.09),rgba(255,255,255,0.04))] p-7">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {proofCopy.eyebrow}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {proofCopy.title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
                {proofCopy.body}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ["receipts", workspaceProofStats.receipts],
                    ["threads", workspaceProofStats.threads],
                    ["close", workspaceProofStats.close],
                    ["verify", workspaceProofStats.verify],
                  ] as const
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {proofCopy.stats[key]}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>

              <div
                className={`mt-6 rounded-[1.25rem] border p-5 ${proofPriorityClasses(
                  globalProofPriority
                )}`}
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-current/70">
                  {proofCopy.globalFocusLabel}
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  {proofCopy.priorities[globalProofPriority].title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-200">
                  {proofCopy.priorities[globalProofPriority].body}
                </p>
                {topProofProducts[0]?.proof.activeTask ? (
                  <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-stone-200">
                    {proofCopy.activeTaskLabel}:{" "}
                    {getProofTaskStatusLabel(
                      topProofProducts[0].proof.activeTask.status,
                      proofCopy
                    )}
                  </div>
                ) : null}
                {topProofAction ? (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() =>
                        handleWorkspaceProofAction(
                          topProofProducts[0].product.id,
                          topProofAction
                        )
                      }
                      disabled={
                        proofActionKey ===
                        `${topProofProducts[0].product.id}:${topProofAction.taskType}`
                      }
                      className="inline-flex rounded-full bg-black/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/25 disabled:opacity-60"
                    >
                      {proofActionKey ===
                      `${topProofProducts[0].product.id}:${topProofAction.taskType}`
                        ? copy.productCard.starting
                        : topProofAction.label}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.85rem] border border-[var(--line-soft)] bg-white/[0.04] p-7">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {proofCopy.eyebrow}
              </p>
              <h3 className="mt-4 text-2xl font-semibold text-white">
                {proofCopy.title}
              </h3>

              {topProofProducts.length > 0 ? (
                <div className="mt-6 grid gap-4">
                  {topProofProducts.map((summary) => {
                    const proofAction = proofActionForSummary(summary, proofCopy);

                    return (
                      <div
                        key={summary.product.id}
                        className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${proofPriorityClasses(
                              summary.proof.priority
                            )}`}
                          >
                            {proofCopy.priorities[summary.proof.priority].title}
                          </span>
                          <div className="text-lg font-semibold text-white">
                            {summary.product.name}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          {proofCopy.priorities[summary.proof.priority].body}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-400">
                          {summary.proof.candidateLabels.length > 0 ? (
                            summary.proof.candidateLabels.map((label) => (
                              <span
                                key={`${summary.product.id}-${label}`}
                                className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1.5"
                              >
                                {proofCopy.candidates}: {label}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1.5">
                              {proofCopy.noCandidates}
                            </span>
                          )}
                        </div>
                        {summary.proof.activeTask ? (
                          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-stone-300">
                            {proofCopy.activeTaskLabel}:{" "}
                            {getProofTaskStatusLabel(
                              summary.proof.activeTask.status,
                              proofCopy
                            )}
                          </div>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between gap-4 text-xs text-stone-500">
                          <span>
                            {proofCopy.latestSignal}:{" "}
                            {summary.proof.lastSignalAt
                              ? formatDashboardDate(summary.proof.lastSignalAt, locale)
                              : "—"}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleWorkspaceProofAction(
                                  summary.product.id,
                                  proofAction
                                )
                              }
                              disabled={
                                proofActionKey ===
                                `${summary.product.id}:${proofAction.taskType}`
                              }
                              className="rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                            >
                              {proofActionKey ===
                              `${summary.product.id}:${proofAction.taskType}`
                                ? copy.productCard.starting
                                : proofAction.label}
                            </button>
                            <Link
                              href={withPriorityContext(
                                `/dashboard/product/${summary.product.id}`,
                                summary.product.id,
                                workspaceStrategyLead?.product.id === summary.product.id
                              )}
                              className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                            >
                              {proofCopy.openProduct}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-6 text-sm leading-7 text-stone-400">
                  {proofCopy.empty}
                </p>
              )}
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
                {orderedProductSummaries.map((summary) => {
                  const weeklyBurn = productWeeklyBurnById.get(summary.product.id) || 0;
                  const productPolicy = productPolicyById.get(summary.product.id);
                  const isCurrentPriority =
                    workspaceStrategyLead?.product.id === summary.product.id;
                  const productDetailHref = withPriorityContext(
                    `/dashboard/product/${summary.product.id}`,
                    summary.product.id,
                    isCurrentPriority
                  );
                  const budgetDecision =
                    productBudgetDecisionById.get(summary.product.id) || {
                      key: "build_queue" as const,
                    };
                  const budgetAction = budgetActionForSummary({
                    locale,
                    summary,
                    decision: budgetDecision,
                    currentPlan,
                    productPolicy,
                  });
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
                  const launchAction =
                    !productPolicy?.reclaimReason &&
                    isLaunchAction(summary.primaryAction)
                      ? summary.primaryAction
                      : null;
                  const linkAction = isLinkAction(summary.primaryAction)
                    ? summary.primaryAction
                    : null;
                  const proofAction =
                    summary.proof.priority !== "build_signal"
                      ? proofActionForSummary(summary, proofCopy)
                      : null;
                  const ownedLanes =
                    productOwnedLanesById.get(summary.product.id) || [];
                  const ownershipSummary = workspaceOwnershipSummary(
                    ownedLanes,
                    locale
                  );
                  const reclaimGuidance = workspaceReclaimGuidance({
                    locale,
                    summary,
                    productPolicy,
                  });

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
                            {ownedLanes.map((lane) => (
                              <span
                                key={`${summary.product.id}:${lane}:owner`}
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${workspaceCapacityLaneClasses(
                                  lane
                                )}`}
                              >
                                {workspaceCapacityCopy.laneLabels[lane]}
                              </span>
                            ))}
                            {workspaceStrategyLead?.product.id === summary.product.id ? (
                              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                                {locale === "zh" ? "当前优先" : "Current priority"}
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
                          {ownershipSummary ? (
                            <p className="mt-3 text-sm leading-7 text-stone-300">
                              <span className="mr-2 text-xs uppercase tracking-[0.24em] text-stone-500">
                                {locale === "zh"
                                  ? "本周优先级"
                                  : "This week"}
                              </span>
                              {ownershipSummary}
                            </p>
                          ) : null}
                          {reclaimGuidance ? (
                            <div
                              className={`mt-4 rounded-[1rem] border p-4 text-sm leading-7 ${reclaimGuidance.tone}`}
                            >
                              <div className="text-[11px] uppercase tracking-[0.22em] text-current/75">
                                {copy.productCard.reclaimTitle}
                              </div>
                              <div className="mt-2 font-medium text-current">
                                {reclaimGuidance.title}
                              </div>
                              <p className="mt-2 text-current/85">
                                {reclaimGuidance.body}
                              </p>
                            </div>
                          ) : null}
                          {summary.proof.priority !== "build_signal" ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${proofPriorityClasses(
                                  summary.proof.priority
                                )}`}
                              >
                                {proofCopy.priorities[summary.proof.priority].title}
                              </span>
                              <span className="text-xs text-stone-500">
                                {summary.proof.counts.verify}/{summary.proof.counts.close}/
                                {summary.proof.counts.threads} ·{" "}
                                {proofCopy.stats.verify}/{proofCopy.stats.close}/
                                {proofCopy.stats.threads}
                              </span>
                            </div>
                          ) : null}

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
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                            <div className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {copy.productCard.weeklyBurn}
                              </div>
                              <div className="mt-2 text-2xl font-semibold text-white">
                                ~{formatCreditsEstimate(weeklyBurn)}
                              </div>
                              <div className="mt-2 text-xs leading-6 text-stone-500">
                                {copy.productCard.weeklyBurnNote}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4 text-sm leading-7 text-stone-300">
                            <div className="mb-4 rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {copy.productCard.budgetCall}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-medium ${productBudgetDecisionClasses(
                                    budgetDecision.key
                                  )}`}
                                >
                                  {
                                    copy.productCard.budgetLabels[
                                      budgetDecision.key
                                    ]
                                  }
                                </span>
                              </div>
                              <div className="mt-3 text-sm leading-7 text-stone-300">
                                {copy.productCard.budgetBodies[budgetDecision.key]}
                              </div>
                              <div className="mt-4">
                                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                  {copy.productCard.budgetAction}
                                </div>
                                <div className="mt-3">
                                  {budgetAction.kind === "proof" ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleWorkspaceProofAction(
                                          summary.product.id,
                                          budgetAction.proofAction
                                        )
                                      }
                                      disabled={
                                        proofActionKey ===
                                        `${summary.product.id}:${budgetAction.proofAction.taskType}`
                                      }
                                      className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60"
                                    >
                                      {proofActionKey ===
                                      `${summary.product.id}:${budgetAction.proofAction.taskType}`
                                        ? copy.productCard.starting
                                        : budgetAction.label}
                                    </button>
                                  ) : budgetAction.kind === "launch" ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleWorkspaceLaunch(
                                          summary.product.id,
                                          budgetAction.channelId
                                        )
                                      }
                                      disabled={
                                        launchingKey ===
                                        `${summary.product.id}:${budgetAction.channelId}`
                                      }
                                      className="rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                                    >
                                      {launchingKey ===
                                      `${summary.product.id}:${budgetAction.channelId}`
                                        ? copy.productCard.starting
                                        : budgetAction.label}
                                    </button>
                                  ) : budgetAction.href.startsWith("/api/") ? (
                                    <a
                                      href={budgetAction.href}
                                      className="inline-flex rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                                    >
                                      {budgetAction.label}
                                    </a>
                                  ) : (
                                    <Link
                                      href={budgetAction.href}
                                      className="inline-flex rounded-full border border-[var(--line-soft)] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                                    >
                                      {budgetAction.label}
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
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
                            {summary.proof.activeTask ? (
                              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-stone-300">
                                {proofCopy.activeTaskLabel}:{" "}
                                {getProofTaskStatusLabel(
                                  summary.proof.activeTask.status,
                                  proofCopy
                                )}
                              </div>
                            ) : null}
                            {proofAction ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleWorkspaceProofAction(
                                    summary.product.id,
                                    proofAction
                                  )
                                }
                                disabled={
                                  proofActionKey ===
                                  `${summary.product.id}:${proofAction.taskType}`
                                }
                                className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60"
                              >
                                {proofActionKey ===
                                `${summary.product.id}:${proofAction.taskType}`
                                  ? copy.productCard.starting
                                  : proofAction.label}
                              </button>
                            ) : null}
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
                                href={
                                  withPriorityContext(
                                    linkAction?.href || productDetailHref,
                                    summary.product.id,
                                    isCurrentPriority
                                  ) || productDetailHref
                                }
                                className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                              >
                                {linkAction?.label || copy.productCard.open}
                              </Link>
                            )}
                            <Link
                              href={productDetailHref}
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
