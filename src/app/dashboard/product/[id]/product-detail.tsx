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
import type {
  ManagedInboxLiveActivity,
  ManagedInboxEventState,
  ManagedInboxLaunchPacketThreadStage,
  ManagedInboxRecord,
} from "@/lib/managed-inbox-types";
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
  today_quality_root_domain_count: number;
  source_library_root_domain_count: number;
  source_segments: Record<string, number>;
  playbook: {
    updated_at: string;
    learned_from_live_execution: boolean;
    source_campaign: string;
    north_star_metric: string;
    north_star_target: number;
    measurement_status: string;
    current_domain_rating: number | null;
    remaining_gap: number | null;
    quality_bar_ids: string[];
    recommended_lane_ids: string[];
    anti_pattern_ids: string[];
    proof_snapshot: {
      host_public_verified_count: number;
      today_action_root_domain_count: number;
      reusable_root_domain_count: number;
    };
    raw: {
      operating_principles: string[];
      winning_patterns: string[];
      anti_patterns: string[];
      lane_labels: Record<string, string>;
      anti_pattern_labels: Record<string, string>;
    };
  };
}

const PLAN_ORDER = ["free", "starter", "growth", "scale"] as const;
type ExpansionAction =
  | {
      kind: "launch";
      channelId: string;
      label: string;
    }
  | {
      kind: "href";
      href: string;
      label: string;
    };

type LocalizedPlaybookItem = {
  zh: {
    title: string;
    description: string;
  };
  en: {
    title: string;
    description: string;
  };
};

const PLAYBOOK_LANE_COPY: Record<string, LocalizedPlaybookItem> = {
  editorial_resource_outreach: {
    zh: {
      title: "编辑/资源页外联",
      description: "优先拿独立站点上的真实编辑位、资源页或专题页收录。",
    },
    en: {
      title: "Editorial/resource outreach",
      description: "Prioritize real placements on independent editorial, roundup, and resource pages.",
    },
  },
  editorial_email_outreach: {
    zh: {
      title: "高质量邮件外联",
      description: "面向明确编辑对象发少量高匹配邮件，而不是群发堆量。",
    },
    en: {
      title: "High-fit email outreach",
      description: "Send a small number of high-fit outreach emails instead of chasing bulk volume.",
    },
  },
  public_verification_followup: {
    zh: {
      title: "公开验证跟进",
      description: "已提交后持续复查，直到拿到公开可见证明或明确降级。",
    },
    en: {
      title: "Public verification follow-up",
      description: "Keep following up until the link is publicly visible or explicitly downgraded.",
    },
  },
  new_root_domain_discovery: {
    zh: {
      title: "新根域发现",
      description: "持续补充新的高质量根域名，避免在旧站点上重复刷量。",
    },
    en: {
      title: "New root-domain discovery",
      description: "Keep adding new worthwhile roots instead of recycling the same host families.",
    },
  },
  route_recovery: {
    zh: {
      title: "高价值路由恢复",
      description: "对高相关目标继续找可执行入口，而不是轻易放弃。",
    },
    en: {
      title: "Route recovery",
      description: "Recover viable submit or contact paths on high-fit targets before giving up.",
    },
  },
  submit_surface_discovery: {
    zh: {
      title: "提交入口探测",
      description: "先找真正可执行的表单或编辑入口，再决定是否投入动作。",
    },
    en: {
      title: "Submit-surface discovery",
      description: "Find the real submit or contact surface before spending execution effort.",
    },
  },
  high_value_followup: {
    zh: {
      title: "高价值补跟进",
      description: "对已命中的好机会继续推进，不把好线索停在第一步。",
    },
    en: {
      title: "High-value follow-up",
      description: "Push valuable openings forward instead of letting them stall after the first touch.",
    },
  },
};

const QUALITY_BAR_COPY: Record<string, LocalizedPlaybookItem> = {
  topic_relevance: {
    zh: {
      title: "主题相关",
      description: "目标站点必须和产品用例、受众或主题高度相关。",
    },
    en: {
      title: "Topic relevance",
      description: "The target must strongly match the product use case, audience, or topic.",
    },
  },
  host_audience_value: {
    zh: {
      title: "对宿主有价值",
      description: "这次推荐应当真的能帮助宿主页内容或它的读者。",
    },
    en: {
      title: "Value to the host",
      description: "The placement should genuinely improve the host page or help its audience.",
    },
  },
  service_grade_value: {
    zh: {
      title: "达到服务级别",
      description: "方法必须好到值得以后作为付费服务交付给客户。",
    },
    en: {
      title: "Service-grade method",
      description: "The method should be strong enough to justify shipping it as a paid service later.",
    },
  },
};

const ANTI_PATTERN_COPY: Record<string, LocalizedPlaybookItem> = {
  repeat_host_inflation: {
    zh: {
      title: "重复根域刷量",
      description: "不要把同一批站点的重复动作误当成权威增长。",
    },
    en: {
      title: "Repeat-host inflation",
      description: "Do not mistake repeated actions on the same host families for authority growth.",
    },
  },
  community_volume_as_authority: {
    zh: {
      title: "社区量冒充权威",
      description: "社区/GitHub 量不是独立宿主权威，不能拿来替代高质量站点。",
    },
    en: {
      title: "Community volume as authority",
      description: "Community or GitHub volume does not replace independent-host authority.",
    },
  },
  homepage_only_pitching: {
    zh: {
      title: "只推首页",
      description: "优先推具体用例页、对比页和资源页，不要永远只推首页。",
    },
    en: {
      title: "Homepage-only pitching",
      description: "Prefer use-case, comparison, and resource pages over always pitching the homepage.",
    },
  },
  low_trust_directory_shells: {
    zh: {
      title: "低信任壳目录",
      description: "不要把低信任目录壳站当成和编辑类 mention 一样的价值。",
    },
    en: {
      title: "Low-trust directory shells",
      description: "Do not treat low-trust directory shells like real editorial mentions.",
    },
  },
  knowledge_trapped_in_chat: {
    zh: {
      title: "知识停在聊天里",
      description: "重复出现的判断要沉淀成系统能力，而不是留在人工记忆里。",
    },
    en: {
      title: "Knowledge trapped in chat",
      description: "Repeated judgment should become reusable system capability, not stay in chat memory.",
    },
  },
};

const EMPTY_PLAYBOOK = {
  updated_at: "",
  learned_from_live_execution: false,
  source_campaign: "",
  north_star_metric: "",
  north_star_target: 0,
  measurement_status: "",
  current_domain_rating: null,
  remaining_gap: null,
  quality_bar_ids: [] as string[],
  recommended_lane_ids: [] as string[],
  anti_pattern_ids: [] as string[],
  proof_snapshot: {
    host_public_verified_count: 0,
    today_action_root_domain_count: 0,
    reusable_root_domain_count: 0,
  },
  raw: {
    operating_principles: [] as string[],
    winning_patterns: [] as string[],
    anti_patterns: [] as string[],
    lane_labels: {} as Record<string, string>,
    anti_pattern_labels: {} as Record<string, string>,
  },
};

function localizePlaybookItem(
  locale: Locale,
  catalog: Record<string, LocalizedPlaybookItem>,
  id: string,
  fallbackTitle?: string
) {
  const entry = catalog[id];
  if (!entry) {
    return {
      title: fallbackTitle || id,
      description: "",
    };
  }
  return locale === "zh" ? entry.zh : entry.en;
}

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
      offerBoundary: {
        eyebrow: "当前交付层",
        title: "先看这个产品现在走的是哪一层。",
        body:
          "这块不解释系统架构，只回答四件事：哪些已经在套餐内、托管邮箱现在是什么状态、哪些机会会单独处理、哪些地方已经进入人工服务层。",
        labels: {
          included: "套餐内",
          addOn: "可选加购",
          separate: "单独处理",
          service: "按服务售卖",
          active: "当前已开启",
          byo: "当前用你的邮箱",
          locked: "升级后可用",
          openManaged: "打开托管邮箱",
          openResults: "打开结果动作",
          seePricing: "查看方案",
        },
        cards: {
          core: {
            eyebrow: "核心软件层",
            freeTitle: "当前还停在软件层，真实提交还没解锁。",
            freeBody:
              "产品登记、结果中心和动作清单已经可用，但真实提交还没开始。升级后，这层会继续承接真正的执行。",
            liveTitle: "这个产品正在跑套餐内的核心软件层。",
            liveBody:
              "真实提交、结果中心和动作清单都属于这一层。它卖的是可重复运行的软件体验，不是一次性的人工代办。",
          },
          managed: {
            eyebrow: "托管外联邮箱",
            activeTitle: "这个产品已经切到托管外联邮箱。",
            activeBody:
              "平台现在负责专属邮箱、代发、代回和线程回流。这是一条独立交付层，不应该和自带邮箱混在一起。",
            byoTitle: "这个产品当前走的是你自己的邮箱。",
            byoBody:
              "托管邮箱没有自动生效。你现在明确走的是自带邮箱路径，后面如果要切换，再单独开启托管层。",
            readyTitle: "当前计划已经允许切到托管邮箱。",
            readyBody:
              "这层是可选加购，不是默认一起送。你可以继续用自己的邮箱，也可以在需要时切过去。",
            lockedTitle: "托管邮箱还没解锁。",
            lockedBody:
              "当前计划还停在核心软件层。托管邮箱应该作为更高一层的可买能力，而不是提前伪装成默认包含。",
          },
          paid: {
            eyebrow: "付费机会层",
            activeTitle: "已经出现需要单独判断的付费机会。",
            activeBody:
              "这类机会不该混进普通提交或 credits 里。它们应该被当成独立机会层，单独判断值不值得继续推进。",
            idleTitle: "付费机会不会混进基础提交里。",
            idleBody:
              "收费型、商务型外链机会会单独沉淀和处理，不会伪装成基础套餐已经包含的结果。",
          },
          manual: {
            eyebrow: "人工服务层",
            activeTitle: "这个产品已经进入人工推进层。",
            activeBody:
              "现在的价值来自人工 review、补资料或定制推进，而不是再假装一切都已经自动化完成。",
            idleTitle: "人工服务只在自动化不够时介入。",
            idleBody:
              "复杂 review、人工处理和定制推进应该诚实按服务说明，而不是继续包装成纯软件动作。",
          },
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
        proofTitle: "结果证明",
        proofBody:
          "这里展示的是最近一轮真实执行留下来的站点回执和阻塞项，不是抽象统计。",
        receiptsTitle: "最近成功回执",
        blockersTitle: "需要复盘的阻塞项",
        successBadge: "成功",
        blockedBadge: "阻塞",
        noReceipts:
          "这轮还没有留下清晰的成功回执。继续执行后，这里会开始沉淀更具体的结果证明。",
        noBlockers: "最近一轮没有明显的阻塞项需要复盘。",
        openHistory: "查看执行历史",
        openDashboard: "回到工作台",
        launchNext: "启动推荐渠道",
        retryLane: "重跑这一条渠道",
      },
      resultsProof: {
        title: "结果证明页",
        body:
          "这里不再把回执、回复和接近发布的线索混在一起。它只回答四件事：已经拿到哪些公开结果、哪些马上就要公开、哪些只是内部信号，以及现在能不能对外讲。",
        stats: {
          public: "公开结果",
          nearPublic: "接近公开",
          threads: "真实回复",
          internal: "内部信号",
        },
        statusLabel: "当前证明状态",
        statuses: {
          public: {
            badge: "可对外展示",
            title: "已经出现可展示的公开结果。",
            body: "这些线程已经明显指向上线、收录或公开页面。现在最值钱的是抓页面证据、补验证，并把它们沉淀成真正的成果层。",
          },
          nearPublic: {
            badge: "接近公开，暂勿外宣",
            title: "已经接近公开结果，但还不能对外说。",
            body: "这些线索只差最后确认。现在该守住最后一轮推进，而不是提前包装成成果。",
          },
          threads: {
            badge: "内部推进中",
            title: "已经有真实回复，但还只是内部推进。",
            body: "回复和审核信号说明方向对了，但还不是公开结果。先继续跟进，不要过早对外承诺。",
          },
          receipts: {
            badge: "只有内部信号",
            title: "已经有真实动作，但还没有公开证明。",
            body: "提交回执说明执行在推进，但还不能拿来当最终成果。下一步是把它推到公开可见。",
          },
          empty: {
            badge: "尚未进入证明层",
            title: "还没有进入结果证明层。",
            body: "先把 live 渠道和托管外联跑起来，等第一批回执和回复累积起来，这里才会开始变得有价值。",
          },
        },
        publicTitle: "现在可以展示的结果",
        publicBody:
          "只有已经指向公开页面、上线或收录完成的线索，才应该进入这一区。",
        publicEmpty:
          "当前还没有足够稳的公开结果。先继续把最接近发布的线索推过去。",
        nearTitle: "最接近公开的线索",
        nearBody:
          "这些不是最终成果，但已经足够接近，值得优先保护和跟进。",
        nearEmpty:
          "当前还没有明显接近公开的线索。继续累积回复和高质量动作。",
        internalTitle: "内部信号，不要拿去外宣",
        internalBody:
          "这些回执和早期回复能说明方向对了，但还不能直接当作公开成果展示。",
        internalEmpty:
          "当前还没有足够的内部信号。先跑出第一批真实动作和回复。",
        publicBadge: "公开结果",
        internalBadge: "内部信号",
        latestSignal: "最近信号",
        openProofPipeline: "打开结果动作",
      },
      proofPipeline: {
        title: "结果推进管线",
        body:
          "这里不再盯局部动作，而是看这个产品离“拿到可证明结果”还有多远，以及现在最值得推进哪一步。",
        stats: {
          receipts: "提交回执",
          threads: "真实回复线程",
          close: "接近发布",
          verify: "待验证证明",
        },
        priorityTitle: "当前最值得推进的动作",
        candidatesTitle: "当前最接近结果的候选",
        latestTaskTitle: "最近结果任务",
        latestTaskStatus: "任务状态",
        latestTaskQueuedAt: "排队时间",
        latestTaskUpdatedAt: "最近更新",
        latestTaskCompletedAt: "完成时间",
        latestTaskReference: "任务引用",
        openTask: "打开当前结果任务",
        startingTask: "开始推进",
        markProved: "标记为已证明",
        markDropped: "标记为已放弃",
        updatingTask: "更新中...",
        taskStatus: {
          queued: "已排队",
          in_progress: "进行中",
          proved: "已证明",
          dropped: "已放弃",
        },
        candidatesEmpty:
          "现在还没有足够强的 proof 候选。继续推进 live 渠道和外联线程后，这里会开始出现最接近拿到证明的目标。",
        receiptCandidateLabel: "提交回执",
        priorities: {
          publishedTitle: "先验证已经接近落地的结果",
          publishedBody:
            "有线程已经明显指向上线或收录完成。现在最值钱的是抓公开页面、保存证明，并把它们推进到结果层。",
          publicationReadyTitle: "先守住接近发布的线程",
          publicationReadyBody:
            "这些线程已经非常接近结果，最怕在最后一轮确认里掉线。先把它们盯紧。",
          materialsTitle: "先把对方要的资料补齐",
          materialsBody:
            "回复已经来了，但价值卡在素材、描述或截图。现在不是继续发新线程，而是把这些资料补快。",
          commercialTitle: "先筛掉不值得付费的机会",
          commercialBody:
            "线程已经进入商务条件。先决定哪些机会值得继续、哪些应该直接放弃。",
          reviewTitle: "先设跟进节奏，守住审核中的机会",
          reviewBody:
            "这些线程还在内部审核或评估阶段，最重要的是别让它们在没有 follow-up 的情况下自然冷掉。",
          receiptTitle: "先把提交回执往公开证明推进",
          receiptBody:
            "虽然还没有强回复线程，但已经有真实提交动作成功。下一步应该去追公开可见结果，而不是停在回执层。",
          fallbackTitle: "继续累积结果信号",
          fallbackBody:
            "当前还没有足够强的 proof 候选。先继续跑 live 渠道和托管外联，把结果面做厚。",
        },
      },
      launchMap: {
        title: "Launch 路线图",
        body: "这里把每条 live 渠道在这个产品上的状态串成一条推进路径，让你一眼知道已经完成了什么、下一步该跑什么。",
        status: {
          locked: "未解锁",
          ready: "待启动",
          recommended: "推荐下一条",
          running: "执行中",
          completed: "已完成",
          failed: "需复盘",
        },
        lockedBody: "先升级计划后，才能把这条渠道加入真实执行。",
        readyBody: "这条 live 渠道已经就绪，可以直接启动。",
        recommendedBody: "这是当前最值得先跑的下一条渠道。",
        runningBody: "worker 正在处理这条渠道，先看进度。",
        completedBody: "这条渠道已经跑过，当前有结果可复盘。",
        failedBody: "这条渠道最近一轮没有顺利完成，值得优先复盘。",
      },
      expansion: {
        title: "扩张路径",
        body:
          "把当前能跑的、下一档会解锁的、以及更深一层的分发路线压成一条清晰路径，让升级和执行都更像产品决策。",
        currentEyebrow: "当前层",
        nextEyebrow: "下一档",
        laterEyebrow: "更深一层",
        setupTitle: "免费配置已经完成。",
        setupBody:
          "你已经把产品资料放进系统里。现在最值钱的是把它切进第一条 live 渠道，而不是继续停在配置态。",
        runTitle: "当前层先把 live 渠道跑深。",
        runBody:
          "先用现在这档计划把推荐渠道跑起来，再决定是不是继续扩层。",
        activeTitle: "先等这一轮跑完。",
        activeBody:
          "这条 live 渠道正在处理。最好的下一步是基于结果决定是否扩到下一层。",
        reviewTitle: "当前层已经有结果可用了。",
        reviewBody:
          "先吃透这一层的结果，再决定是否需要上更深的分发层。",
        nextImmediateBody:
          "这一档会立刻多出可执行渠道，适合现在就把分发半径拉开。",
        nextPlannedBody:
          "这一档主要是把下一层分发路线排进来。今天不一定立刻能跑，但升级方向会更清楚。",
        laterBody:
          "更后面的计划负责更深的分发层和更重的外联动作，适合等当前层跑顺后再开。",
        maxTitle: "当前已经在最高档。",
        maxBody:
          "现在更值钱的是把已有 live 渠道跑深，并结合结果证明与执行智能做取舍。",
        currentAction: "先执行当前推荐",
        watchRun: "先看当前进度",
        reviewHistory: "查看执行历史",
        upgradeTo: "升级到",
        seePlans: "查看计划",
        includedNow: "当前已包含",
        unlocksNext: "下一档会增加",
        laterUnlocks: "更后面会增加",
        playbookSignal: "最佳实践正在指向",
        noFurtherUnlocks: "没有更多计划层可解锁",
        runnableNow: "今天可跑",
        rolloutQueue: "等待 rollout",
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
        playbookTitle: "当前最佳实践",
        playbookBody:
          "这套规则会随着真实执行持续更新，并直接影响系统该优先投入哪些通道、该过滤哪些低价值动作。",
        prioritiesTitle: "当前优先",
        qualityBarTitle: "质量门槛",
        avoidTitle: "当前避免",
        learnedFromLive: "这些规则来自真实执行反馈，而不是静态模板。",
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
    offerBoundary: {
      eyebrow: "Current delivery layer",
      title: "Start by seeing what layer this product is actually using.",
      body:
        "This does not explain the system architecture. It answers four simple questions: what is already included in the plan, what state the managed inbox is in, what gets handled as paid opportunity work, and where manual service has started to take over.",
      labels: {
        included: "Included in plan",
        addOn: "Optional add-on",
        separate: "Handled separately",
        service: "Sold as service",
        active: "Active now",
        byo: "Using your inbox",
        locked: "Upgrade to use",
        openManaged: "Open managed inbox",
        openResults: "Open result actions",
        seePricing: "See plans",
      },
      cards: {
        core: {
          eyebrow: "Core software layer",
          freeTitle: "This product is still on the software layer only.",
          freeBody:
            "Setup, the results center, and the action list are already available, but live submissions are not unlocked yet. Upgrade and this same layer starts driving real execution.",
          liveTitle: "This product is already using the core software layer.",
          liveBody:
            "Live submissions, the results center, and the action list all belong here. This is repeatable software value, not one-off manual fulfillment hiding inside the plan.",
        },
        managed: {
          eyebrow: "Managed Outreach Inbox",
          activeTitle: "This product is already on the managed inbox path.",
          activeBody:
            "The platform now owns the dedicated inbox, send, reply, and thread flow. This is a separate delivery layer and should not be blurred with bring-your-own-inbox mode.",
          byoTitle: "This product is currently using your own inbox.",
          byoBody:
            "Managed mode has not silently taken over. You are clearly on the bring-your-own-inbox path unless you explicitly switch later.",
          readyTitle: "The current plan can already add managed inbox.",
          readyBody:
            "This layer is optional, not silently bundled. You can stay on your own inbox or switch when you need platform-run sending.",
          lockedTitle: "Managed inbox is not unlocked yet.",
          lockedBody:
            "The current plan is still on the core software layer. Managed inbox should stay an honest higher-layer purchase, not a fake default inclusion.",
        },
        paid: {
          eyebrow: "Paid opportunity layer",
          activeTitle: "This product already has paid opportunities that need separate judgment.",
          activeBody:
            "Commercial opportunities should not be mixed into normal submissions or credits. They belong in a separate lane where you decide whether they are worth it.",
          idleTitle: "Paid opportunities do not belong inside base submissions.",
          idleBody:
            "Commercial or sponsorship-style opportunities are tracked separately instead of pretending they are already part of the base plan outcome.",
        },
        manual: {
          eyebrow: "Manual service layer",
          activeTitle: "This product has already entered a manual follow-through layer.",
          activeBody:
            "The value now comes from review, asset prep, or custom human follow-through. The product should say that plainly instead of pretending automation already did the whole job.",
          idleTitle: "Manual service only shows up when automation stops being enough.",
          idleBody:
            "Complex review, custom handling, and human follow-through should be sold and explained as service work instead of being disguised as pure software.",
        },
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
      proofTitle: "Result proof",
      proofBody:
        "These are receipts and blockers captured from the latest real run, not abstract metrics.",
      receiptsTitle: "Latest success receipts",
      blockersTitle: "Blockers to review",
      successBadge: "success",
      blockedBadge: "blocked",
      noReceipts:
        "This run has not left behind clear success receipts yet. As execution continues, more concrete proof should appear here.",
      noBlockers: "There are no obvious blockers from the latest run that need review.",
      openHistory: "View Submission History",
        openDashboard: "Back to Dashboard",
        launchNext: "Launch Recommended Lane",
        retryLane: "Retry This Lane",
      },
      resultsProof: {
        title: "Results proof",
        body:
          "This is where receipts, replies, near-publication threads, and public outcomes stop blending together. It answers four questions: what is public now, what is close to public, what is still internal signal, and what is safe to say externally.",
        stats: {
          public: "Public results",
          nearPublic: "Near public",
          threads: "Live replies",
          internal: "Internal signal",
        },
        statusLabel: "Current proof status",
        statuses: {
          public: {
            badge: "Safe to show",
            title: "This product already has public result candidates.",
            body: "At least one thread already points toward a public page, live placement, or completed listing. Capture proof and turn it into a visible outcome layer now.",
          },
          nearPublic: {
            badge: "Close, not public yet",
            title: "This product is close to public proof, but not there yet.",
            body: "These signals are one step away from public proof. Protect the final move instead of marketing them too early.",
          },
          threads: {
            badge: "Internal progress",
            title: "This product already has live replies, but not public proof yet.",
            body: "Replies and review signals show traction, but they are still internal progress. Keep pushing instead of claiming too much too early.",
          },
          receipts: {
            badge: "Internal signal only",
            title: "Real actions landed, but there is no public proof yet.",
            body: "Submission receipts show execution is working, but they are not final outcomes. The next move is pushing them toward something publicly visible.",
          },
          empty: {
            badge: "No proof layer yet",
            title: "This product has not entered the proof layer yet.",
            body: "Run the live lanes and managed outreach first. This section becomes valuable only after real actions and replies start landing.",
          },
        },
        publicTitle: "Safe to show now",
        publicBody:
          "Only threads that already point toward public pages, live placements, or completed listings belong here.",
        publicEmpty:
          "There is no stable public proof yet. Push the strongest near-public signals further first.",
        nearTitle: "Closest to public proof",
        nearBody:
          "These are not final outcomes yet, but they are close enough to deserve most of the attention.",
        nearEmpty:
          "There are no strong near-public signals yet. Keep building replies and stronger action quality.",
        internalTitle: "Internal signal, not external proof",
        internalBody:
          "These receipts and early thread signals show traction, but they should stay internal until they turn public.",
        internalEmpty:
          "There is not enough internal signal yet. Land the first real actions and replies first.",
        publicBadge: "Public proof",
        internalBadge: "Internal signal",
        latestSignal: "Latest signal",
        openProofPipeline: "Open proof actions",
      },
      proofPipeline: {
        title: "Proof pipeline",
        body:
          "This moves the view away from local actions and toward a bigger question: how close is this product to a result you can actually prove?",
      stats: {
        receipts: "Submission receipts",
        threads: "Live reply threads",
        close: "Close to publication",
        verify: "Ready to verify",
      },
      priorityTitle: "Highest-value move right now",
      candidatesTitle: "Closest candidates to a real result",
      latestTaskTitle: "Latest proof task",
      latestTaskStatus: "Task status",
      latestTaskQueuedAt: "Queued at",
      latestTaskUpdatedAt: "Last updated",
      latestTaskCompletedAt: "Completed at",
      latestTaskReference: "Task reference",
      openTask: "Open current proof task",
      startingTask: "Start task",
      markProved: "Mark as proved",
      markDropped: "Mark as dropped",
      updatingTask: "Updating...",
      taskStatus: {
        queued: "Queued",
        in_progress: "In progress",
        proved: "Proved",
        dropped: "Dropped",
      },
      candidatesEmpty:
        "There are no strong proof candidates yet. As live lanes and outreach threads keep moving, the closest targets should start showing up here.",
      receiptCandidateLabel: "Submission receipt",
      priorities: {
        publishedTitle: "Verify the results that look close to live",
        publishedBody:
          "At least one thread already points toward a live placement. The valuable move now is capturing proof and moving it into the result layer.",
        publicationReadyTitle: "Protect the threads closest to publication",
        publicationReadyBody:
          "These conversations are close to becoming results. The main risk now is losing momentum during the final confirmation step.",
        materialsTitle: "Send the materials the target already asked for",
        materialsBody:
          "The reply exists, but the value is stuck behind missing assets, copy, or screenshots. Ship those before opening more threads.",
        commercialTitle: "Filter the opportunities that are not worth paying for",
        commercialBody:
          "These threads have moved into pricing or sponsorship territory. Decide quickly which ones deserve budget and which should be dropped.",
        reviewTitle: "Hold the threads that are under review",
        reviewBody:
          "These opportunities are being evaluated internally. The important move is protecting them with a clear follow-up rhythm.",
        receiptTitle: "Push submission receipts toward public proof",
        receiptBody:
          "There may not be strong reply threads yet, but real submission actions already landed. The next step is pushing them toward visible proof.",
        fallbackTitle: "Keep building result signal",
        fallbackBody:
          "There are not enough strong proof candidates yet. Keep running live lanes and managed outreach until the result layer thickens.",
      },
    },
    launchMap: {
      title: "Launch map",
      body:
        "This turns the live lanes into a single progression path, so you can see what is done, what is running, and what should run next.",
      status: {
        locked: "Locked",
        ready: "Ready",
        recommended: "Recommended",
        running: "Running",
        completed: "Completed",
        failed: "Review needed",
      },
      lockedBody: "Upgrade the plan before this lane can join live execution.",
      readyBody: "This live lane is ready and can be launched immediately.",
      recommendedBody: "This is the best next lane to run right now.",
      runningBody: "The worker is already processing this lane, so watch progress first.",
      completedBody: "This lane has already run and now has outcomes to review.",
      failedBody: "The latest run for this lane did not finish cleanly and should be reviewed first.",
    },
    expansion: {
      title: "Expansion path",
      body:
        "Compress what runs now, what the next plan unlocks, and what sits one layer deeper into a single path, so upgrading feels like a product decision instead of a pricing table.",
      currentEyebrow: "Current layer",
      nextEyebrow: "Next plan",
      laterEyebrow: "Deeper layer",
      setupTitle: "Free setup is already done.",
      setupBody:
        "The product profile is already inside the system. The valuable move now is pushing it into the first live lane, not leaving it parked in setup mode.",
      runTitle: "Run the current live layer deeper first.",
      runBody:
        "Use the current plan to run the recommended lane first, then decide whether the product needs a wider layer.",
      activeTitle: "Let this run finish first.",
      activeBody:
        "This live lane is already in progress. The best next decision comes after the result lands.",
      reviewTitle: "The current layer already has usable signal.",
      reviewBody:
        "Absorb what this layer has produced first, then decide whether a deeper distribution tier is justified.",
      nextImmediateBody:
        "This plan adds runnable lanes immediately, so it is the fastest way to widen distribution right now.",
      nextPlannedBody:
        "This plan mostly lines up the next distribution layer. It may not run instantly today, but it makes the upgrade path concrete.",
      laterBody:
        "The later plan is where the deeper distribution stack and heavier outreach motions live. It matters after the current layer is working.",
      maxTitle: "You are already on the top plan.",
      maxBody:
        "The high-value move now is pushing the current live lanes deeper and using result proof plus execution intelligence to choose carefully.",
      currentAction: "Run current recommendation",
      watchRun: "Watch current run",
      reviewHistory: "Review history",
      upgradeTo: "Upgrade to",
      seePlans: "See plans",
      includedNow: "Included now",
      unlocksNext: "Adds next",
      laterUnlocks: "Adds later",
      playbookSignal: "Live playbook is leaning toward",
      noFurtherUnlocks: "No further plan layer to unlock",
      runnableNow: "Runnable today",
      rolloutQueue: "Waiting for rollout",
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
      playbookTitle: "Current best-practice playbook",
      playbookBody:
        "These rules update as live execution changes, and they directly shape which lanes the system should push or avoid next.",
      prioritiesTitle: "Current priorities",
      qualityBarTitle: "Quality bar",
      avoidTitle: "Avoid now",
      learnedFromLive: "These rules are learned from live execution feedback, not static templates.",
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

function pathTail(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  const parts = normalized.split("/");
  return parts[parts.length - 1] || normalized;
}

function summarizeResultOutput(output: string, locale: Locale) {
  const cleaned = output
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => line.length > 6);

  if (!cleaned) {
    return locale === "zh"
      ? "执行已记录，但当前没有可展示的文本回执。"
      : "The run was recorded, but there is no readable receipt text to show yet.";
  }

  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
}

function launchMapStatusClasses(
  status: "locked" | "ready" | "recommended" | "running" | "completed" | "failed"
) {
  const classes = {
    locked: "border-white/8 bg-white/[0.03] text-stone-300",
    ready: "border-white/8 bg-white/[0.05] text-stone-100",
    recommended: "border-amber-300/15 bg-amber-300/8 text-amber-100",
    running: "border-sky-300/15 bg-sky-300/8 text-sky-200",
    completed: "border-emerald-300/15 bg-emerald-300/8 text-emerald-200",
    failed: "border-red-300/15 bg-red-300/8 text-red-200",
  } as const;

  return classes[status];
}

function managedEventStateClasses(state: ManagedInboxEventState) {
  const classes = {
    ready: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
    queued: "border-amber-300/15 bg-amber-300/10 text-amber-100",
    sent: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    replied: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
    needs_followup: "border-red-300/15 bg-red-300/10 text-red-200",
    logged: "border-white/10 bg-white/[0.05] text-stone-200",
  } as const;

  return classes[state];
}

function managedPacketStateClasses(state: "prepared" | "claimed" | "sent") {
  const classes = {
    prepared: "border-white/10 bg-white/[0.05] text-stone-200",
    claimed: "border-amber-300/15 bg-amber-300/10 text-amber-100",
    sent: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
  } as const;

  return classes[state];
}

function managedPacketReplyStateClasses(state: "awaiting" | "replied") {
  const classes = {
    awaiting: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    replied: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
  } as const;

  return classes[state];
}

function managedPacketThreadStageClasses(stage: ManagedInboxLaunchPacketThreadStage) {
  const classes = {
    thread_open: "border-white/10 bg-white/[0.05] text-stone-200",
    needs_materials: "border-amber-300/15 bg-amber-300/10 text-amber-100",
    commercial_review: "border-fuchsia-300/15 bg-fuchsia-300/10 text-fuchsia-100",
    under_review: "border-sky-300/15 bg-sky-300/10 text-sky-200",
    publication_ready: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
    published: "border-lime-300/15 bg-lime-300/10 text-lime-100",
  } as const;

  return classes[stage];
}

function managedLaunchLaneLabel(
  lane: "resource_page" | "editorial_contact",
  locale: Locale
) {
  if (locale === "zh") {
    return lane === "resource_page" ? "资源页外联" : "编辑联系面";
  }
  return lane === "resource_page" ? "Resource outreach" : "Editorial surface";
}

function getManagedInboxCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      eyebrow: "发信模式",
      title: "把发送层做成产品，不是让客户自己去拼。",
      body:
        "这里不是一个模糊的“平台代发”承诺。用户现在可以明确选择托管外联邮箱或自己的邮箱。托管模式会分配专属 sender identity、生成运营 brief，并把后续发送和回信状态回流到这个产品页。",
      modeLabel: "当前模式",
      managed: {
        title: "托管外联邮箱",
        body:
          "Growth / Scale 可以启用托管模式。系统先为这个产品保留专属 sender identity，再生成首轮运营 brief，后续外发和回信事件都会继续展示在这里。",
        assignmentLabel: "专属发件身份",
        assignmentNote:
          "当前是 pilot-assigned identity。真正的 live 发信和回信动作会继续由运营执行，并回写到时间线。",
        briefLabel: "运营 brief",
        activate: "启用托管邮箱",
        active: "托管邮箱已启用",
        upgrade: "升级到增长版解锁",
        reserved: "这个产品已经保留了专属 sender identity，可随时切回托管模式。",
        included: "Growth / Scale",
        launchLabel: "首批外联请求",
        launchBody:
          "这一步会把当前产品排进托管外联队列，生成可执行的 launch request 和更新后的运营 brief。它不是假装已经发出邮件，而是把第一批真实外联准备动作交给执行链。",
        launchActivateHint: "先启用托管邮箱，再发起首批外联请求。",
        launchReady: "托管邮箱已就绪，现在可以把首批外联请求排进执行队列。",
        launchCta: "发起首批外联批次",
        launchRefresh: "刷新外联请求",
        launchQueued: "首批外联请求已排队",
        launchStatusQueued: "已排队给运营",
        launchSummaryFallback: "首批托管外联请求已经生成，运营可以直接接手。",
        shortlistLabel: "首批候选目标",
        shortlistEmpty: "当前还没有自动 shortlist，运营会按现有队列手动补第一批目标。",
        packetsLabel: "首批消息包",
        packetsEmpty: "当前还没有预生成消息包，运营会按 shortlist 手动准备第一批。",
        packetStats: {
          prepared: "待发送",
          claimed: "已认领",
          sent: "已发送",
          replied: "已回复",
        },
        packetState: {
          prepared: "待发送",
          claimed: "已认领",
          sent: "已发送",
        },
        packetReplyState: {
          awaiting: "等待回复",
          replied: "已收到回复",
        },
        packetSubjectLabel: "建议主题",
        packetNextStepLabel: "下一步",
        packetOwnerLabel: "执行人",
        packetSentAtLabel: "发送时间",
        packetReceiptLabel: "发送回执",
        packetReplyFromLabel: "回复来自",
        packetReplySnippetLabel: "回复摘要",
        packetReplyAtLabel: "回复时间",
        packetThreadStageLabel: "线程阶段",
        packetThreadStageReasonLabel: "判断依据",
        threadBoardLabel: "线程动作板",
        threadBoardBody:
          "这里把首批托管外联拆成现在最该处理的动作，不让用户只看到一串状态标签。",
        threadActionCards: {
          needsResponse: "需要立即回复",
          awaitingReply: "正在等待回复",
          unsent: "还没完全发出",
        },
        replyQueueLabel: "优先处理的回复线程",
        replyQueueEmpty:
          "当前还没有新的真实回复。一旦 reply monitor 捕捉到回信，这里会直接出现下一步线程。",
        threadStage: {
          thread_open: "线程已打开",
          needs_materials: "需要补资料",
          commercial_review: "涉及商务条件",
          under_review: "编辑审核中",
          publication_ready: "接近发布",
          published: "已上线/已收录",
        },
        threadStageReason: {
          thread_open: "已经收到真实回复，但还没有进入更明确的推进节点。",
          needs_materials: "对方在要资料、素材或更完整的产品描述。",
          commercial_review: "对方在谈价格、赞助、付费或其他商务条件。",
          under_review: "对方看起来准备内部审核、排队或继续评估。",
          publication_ready: "对方已经明显接近收录或发布，只差最后确认。",
          published: "对方的回复已经指向上线、发布或收录完成。",
        },
        openTarget: "打开目标",
      },
      byo: {
        title: "使用你的邮箱",
        body:
          "如果你不买托管发送，就明确走自己的邮箱 / 发件身份。这条路径也应该清楚，不和托管模式混在一起。",
        placeholder: "name@yourdomain.com",
        save: "保存我的发件邮箱",
        saved: "当前使用自己的邮箱",
        helper: "这会把该邮箱保存为这个产品的自带 sender identity。",
      },
      timeline: {
        title: "发送与回复时间线",
        body:
          "托管模式激活后，运营会把首轮发送、回信和补跟进事件回写到这里，让客户看到真正发生了什么。",
        empty:
          "当前还没有发送或回信事件。托管模式一启用，brief 和后续动作就会出现在这里。",
        stats: {
          outbound: "真实外发",
          replies: "真实回复",
          awaiting: "待回复",
          lastActivity: "最近动作",
        },
        state: {
          ready: "就绪",
          queued: "排队中",
          sent: "已发送",
          replied: "已回复",
          needs_followup: "待跟进",
          logged: "已记录",
        },
        direction: {
          internal: "系统",
          outbound: "发出",
          inbound: "收到",
        },
        reference: "参考编号",
      },
      badge: {
        active: "当前启用",
        locked: "需升级",
        saved: "已保存",
        reserved: "已保留",
        pilot: "pilot",
      },
      errors: {
        invalidEmail: "请输入有效邮箱地址。",
        saveFailed: "发信模式保存失败，请稍后再试。",
        managedFailed: "托管邮箱激活失败，请稍后再试。",
        launchFailed: "首批外联请求创建失败，请稍后再试。",
        proofTaskFailed: "结果任务更新失败，请稍后再试。",
      },
    };
  }

  return {
    eyebrow: "Sender mode",
    title: "Turn the sending layer into product value, not customer setup work.",
    body:
      "This is not a vague promise about platform-managed outreach. The customer can now choose a Managed Outreach Inbox or bring their own sender. Managed mode assigns a dedicated sender identity, generates an ops brief, and routes later send/reply activity back into this product page.",
    modeLabel: "Current mode",
      managed: {
        title: "Managed Outreach Inbox",
        body:
          "Growth and Scale can activate the managed mode. The system reserves a dedicated sender identity for this product, queues the first ops brief, and keeps later outbound and reply events visible here.",
      assignmentLabel: "Dedicated sender identity",
      assignmentNote:
        "This is a pilot-assigned identity for the product. Live sends and replies still flow through ops and get written back into the timeline.",
      briefLabel: "Ops brief",
      activate: "Activate managed inbox",
      active: "Managed inbox is active",
      upgrade: "Upgrade to Growth to unlock",
      reserved: "A sender identity is already reserved for this product, so you can switch back to managed mode later.",
      included: "Growth / Scale",
      launchLabel: "First outreach batch",
      launchBody:
        "This turns the current product into a real managed outreach request, with a launch file and refreshed ops brief that the execution lane can pick up immediately. It does not pretend a send already happened.",
      launchActivateHint: "Activate the managed inbox before queueing the first batch.",
      launchReady:
        "The managed inbox is ready. Queue the first outreach batch when you want ops to take it live.",
      launchCta: "Queue first outreach batch",
      launchRefresh: "Refresh outreach request",
      launchQueued: "First outreach batch queued",
      launchStatusQueued: "Queued for ops",
      launchSummaryFallback:
        "The first managed outreach request is ready and can be picked up by ops.",
      shortlistLabel: "First-batch shortlist",
      shortlistEmpty:
        "There is no generated shortlist yet, so ops will build the first batch from the current queue.",
      packetsLabel: "Prepared message packets",
      packetsEmpty:
        "There are no generated packets yet, so ops will prepare the first messages from the shortlist.",
      packetStats: {
        prepared: "Prepared",
        claimed: "Claimed",
        sent: "Sent",
        replied: "Replied",
      },
      packetState: {
        prepared: "Prepared",
        claimed: "Claimed",
        sent: "Sent",
      },
      packetReplyState: {
        awaiting: "Awaiting reply",
        replied: "Replied",
      },
      packetSubjectLabel: "Suggested subject",
      packetNextStepLabel: "Next step",
      packetOwnerLabel: "Owner",
      packetSentAtLabel: "Sent at",
      packetReceiptLabel: "Send receipt",
        packetReplyFromLabel: "Reply from",
      packetReplySnippetLabel: "Reply snippet",
      packetReplyAtLabel: "Reply received",
      packetThreadStageLabel: "Thread stage",
      packetThreadStageReasonLabel: "Why the system thinks so",
      threadBoardLabel: "Thread action board",
      threadBoardBody:
        "This turns the first managed batch into the actions that matter right now, instead of leaving the user with raw state labels.",
        threadActionCards: {
          needsResponse: "Needs response now",
          awaitingReply: "Awaiting reply",
          unsent: "Still not sent",
        },
      replyQueueLabel: "Reply threads to handle first",
      replyQueueEmpty:
        "There are no new live replies yet. Once the reply monitor catches one, the next thread should appear here automatically.",
      threadStage: {
        thread_open: "Thread open",
        needs_materials: "Needs materials",
        commercial_review: "Commercial review",
        under_review: "Under review",
        publication_ready: "Close to publication",
        published: "Published/live",
      },
      threadStageReason: {
        thread_open:
          "A real reply exists, but it has not entered a stronger execution bucket yet.",
        needs_materials:
          "The target is asking for assets, supporting copy, or richer product details.",
        commercial_review:
          "The thread has moved into pricing, sponsorship, or payment territory.",
        under_review:
          "The target appears to be reviewing, discussing internally, or evaluating fit.",
        publication_ready:
          "The thread sounds close to inclusion and mainly needs final confirmation.",
        published:
          "The reply already points to the placement being live or fully published.",
      },
      openTarget: "Open target",
    },
    byo: {
      title: "Bring your own inbox",
      body:
        "If the customer does not buy managed sending, the product should clearly route them to their own sender identity instead of blending the two modes together.",
      placeholder: "name@yourdomain.com",
      save: "Save my sender email",
      saved: "Using your own inbox",
      helper: "This becomes the saved sender identity for this product.",
    },
    timeline: {
      title: "Send and reply timeline",
      body:
        "Once managed mode is activated, ops writes the first send, reply, and follow-up milestones back here so the customer can see real movement.",
      empty:
        "There are no send or reply events yet. Once managed mode starts, the brief and later thread activity will appear here.",
      stats: {
        outbound: "Live sends",
        replies: "Replies",
        awaiting: "Awaiting",
        lastActivity: "Last activity",
      },
      state: {
        ready: "Ready",
        queued: "Queued",
        sent: "Sent",
        replied: "Replied",
        needs_followup: "Needs follow-up",
        logged: "Logged",
      },
      direction: {
        internal: "System",
        outbound: "Outbound",
        inbound: "Inbound",
      },
      reference: "Reference",
    },
    badge: {
      active: "Active",
      locked: "Upgrade required",
      saved: "Saved",
      reserved: "Reserved",
      pilot: "pilot",
    },
    errors: {
      invalidEmail: "Enter a valid sender email.",
      saveFailed: "Unable to save the sender mode right now.",
      managedFailed: "Unable to activate the managed inbox right now.",
      launchFailed: "Unable to queue the first outreach batch right now.",
      proofTaskFailed: "Unable to update the proof task right now.",
    },
  };
}

export default function ProductDetail({
  locale,
  user,
  product,
  submissions,
  plan,
  managedInboxRecord,
  managedInboxLiveActivity,
  outreachLibrary,
  operationalInsights,
  priorityContext = false,
}: {
  locale: Locale;
  user: User;
  product: Product;
  submissions: Submission[];
  plan: string;
  managedInboxRecord: ManagedInboxRecord;
  managedInboxLiveActivity: ManagedInboxLiveActivity;
  outreachLibrary: HighQualityOutreachLibrary;
  operationalInsights: OperationalInsights;
  priorityContext?: boolean;
}) {
  const copy = getProductDetailCopy(locale);
  const managedInboxCopy = getManagedInboxCopy(locale);
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [managedInbox, setManagedInbox] = useState(managedInboxRecord);
  const [managedInboxLive, setManagedInboxLive] = useState(managedInboxLiveActivity);
  const [senderEmail, setSenderEmail] = useState(
    managedInboxRecord.bringYourOwn?.senderEmail || user.email || ""
  );
  const [managedInboxAction, setManagedInboxAction] = useState<
    "save_byo" | "activate_managed" | "launch_batch" | "update_proof_task" | null
  >(null);
  const [proofTaskActionKey, setProofTaskActionKey] = useState<string | null>(null);
  const [managedInboxError, setManagedInboxError] = useState("");
  const sourcePreview = outreachLibrary.sources.slice(0, 6);
  const playbook = operationalInsights.playbook || EMPTY_PLAYBOOK;
  const recommendedLaneIds = (playbook.recommended_lane_ids || []).slice(0, 4);
  const qualityBarIds = (playbook.quality_bar_ids || []).slice(0, 3);
  const antiPatternIds = (playbook.anti_pattern_ids || []).slice(0, 4);
  const priorityContextLabel =
    locale === "zh" ? "当前优先产品" : "Current priority product";
  const priorityContextBody =
    locale === "zh"
      ? "你是从工作台当前主推产品的路径进入这里的。先把这个产品推进完，再决定是否切换注意力。"
      : "You opened the product the workspace is currently prioritizing. Push this one through before spreading attention elsewhere.";

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

  useEffect(() => {
    setManagedInbox(managedInboxRecord);
    setManagedInboxLive(managedInboxLiveActivity);
    setSenderEmail(managedInboxRecord.bringYourOwn?.senderEmail || user.email || "");
  }, [managedInboxRecord, managedInboxLiveActivity, user.email]);

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

  async function updateManagedInbox(
    payload:
      | { action: "save_byo"; senderEmail: string }
      | { action: "activate_managed" }
      | { action: "launch_batch" }
      | {
          action: "update_proof_task";
          taskId: string;
          taskAction: "start" | "prove" | "drop";
        }
  ) {
    setManagedInboxAction(payload.action);
    if (payload.action === "update_proof_task") {
      setProofTaskActionKey(`${payload.taskId}:${payload.taskAction}`);
    }
    setManagedInboxError("");

    try {
      const response = await fetch(`/api/products/${product.id}/managed-inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as
        | {
            record?: ManagedInboxRecord;
            liveActivity?: ManagedInboxLiveActivity;
            error?: string;
          }
        | null;

      if (!response.ok || !data?.record) {
        throw new Error(data?.error || managedInboxCopy.errors.saveFailed);
      }

      setManagedInbox(data.record);
      if (data.liveActivity) {
        setManagedInboxLive(data.liveActivity);
      }
      if (data.record.bringYourOwn?.senderEmail) {
        setSenderEmail(data.record.bringYourOwn.senderEmail);
      }
    } catch (error) {
      setManagedInboxError(
        error instanceof Error
          ? error.message
          : payload.action === "activate_managed"
          ? managedInboxCopy.errors.managedFailed
          : payload.action === "launch_batch"
            ? managedInboxCopy.errors.launchFailed
            : payload.action === "update_proof_task"
              ? managedInboxCopy.errors.proofTaskFailed
              : managedInboxCopy.errors.saveFailed
      );
    } finally {
      setManagedInboxAction(null);
      setProofTaskActionKey(null);
    }
  }

  async function saveBringYourOwnSender() {
    const normalizedEmail = senderEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setManagedInboxError(managedInboxCopy.errors.invalidEmail);
      return;
    }
    await updateManagedInbox({
      action: "save_byo",
      senderEmail: normalizedEmail,
    });
  }

  async function activateManagedSender() {
    await updateManagedInbox({ action: "activate_managed" });
  }

  async function queueManagedBatch() {
    await updateManagedInbox({ action: "launch_batch" });
  }

  async function updateProofTask(taskId: string, taskAction: "start" | "prove" | "drop") {
    await updateManagedInbox({
      action: "update_proof_task",
      taskId,
      taskAction,
    });
  }

  const liveChannels = CHANNELS.filter((channel) => channel.support_status === "live");
  const plannedChannels = CHANNELS.filter((channel) => channel.support_status !== "live");
  const managedInboxEligible = plan === "growth" || plan === "scale";
  const availableLiveChannels = liveChannels.filter((channel) => channel.plans.includes(plan));
  const currentPlanIndex = PLAN_ORDER.indexOf(
    (PLAN_ORDER.includes(plan as (typeof PLAN_ORDER)[number])
      ? plan
      : "free") as (typeof PLAN_ORDER)[number]
  );
  const nextPlan =
    currentPlanIndex >= 0 && currentPlanIndex < PLAN_ORDER.length - 1
      ? PLAN_ORDER[currentPlanIndex + 1]
      : null;
  const laterPlan =
    currentPlanIndex >= 0 && currentPlanIndex < PLAN_ORDER.length - 2
      ? PLAN_ORDER[currentPlanIndex + 2]
      : null;
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
  const nextPlanUnlocks = nextPlan
    ? CHANNELS.filter(
        (channel) => channel.plans.includes(nextPlan) && !channel.plans.includes(plan)
      )
    : [];
  const laterPlanUnlocks =
    laterPlan && nextPlan
      ? CHANNELS.filter(
          (channel) =>
            channel.plans.includes(laterPlan) && !channel.plans.includes(nextPlan)
        )
      : [];
  const nextPlanLiveUnlocks = nextPlanUnlocks.filter(
    (channel) => channel.support_status === "live"
  );
  const nextPlanPlannedUnlocks = nextPlanUnlocks.filter(
    (channel) => channel.support_status !== "live"
  );
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
  const latestSuccessReceipts =
    latestResolvedSubmission?.results.filter((result) => result.success).slice(0, 4) || [];
  const latestBlockers =
    latestResolvedSubmission?.results.filter((result) => !result.success).slice(0, 4) || [];
  const latestSubmissionByChannel = new Map(
    submissions.map((submission) => [submission.channel, submission])
  );
  const managedInboxActive =
    managedInbox.senderMode === "managed" && Boolean(managedInbox.mailboxIdentity);
  const managedInboxReserved =
    managedInbox.senderMode !== "managed" && Boolean(managedInbox.mailboxIdentity);
  const managedLaunchRequest = managedInbox.launchRequest;
  const managedLaunchPackets = managedLaunchRequest?.packets || [];
  const repliedPackets = managedLaunchPackets.filter(
    (packet) => packet.replyStatus === "replied"
  );
  const awaitingReplyPackets = managedLaunchPackets.filter(
    (packet) => packet.replyStatus === "awaiting"
  );
  const publishedPackets = repliedPackets.filter(
    (packet) => packet.threadStage === "published"
  );
  const publicationReadyPackets = repliedPackets.filter(
    (packet) => packet.threadStage === "publication_ready"
  );
  const needsMaterialsPackets = repliedPackets.filter(
    (packet) => packet.threadStage === "needs_materials"
  );
  const commercialReviewPackets = repliedPackets.filter(
    (packet) => packet.threadStage === "commercial_review"
  );
  const underReviewPackets = repliedPackets.filter(
    (packet) => packet.threadStage === "under_review"
  );
  const threadOpenPackets = repliedPackets.filter(
    (packet) => packet.threadStage === "thread_open" || !packet.threadStage
  );
  const unsentManagedPackets = managedLaunchPackets.filter(
    (packet) => packet.state !== "sent"
  );
  const packetStats = {
    prepared: managedLaunchPackets.filter((packet) => packet.state === "prepared").length,
    claimed: managedLaunchPackets.filter((packet) => packet.state === "claimed").length,
    sent: managedLaunchPackets.filter((packet) => packet.state === "sent").length,
    replied: repliedPackets.length,
  };
  const replyQueuePackets = repliedPackets
    .slice()
    .sort((left, right) => {
      const leftDate = left.lastReplyAt || "";
      const rightDate = right.lastReplyAt || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 3);
  const proofCandidatePackets = [
    ...publishedPackets,
    ...publicationReadyPackets,
    ...needsMaterialsPackets,
    ...underReviewPackets,
    ...commercialReviewPackets,
    ...threadOpenPackets,
  ].slice(0, 3);
  const replyStageCounts = {
    thread_open: repliedPackets.filter((packet) => packet.threadStage === "thread_open").length,
    needs_materials: repliedPackets.filter(
      (packet) => packet.threadStage === "needs_materials"
    ).length,
    commercial_review: repliedPackets.filter(
      (packet) => packet.threadStage === "commercial_review"
    ).length,
    under_review: repliedPackets.filter((packet) => packet.threadStage === "under_review").length,
    publication_ready: repliedPackets.filter(
      (packet) => packet.threadStage === "publication_ready"
    ).length,
    published: repliedPackets.filter((packet) => packet.threadStage === "published").length,
  };
  const proofPipelineStats = {
    receipts: latestSuccessReceipts.length,
    threads: repliedPackets.length,
    close: publicationReadyPackets.length,
    verify: publishedPackets.length,
  };
  const publicProofPackets = publishedPackets.slice(0, 3);
  const nearPublicPackets = [
    ...publicationReadyPackets,
    ...needsMaterialsPackets,
    ...underReviewPackets,
    ...commercialReviewPackets,
    ...threadOpenPackets,
  ].slice(0, 3);
  const internalSignalReceipts = latestSuccessReceipts.slice(0, 3);
  const resultsProofStatus =
    publicProofPackets.length > 0
      ? "public"
      : nearPublicPackets.length > 0
        ? "nearPublic"
        : repliedPackets.length > 0
          ? "threads"
          : totalSuccessfulActions > 0
            ? "receipts"
            : "empty";
  const resultsProofStatusTone =
    resultsProofStatus === "public"
      ? "border-lime-300/15 bg-lime-300/[0.06]"
      : resultsProofStatus === "nearPublic"
        ? "border-emerald-300/15 bg-emerald-300/[0.06]"
        : resultsProofStatus === "threads"
          ? "border-sky-300/15 bg-sky-300/[0.06]"
          : resultsProofStatus === "receipts"
            ? "border-amber-300/15 bg-amber-300/[0.06]"
            : "border-white/10 bg-white/[0.04]";
  const resultsProofLastSignal =
    publicProofPackets[0]?.lastReplyAt ||
    nearPublicPackets[0]?.lastReplyAt ||
    nearPublicPackets[0]?.sentAt ||
    repliedPackets[0]?.lastReplyAt ||
    latestResolvedSubmission?.created_at ||
    null;
  const latestProofTask = managedInbox.proofTasks[0] || null;
  const latestProofTaskStatusLabel = latestProofTask
    ? copy.proofPipeline.taskStatus[latestProofTask.status]
    : null;
  let proofPriorityTitle = copy.proofPipeline.priorities.fallbackTitle;
  let proofPriorityBody = copy.proofPipeline.priorities.fallbackBody;
  let proofPriorityTone = "border-white/10 bg-white/[0.04]";

  if (publishedPackets.length > 0) {
    proofPriorityTitle = copy.proofPipeline.priorities.publishedTitle;
    proofPriorityBody = copy.proofPipeline.priorities.publishedBody;
    proofPriorityTone = "border-lime-300/15 bg-lime-300/[0.06]";
  } else if (publicationReadyPackets.length > 0) {
    proofPriorityTitle = copy.proofPipeline.priorities.publicationReadyTitle;
    proofPriorityBody = copy.proofPipeline.priorities.publicationReadyBody;
    proofPriorityTone = "border-emerald-300/15 bg-emerald-300/[0.06]";
  } else if (needsMaterialsPackets.length > 0) {
    proofPriorityTitle = copy.proofPipeline.priorities.materialsTitle;
    proofPriorityBody = copy.proofPipeline.priorities.materialsBody;
    proofPriorityTone = "border-amber-300/15 bg-amber-300/[0.06]";
  } else if (commercialReviewPackets.length > 0) {
    proofPriorityTitle = copy.proofPipeline.priorities.commercialTitle;
    proofPriorityBody = copy.proofPipeline.priorities.commercialBody;
    proofPriorityTone = "border-fuchsia-300/15 bg-fuchsia-300/[0.06]";
  } else if (underReviewPackets.length > 0 || threadOpenPackets.length > 0) {
    proofPriorityTitle = copy.proofPipeline.priorities.reviewTitle;
    proofPriorityBody = copy.proofPipeline.priorities.reviewBody;
    proofPriorityTone = "border-sky-300/15 bg-sky-300/[0.06]";
  } else if (latestSuccessReceipts.length > 0) {
    proofPriorityTitle = copy.proofPipeline.priorities.receiptTitle;
    proofPriorityBody = copy.proofPipeline.priorities.receiptBody;
    proofPriorityTone = "border-emerald-300/15 bg-emerald-300/[0.05]";
  }
  const managedInboxTimeline = [...managedInboxLive.timeline, ...managedInbox.timeline]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10);
  const currentLayerItems = availableLiveChannels.map((channel) => {
    const latestChannelSubmission = latestSubmissionByChannel.get(channel.id) || null;
    const channelName = getLocalizedChannel(channel, locale).name;
    const suffix =
      latestChannelSubmission?.status === "queued" ||
      latestChannelSubmission?.status === "running"
        ? copy.launchMap.status.running
        : latestChannelSubmission?.status === "completed"
          ? copy.launchMap.status.completed
          : latestChannelSubmission?.status === "failed"
            ? copy.launchMap.status.failed
            : copy.expansion.runnableNow;

    return `${channelName} · ${suffix}`;
  });
  const nextPlanItems = nextPlanUnlocks.map((channel) => {
    const channelName = getLocalizedChannel(channel, locale).name;
    const availabilityLabel =
      channel.support_status === "live"
        ? copy.expansion.runnableNow
        : copy.expansion.rolloutQueue;

    return `${channelName} · ${availabilityLabel}`;
  });
  const laterPlanItems = laterPlanUnlocks.map((channel) => {
    const channelName = getLocalizedChannel(channel, locale).name;
    const availabilityLabel =
      channel.support_status === "live"
        ? copy.expansion.runnableNow
        : copy.expansion.rolloutQueue;

    return `${channelName} · ${availabilityLabel}`;
  });
  const localizedRecommendedPlaybook = recommendedLaneIds.map((laneId) =>
    localizePlaybookItem(
      locale,
      PLAYBOOK_LANE_COPY,
      laneId,
      playbook.raw?.lane_labels?.[laneId]
    ).title
  );

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

  let currentExpansionTitle = copy.expansion.runTitle;
  let currentExpansionBody = copy.expansion.runBody;
  let currentExpansionAction: ExpansionAction | null = null;

  if (plan === "free") {
    currentExpansionTitle = copy.expansion.setupTitle;
    currentExpansionBody = copy.expansion.setupBody;
    currentExpansionAction = {
      kind: "href",
      href: checkoutHref("starter"),
      label: copy.hero.unlockStarter,
    };
  } else if (activeSubmission) {
    currentExpansionTitle = copy.expansion.activeTitle;
    currentExpansionBody = copy.expansion.activeBody;
    currentExpansionAction = {
      kind: "href",
      href: "#submission-history",
      label: copy.expansion.watchRun,
    };
  } else if (recommendedNextLiveChannel) {
    currentExpansionTitle =
      locale === "zh"
        ? `现在就跑 ${getLocalizedChannel(recommendedNextLiveChannel, locale).name}`
        : `Run ${getLocalizedChannel(recommendedNextLiveChannel, locale).name} now`;
    currentExpansionBody = copy.expansion.runBody;
    currentExpansionAction = {
      kind: "launch",
      channelId: recommendedNextLiveChannel.id,
      label: copy.expansion.currentAction,
    };
  } else {
    currentExpansionTitle = copy.expansion.reviewTitle;
    currentExpansionBody = copy.expansion.reviewBody;
    currentExpansionAction = {
      kind: "href",
      href: "#submission-history",
      label: copy.expansion.reviewHistory,
    };
  }

  const nextExpansionTitle = nextPlan
    ? nextPlanLiveUnlocks.length > 0
      ? locale === "zh"
        ? `${localizedPlanName(nextPlan, locale)} 会立刻拉开分发半径。`
        : `${localizedPlanName(nextPlan, locale)} widens distribution immediately.`
      : locale === "zh"
        ? `${localizedPlanName(nextPlan, locale)} 会把下一层分发排进来。`
        : `${localizedPlanName(nextPlan, locale)} lines up the next distribution layer.`
    : copy.expansion.maxTitle;
  const nextExpansionBody = nextPlan
    ? nextPlanLiveUnlocks.length > 0
      ? copy.expansion.nextImmediateBody
      : copy.expansion.nextPlannedBody
    : copy.expansion.maxBody;
  const nextExpansionAction =
    nextPlan && nextPlan !== plan
      ? ({
          kind: "href",
          href: checkoutHref(nextPlan),
          label: `${copy.expansion.upgradeTo} ${localizedPlanName(nextPlan, locale)}`,
        } satisfies ExpansionAction)
      : ({
          kind: "href",
          href: "/pricing",
          label: copy.expansion.seePlans,
        } satisfies ExpansionAction);
  const laterExpansionTitle = laterPlan
    ? locale === "zh"
      ? `${localizedPlanName(laterPlan, locale)} 是更深一层的分发栈。`
      : `${localizedPlanName(laterPlan, locale)} is the deeper distribution layer.`
    : copy.expansion.maxTitle;
  const laterExpansionBody = laterPlan
    ? localizedRecommendedPlaybook.length > 0
      ? locale === "zh"
        ? `${copy.expansion.laterBody} ${copy.expansion.playbookSignal} ${localizedRecommendedPlaybook.join("、")}。`
        : `${copy.expansion.laterBody} ${copy.expansion.playbookSignal} ${localizedRecommendedPlaybook.join(", ")}.`
      : copy.expansion.laterBody
    : copy.expansion.maxBody;
  const expansionCards = [
    {
      key: "current",
      eyebrow: copy.expansion.currentEyebrow,
      title: currentExpansionTitle,
      body: currentExpansionBody,
      items: currentLayerItems,
      itemLabel: copy.expansion.includedNow,
      action: currentExpansionAction,
      tone:
        plan === "free"
          ? "border-amber-300/15 bg-amber-300/6"
          : activeSubmission
            ? "border-sky-300/15 bg-sky-300/6"
            : "border-emerald-300/15 bg-emerald-300/6",
    },
    {
      key: "next",
      eyebrow: copy.expansion.nextEyebrow,
      title: nextExpansionTitle,
      body: nextExpansionBody,
      items: nextPlan ? nextPlanItems : [],
      itemLabel: copy.expansion.unlocksNext,
      action: nextExpansionAction,
      tone: "border-white/10 bg-white/[0.04]",
    },
    {
      key: "later",
      eyebrow: copy.expansion.laterEyebrow,
      title: laterExpansionTitle,
      body: laterExpansionBody,
      items: laterPlan ? laterPlanItems : localizedRecommendedPlaybook,
      itemLabel: laterPlan ? copy.expansion.laterUnlocks : copy.expansion.playbookSignal,
      action: {
        kind: "href",
        href: "/pricing",
        label: copy.expansion.seePlans,
      } as ExpansionAction,
      tone: "border-white/8 bg-black/15",
    },
  ];
  const managedInboxBadge = managedInboxActive
    ? copy.offerBoundary.labels.active
    : managedInbox.senderMode === "bring_your_own"
      ? copy.offerBoundary.labels.byo
      : managedInboxEligible
        ? copy.offerBoundary.labels.addOn
        : copy.offerBoundary.labels.locked;
  const managedInboxTitle = managedInboxActive
    ? copy.offerBoundary.cards.managed.activeTitle
    : managedInbox.senderMode === "bring_your_own"
      ? copy.offerBoundary.cards.managed.byoTitle
      : managedInboxEligible
        ? copy.offerBoundary.cards.managed.readyTitle
        : copy.offerBoundary.cards.managed.lockedTitle;
  const managedInboxBody = managedInboxActive
    ? `${copy.offerBoundary.cards.managed.activeBody}${
        managedInbox.mailboxIdentity?.email
          ? locale === "zh"
            ? ` 当前分配邮箱：${managedInbox.mailboxIdentity.email}。`
            : ` Current inbox: ${managedInbox.mailboxIdentity.email}.`
          : ""
      }`
    : managedInbox.senderMode === "bring_your_own"
      ? `${copy.offerBoundary.cards.managed.byoBody}${
          managedInbox.bringYourOwn?.senderEmail
            ? locale === "zh"
              ? ` 当前发件邮箱：${managedInbox.bringYourOwn.senderEmail}。`
              : ` Current sender: ${managedInbox.bringYourOwn.senderEmail}.`
            : ""
        }`
      : managedInboxEligible
        ? copy.offerBoundary.cards.managed.readyBody
        : copy.offerBoundary.cards.managed.lockedBody;
  const paidOpportunityActive = commercialReviewPackets.length > 0;
  const paidOpportunityTitle = paidOpportunityActive
    ? copy.offerBoundary.cards.paid.activeTitle
    : copy.offerBoundary.cards.paid.idleTitle;
  const paidOpportunityBody = paidOpportunityActive
    ? `${copy.offerBoundary.cards.paid.activeBody} ${
        locale === "zh"
          ? `当前待筛机会：${commercialReviewPackets.length} 个。`
          : `Open opportunities to screen: ${commercialReviewPackets.length}.`
      }`
    : copy.offerBoundary.cards.paid.idleBody;
  const manualServiceActive =
    needsMaterialsPackets.length > 0 ||
    underReviewPackets.length > 0 ||
    latestProofTask?.status === "in_progress";
  const manualServiceTitle = manualServiceActive
    ? copy.offerBoundary.cards.manual.activeTitle
    : copy.offerBoundary.cards.manual.idleTitle;
  const manualServiceBody = manualServiceActive
    ? copy.offerBoundary.cards.manual.activeBody
    : copy.offerBoundary.cards.manual.idleBody;
  const offerBoundaryCards = [
    {
      key: "core",
      eyebrow: copy.offerBoundary.cards.core.eyebrow,
      badge: copy.offerBoundary.labels.included,
      title:
        plan === "free"
          ? copy.offerBoundary.cards.core.freeTitle
          : copy.offerBoundary.cards.core.liveTitle,
      body:
        plan === "free"
          ? copy.offerBoundary.cards.core.freeBody
          : `${copy.offerBoundary.cards.core.liveBody} ${
              locale === "zh"
                ? `当前已解锁 ${availableLiveChannels.length} 条真实渠道。`
                : `${availableLiveChannels.length} live lanes are currently unlocked.`
            }`,
      href: plan === "free" ? checkoutHref("starter") : "#submission-history",
      actionLabel:
        plan === "free" ? copy.hero.unlockStarter : copy.hero.viewHistory,
      tone: "border-emerald-300/15 bg-emerald-300/[0.06]",
      actionTone: "bg-[var(--accent-500)] text-stone-950 hover:bg-[var(--accent-300)]",
    },
    {
      key: "managed",
      eyebrow: copy.offerBoundary.cards.managed.eyebrow,
      badge: managedInboxBadge,
      title: managedInboxTitle,
      body: managedInboxBody,
      href: managedInboxEligible || managedInbox.senderMode === "bring_your_own" || managedInboxActive
        ? "#managed-inbox"
        : "/pricing#managed-inbox",
      actionLabel:
        managedInboxEligible || managedInbox.senderMode === "bring_your_own" || managedInboxActive
          ? copy.offerBoundary.labels.openManaged
          : copy.offerBoundary.labels.seePricing,
      tone: "border-sky-300/15 bg-sky-300/[0.06]",
      actionTone: "border border-[var(--line-strong)] text-stone-100 hover:bg-white/6",
    },
    {
      key: "paid",
      eyebrow: copy.offerBoundary.cards.paid.eyebrow,
      badge: copy.offerBoundary.labels.separate,
      title: paidOpportunityTitle,
      body: paidOpportunityBody,
      href: "#results-proof",
      actionLabel: copy.offerBoundary.labels.openResults,
      tone: "border-fuchsia-300/15 bg-fuchsia-300/[0.06]",
      actionTone: "border border-[var(--line-strong)] text-stone-100 hover:bg-white/6",
    },
    {
      key: "manual",
      eyebrow: copy.offerBoundary.cards.manual.eyebrow,
      badge: copy.offerBoundary.labels.service,
      title: manualServiceTitle,
      body: manualServiceBody,
      href: "#proof-pipeline",
      actionLabel: copy.offerBoundary.labels.openResults,
      tone: "border-amber-300/15 bg-amber-300/[0.06]",
      actionTone: "border border-[var(--line-strong)] text-stone-100 hover:bg-white/6",
    },
  ] as const;

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
              {priorityContext ? (
                <div className="mt-4 inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-100">
                  {priorityContextLabel}
                </div>
              ) : null}
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
                {priorityContext ? (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-100/90">
                    {priorityContextBody}
                  </p>
                ) : null}

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

        <section className="mt-12 rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.offerBoundary.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.offerBoundary.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
              {copy.offerBoundary.body}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {offerBoundaryCards.map((card) => (
              <article
                key={card.key}
                className={`rounded-[1.35rem] border p-5 ${card.tone}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-current/75">
                    {card.eyebrow}
                  </p>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-medium text-white">
                    {card.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-200">{card.body}</p>
                <div className="mt-5">
                  <a
                    href={card.href}
                    className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold transition ${card.actionTone}`}
                  >
                    {card.actionLabel}
                  </a>
                </div>
              </article>
            ))}
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

        <section id="managed-inbox" className="mt-12 scroll-mt-24">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {managedInboxCopy.eyebrow}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {managedInboxCopy.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {managedInboxCopy.body}
            </p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-amber-300/15 bg-amber-300/6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-amber-100/80">
                      {managedInboxCopy.modeLabel}
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      {managedInboxCopy.managed.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-100">
                    {managedInboxActive
                      ? managedInboxCopy.badge.active
                      : managedInboxEligible
                        ? managedInboxCopy.badge.pilot
                        : managedInboxCopy.badge.locked}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-300">
                  {managedInboxCopy.managed.body}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-black/15 bg-black/10 px-3 py-1.5 text-stone-200">
                    {managedInboxCopy.managed.included}
                  </span>
                  {managedInboxReserved ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-stone-200">
                      {managedInboxCopy.badge.reserved}
                    </span>
                  ) : null}
                </div>

                {managedInbox.mailboxIdentity ? (
                  <div className="mt-6 rounded-[1.25rem] border border-black/15 bg-black/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {managedInboxCopy.managed.assignmentLabel}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {managedInbox.mailboxIdentity.email}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-stone-400">
                      {managedInboxCopy.managed.assignmentNote}
                    </p>
                  </div>
                ) : null}

                {managedInbox.opsBrief ? (
                  <div className="mt-4 rounded-[1.25rem] border border-black/15 bg-black/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {managedInboxCopy.managed.briefLabel}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {managedInbox.opsBrief.referenceId}
                    </div>
                    <div className="mt-2 text-xs text-stone-500">
                      {formatSubmissionDate(managedInbox.opsBrief.createdAt, locale)}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-[1.25rem] border border-black/15 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {managedInboxCopy.managed.launchLabel}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    {managedInboxCopy.managed.launchBody}
                  </p>

                  {managedLaunchRequest ? (
                    <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-100">
                          {managedInboxCopy.managed.launchStatusQueued}
                        </span>
                        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-300">
                          {managedLaunchRequest.referenceId}
                        </span>
                      </div>
                      <div className="mt-3 text-sm leading-7 text-stone-300">
                        {managedLaunchRequest.summary ||
                          managedInboxCopy.managed.launchSummaryFallback}
                      </div>
                      {managedLaunchRequest.shortlist.length > 0 ? (
                        <div className="mt-4 grid gap-3">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {managedInboxCopy.managed.shortlistLabel}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {managedLaunchRequest.shortlist.slice(0, 4).map((item) => (
                              <div
                                key={item.id}
                                className="rounded-[1rem] border border-white/10 bg-black/15 p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-300">
                                    {managedLaunchLaneLabel(item.lane, locale)}
                                  </span>
                                  <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                                    {item.contactMethod}
                                  </span>
                                </div>
                                <div className="mt-3 text-sm font-semibold text-white">
                                  {item.domain}
                                </div>
                                <p className="mt-2 text-sm leading-7 text-stone-300">
                                  {item.title}
                                </p>
                                <p className="mt-2 text-xs leading-6 text-stone-500">
                                  {item.reason}
                                </p>
                                {item.url ? (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex text-xs font-medium text-amber-100 transition hover:text-white"
                                  >
                                    {managedInboxCopy.managed.openTarget}
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-sm leading-7 text-stone-500">
                          {managedInboxCopy.managed.shortlistEmpty}
                        </div>
                      )}
                      {managedLaunchRequest.packets.length > 0 ? (
                        <div className="mt-5 grid gap-3">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {managedInboxCopy.managed.packetsLabel}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {(
                              [
                                ["prepared", packetStats.prepared],
                                ["claimed", packetStats.claimed],
                                ["sent", packetStats.sent],
                                ["replied", packetStats.replied],
                              ] as const
                            ).map(([state, value]) => (
                              <div
                                key={state}
                                className="rounded-[1rem] border border-white/10 bg-black/15 p-4"
                              >
                                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                  {managedInboxCopy.managed.packetStats[state]}
                                </div>
                                <div className="mt-2 text-lg font-semibold text-white">
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                            <div className="rounded-[1rem] border border-white/10 bg-black/15 p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {managedInboxCopy.managed.threadBoardLabel}
                              </div>
                              <p className="mt-2 text-sm leading-7 text-stone-400">
                                {managedInboxCopy.managed.threadBoardBody}
                              </p>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {(
                                  [
                                    [
                                      "needsResponse",
                                      repliedPackets.length,
                                      "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100",
                                    ],
                                    [
                                      "awaitingReply",
                                      awaitingReplyPackets.length,
                                      "border-sky-300/15 bg-sky-300/[0.06] text-sky-100",
                                    ],
                                    [
                                      "unsent",
                                      unsentManagedPackets.length,
                                      "border-amber-300/15 bg-amber-300/[0.06] text-amber-100",
                                    ],
                                  ] as const
                                ).map(([state, value, classes]) => (
                                  <div
                                    key={state}
                                    className={`rounded-[0.95rem] border p-4 ${classes}`}
                                  >
                                    <div className="text-[11px] uppercase tracking-[0.22em] text-current/70">
                                      {managedInboxCopy.managed.threadActionCards[state]}
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-white">
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-black/15 p-4">
                              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                {managedInboxCopy.managed.replyQueueLabel}
                              </div>
                              {replyQueuePackets.length > 0 ? (
                                <div className="mt-4 grid gap-3">
                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      [
                                        "needs_materials",
                                        "commercial_review",
                                        "under_review",
                                        "publication_ready",
                                        "published",
                                        "thread_open",
                                      ] as const
                                    ).map((stage) =>
                                      replyStageCounts[stage] > 0 ? (
                                        <span
                                          key={stage}
                                          className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.18em] ${managedPacketThreadStageClasses(
                                            stage
                                          )}`}
                                        >
                                          {managedInboxCopy.managed.threadStage[stage]} ·{" "}
                                          {replyStageCounts[stage]}
                                        </span>
                                      ) : null
                                    )}
                                  </div>
                                  {replyQueuePackets.map((packet) => (
                                    <div
                                      key={packet.id}
                                      className="rounded-[0.95rem] border border-emerald-300/12 bg-emerald-300/[0.04] p-4"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketReplyStateClasses(
                                            "replied"
                                          )}`}
                                        >
                                          {managedInboxCopy.managed.packetReplyState.replied}
                                        </span>
                                        {packet.threadStage ? (
                                          <span
                                            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketThreadStageClasses(
                                              packet.threadStage
                                            )}`}
                                          >
                                            {managedInboxCopy.managed.threadStage[packet.threadStage]}
                                          </span>
                                        ) : null}
                                        <div className="text-sm font-semibold text-white">
                                          {packet.title}
                                        </div>
                                      </div>
                                      {packet.lastReplyFrom ? (
                                        <div className="mt-3 text-xs text-stone-400">
                                          {managedInboxCopy.managed.packetReplyFromLabel}:{" "}
                                          {packet.lastReplyFrom}
                                        </div>
                                      ) : null}
                                      {packet.lastReplyAt ? (
                                        <div className="mt-2 text-xs text-stone-500">
                                          {managedInboxCopy.managed.packetReplyAtLabel}:{" "}
                                          {formatSubmissionDate(packet.lastReplyAt, locale)}
                                        </div>
                                      ) : null}
                                      {packet.lastReplySnippet ? (
                                        <div className="mt-3 text-sm leading-7 text-stone-300">
                                          {packet.lastReplySnippet}
                                        </div>
                                      ) : null}
                                      {packet.threadStage || packet.threadStageReason ? (
                                        <div className="mt-3 rounded-[0.85rem] border border-white/8 bg-white/[0.03] p-3 text-xs leading-6 text-stone-300">
                                          <div className="uppercase tracking-[0.18em] text-stone-500">
                                            {
                                              managedInboxCopy.managed
                                                .packetThreadStageReasonLabel
                                            }
                                          </div>
                                          <div className="mt-2">
                                            {packet.threadStage
                                              ? managedInboxCopy.managed.threadStageReason[
                                                  packet.threadStage
                                                ]
                                              : packet.threadStageReason}
                                          </div>
                                        </div>
                                      ) : null}
                                      <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                        {managedInboxCopy.managed.packetNextStepLabel}
                                      </div>
                                      <p className="mt-2 text-sm leading-7 text-stone-400">
                                        {packet.nextStep}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-4 text-sm leading-7 text-stone-500">
                                  {managedInboxCopy.managed.replyQueueEmpty}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-3">
                            {managedLaunchRequest.packets.slice(0, 3).map((packet) => (
                              <div
                                key={packet.id}
                                className="rounded-[1rem] border border-white/10 bg-black/15 p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketStateClasses(
                                      packet.state
                                    )}`}
                                  >
                                    {managedInboxCopy.managed.packetState[packet.state]}
                                  </span>
                                  {packet.replyStatus !== "none" ? (
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketReplyStateClasses(
                                        packet.replyStatus
                                      )}`}
                                    >
                                      {managedInboxCopy.managed.packetReplyState[packet.replyStatus]}
                                    </span>
                                  ) : null}
                                  {packet.threadStage ? (
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketThreadStageClasses(
                                        packet.threadStage
                                      )}`}
                                    >
                                      {managedInboxCopy.managed.threadStage[packet.threadStage]}
                                    </span>
                                  ) : null}
                                  <div className="text-sm font-semibold text-white">
                                    {packet.title}
                                  </div>
                                </div>
                                <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                  {managedInboxCopy.managed.packetSubjectLabel}
                                </div>
                                <div className="mt-2 text-sm leading-7 text-stone-200">
                                  {packet.subject}
                                </div>
                                {packet.claimedBy ? (
                                  <div className="mt-3 text-xs text-stone-500">
                                    {managedInboxCopy.managed.packetOwnerLabel}: {packet.claimedBy}
                                  </div>
                                ) : null}
                                {packet.sentAt ? (
                                  <div className="mt-2 text-xs text-stone-500">
                                    {managedInboxCopy.managed.packetSentAtLabel}:{" "}
                                    {formatSubmissionDate(packet.sentAt, locale)}
                                  </div>
                                ) : null}
                                {packet.sendReceiptPath ? (
                                  <div className="mt-2 text-xs text-stone-500">
                                    {managedInboxCopy.managed.packetReceiptLabel}:{" "}
                                    {pathTail(packet.sendReceiptPath)}
                                  </div>
                                ) : null}
                                {packet.lastReplyFrom ? (
                                  <div className="mt-2 text-xs text-stone-500">
                                    {managedInboxCopy.managed.packetReplyFromLabel}:{" "}
                                    {packet.lastReplyFrom}
                                  </div>
                                ) : null}
                                {packet.lastReplySnippet ? (
                                  <div className="mt-3 rounded-[0.85rem] border border-emerald-300/10 bg-emerald-300/[0.04] p-3 text-xs leading-6 text-stone-300">
                                    <div className="uppercase tracking-[0.18em] text-emerald-200/80">
                                      {managedInboxCopy.managed.packetReplySnippetLabel}
                                    </div>
                                    <div className="mt-2">
                                      {packet.lastReplySnippet}
                                    </div>
                                  </div>
                                ) : null}
                                {packet.threadStage || packet.threadStageReason ? (
                                  <div className="mt-3 rounded-[0.85rem] border border-white/8 bg-white/[0.03] p-3 text-xs leading-6 text-stone-300">
                                    <div className="uppercase tracking-[0.18em] text-stone-500">
                                      {managedInboxCopy.managed.packetThreadStageReasonLabel}
                                    </div>
                                    <div className="mt-2">
                                      {packet.threadStage
                                        ? managedInboxCopy.managed.threadStageReason[
                                            packet.threadStage
                                          ]
                                        : packet.threadStageReason}
                                    </div>
                                  </div>
                                ) : null}
                                <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                  {managedInboxCopy.managed.packetNextStepLabel}
                                </div>
                                <p className="mt-2 text-sm leading-7 text-stone-400">
                                  {packet.nextStep}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 text-sm leading-7 text-stone-500">
                          {managedInboxCopy.managed.packetsEmpty}
                        </div>
                      )}
                      <div className="mt-3 text-xs text-stone-500">
                        {formatSubmissionDate(managedLaunchRequest.createdAt, locale)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-stone-400">
                      {managedInboxActive
                        ? managedInboxCopy.managed.launchReady
                        : managedInboxCopy.managed.launchActivateHint}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {managedInboxActive ? (
                    <>
                      <div className="inline-flex rounded-full bg-black/15 px-5 py-3 text-sm font-medium text-stone-100">
                        {managedInboxCopy.managed.active}
                      </div>
                      <button
                        type="button"
                        onClick={queueManagedBatch}
                        disabled={managedInboxAction === "launch_batch"}
                        className="inline-flex rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:opacity-60"
                      >
                        {managedInboxAction === "launch_batch"
                          ? copy.channels.starting
                          : managedLaunchRequest
                            ? managedInboxCopy.managed.launchRefresh
                            : managedInboxCopy.managed.launchCta}
                      </button>
                    </>
                  ) : managedInboxEligible ? (
                    <button
                      type="button"
                      onClick={activateManagedSender}
                      disabled={managedInboxAction === "activate_managed"}
                      className="inline-flex rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:opacity-60"
                    >
                      {managedInboxAction === "activate_managed"
                        ? copy.channels.starting
                        : managedInboxCopy.managed.activate}
                    </button>
                  ) : (
                    <a
                      href={checkoutHref("growth")}
                      className="inline-flex rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white"
                    >
                      {managedInboxCopy.managed.upgrade}
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {managedInboxCopy.modeLabel}
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      {managedInboxCopy.byo.title}
                    </h3>
                  </div>
                  {managedInbox.senderMode === "bring_your_own" ? (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-200">
                      {managedInboxCopy.badge.saved}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {managedInboxCopy.byo.body}
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={senderEmail}
                    onChange={(event) => setSenderEmail(event.target.value)}
                    placeholder={managedInboxCopy.byo.placeholder}
                    className="min-w-0 flex-1 rounded-full border border-[var(--line-soft)] bg-black/15 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-[var(--accent-500)]"
                  />
                  <button
                    type="button"
                    onClick={saveBringYourOwnSender}
                    disabled={managedInboxAction === "save_byo"}
                    className="inline-flex rounded-full border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6 disabled:opacity-60"
                  >
                    {managedInboxAction === "save_byo"
                      ? copy.channels.starting
                      : managedInboxCopy.byo.save}
                  </button>
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-500">
                  {managedInboxCopy.byo.helper}
                </p>

                {managedInbox.bringYourOwn ? (
                  <div className="mt-4 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {managedInboxCopy.byo.saved}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {managedInbox.bringYourOwn.senderEmail}
                    </div>
                    <div className="mt-2 text-xs text-stone-500">
                      {formatSubmissionDate(managedInbox.bringYourOwn.updatedAt, locale)}
                    </div>
                  </div>
                ) : null}
              </div>

              {managedInboxError ? (
                <div className="rounded-[1.25rem] border border-red-300/15 bg-red-300/6 px-4 py-3 text-sm text-red-200">
                  {managedInboxError}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {managedInboxCopy.timeline.title}
              </p>
              <h3 className="mt-4 text-3xl font-semibold text-white">
                {managedInboxCopy.timeline.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-stone-400">
                {managedInboxCopy.timeline.body}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: managedInboxCopy.timeline.stats.outbound,
                    value: `${managedInboxLive.outboundCount}`,
                  },
                  {
                    label: managedInboxCopy.timeline.stats.replies,
                    value: `${managedInboxLive.replyCount}`,
                  },
                  {
                    label: managedInboxCopy.timeline.stats.awaiting,
                    value: `${managedInboxLive.awaitingReplyCount}`,
                  },
                  {
                    label: managedInboxCopy.timeline.stats.lastActivity,
                    value: managedInboxLive.lastActivityAt
                      ? formatSubmissionDate(managedInboxLive.lastActivityAt, locale)
                      : "—",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              {managedInboxTimeline.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {managedInboxTimeline.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedEventStateClasses(
                            event.state
                          )}`}
                        >
                          {managedInboxCopy.timeline.state[event.state]}
                        </span>
                        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-300">
                          {managedInboxCopy.timeline.direction[event.direction]}
                        </span>
                      </div>
                      <div className="mt-3 text-sm font-medium text-white">
                        {event.title}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-stone-400">
                        {event.body}
                      </p>
                      <div className="mt-3 text-xs text-stone-500">
                        {formatSubmissionDate(event.createdAt, locale)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5 text-sm leading-7 text-stone-400">
                  {managedInboxCopy.timeline.empty}
                </div>
              )}

              {managedInbox.opsBrief ? (
                <div className="mt-6 rounded-[1.25rem] border border-sky-300/15 bg-sky-300/6 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-sky-200">
                    {managedInboxCopy.timeline.reference}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">
                    {managedInbox.opsBrief.referenceId}
                  </div>
                  <div className="mt-2 text-xs text-stone-400">
                    {formatSubmissionDate(managedInbox.opsBrief.createdAt, locale)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.expansion.title}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.expansion.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {copy.expansion.body}
            </p>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            {expansionCards.map((card) => {
              const launchAction =
                card.action?.kind === "launch" ? card.action : null;
              const linkAction =
                card.action?.kind === "href" ? card.action : null;

              return (
                <div
                  key={card.key}
                  className={`rounded-[1.75rem] border p-6 ${card.tone}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                    {card.eyebrow}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold leading-tight text-white">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-stone-400">
                    {card.body}
                  </p>

                  <div className="mt-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                      {card.itemLabel}
                    </div>
                    {card.items.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.items.map((item) => (
                          <span
                            key={`${card.key}-${item}`}
                            className="rounded-full border border-[var(--line-soft)] bg-black/15 px-3 py-1.5 text-xs text-stone-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-stone-500">
                        {copy.expansion.noFurtherUnlocks}
                      </p>
                    )}
                  </div>

                  {launchAction ? (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => startSubmission(launchAction.channelId)}
                        disabled={submitting === launchAction.channelId}
                        className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                      >
                        {submitting === launchAction.channelId
                          ? copy.channels.starting
                          : launchAction.label}
                      </button>
                    </div>
                  ) : linkAction ? (
                    <div className="mt-6">
                      <a
                        href={linkAction.href}
                        className="inline-flex rounded-full bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                      >
                        {linkAction.label}
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {latestResolvedSubmission || managedLaunchPackets.length > 0 ? (
          <section id="results-proof" className="mt-12 scroll-mt-24">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.resultsProof.title}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {copy.resultsProof.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-400">
                {copy.resultsProof.body}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["public", publicProofPackets.length],
                  ["nearPublic", nearPublicPackets.length],
                  ["threads", repliedPackets.length],
                  ["internal", totalSuccessfulActions],
                ] as const
              ).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-[1.4rem] border border-[var(--line-soft)] bg-white/[0.04] p-5"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.resultsProof.stats[key]}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className={`rounded-[1.75rem] border p-6 ${resultsProofStatusTone}`}>
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                  {copy.resultsProof.statusLabel}
                </div>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs font-medium text-white">
                  {copy.resultsProof.statuses[resultsProofStatus].badge}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {copy.resultsProof.statuses[resultsProofStatus].title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-300">
                  {copy.resultsProof.statuses[resultsProofStatus].body}
                </p>
                {resultsProofLastSignal ? (
                  <div className="mt-5 inline-flex rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-stone-200">
                    {copy.resultsProof.latestSignal}:{" "}
                    {formatSubmissionDate(resultsProofLastSignal, locale)}
                  </div>
                ) : null}
                <div className="mt-5">
                  <a
                    href="#proof-pipeline"
                    className="inline-flex rounded-full bg-black/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/25"
                  >
                    {copy.resultsProof.openProofPipeline}
                  </a>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.resultsProof.publicBadge}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {copy.resultsProof.publicTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-400">
                    {copy.resultsProof.publicBody}
                  </p>

                  {publicProofPackets.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {publicProofPackets.map((packet) => (
                        <div
                          key={packet.id}
                          className="rounded-[1.15rem] border border-lime-300/15 bg-lime-300/[0.04] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-lime-300/15 bg-lime-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-lime-100">
                              {managedInboxCopy.managed.threadStage.published}
                            </span>
                            <div className="text-sm font-semibold text-white">{packet.title}</div>
                          </div>
                          <div className="mt-2 text-xs text-stone-500">{packet.targetDomain}</div>
                          <p className="mt-3 text-sm leading-7 text-stone-300">
                            {packet.lastReplySnippet || packet.nextStep}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm leading-7 text-stone-400">
                      {copy.resultsProof.publicEmpty}
                    </p>
                  )}
                </div>

                <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.proofPipeline.priorityTitle}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {copy.resultsProof.nearTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-400">
                    {copy.resultsProof.nearBody}
                  </p>

                  {nearPublicPackets.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {nearPublicPackets.map((packet) => (
                        <div
                          key={packet.id}
                          className="rounded-[1.15rem] border border-white/10 bg-black/15 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {packet.threadStage ? (
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketThreadStageClasses(
                                  packet.threadStage
                                )}`}
                              >
                                {managedInboxCopy.managed.threadStage[packet.threadStage]}
                              </span>
                            ) : null}
                            <div className="text-sm font-semibold text-white">{packet.title}</div>
                          </div>
                          <div className="mt-2 text-xs text-stone-500">{packet.targetDomain}</div>
                          <p className="mt-3 text-sm leading-7 text-stone-300">
                            {packet.threadStageReason ||
                              (packet.threadStage
                                ? managedInboxCopy.managed.threadStageReason[packet.threadStage]
                                : packet.nextStep)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm leading-7 text-stone-400">
                      {copy.resultsProof.nearEmpty}
                    </p>
                  )}
                </div>

                <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.resultsProof.internalBadge}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {copy.resultsProof.internalTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-400">
                    {copy.resultsProof.internalBody}
                  </p>

                  {internalSignalReceipts.length > 0 || latestBlockers.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {internalSignalReceipts.map((result, index) => (
                        <div
                          key={`${result.site}-${index}`}
                          className="rounded-[1.15rem] border border-emerald-300/12 bg-emerald-300/[0.04] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                              {copy.recap.successBadge}
                            </span>
                            <div className="text-sm font-semibold text-white">{result.site}</div>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-stone-300">
                            {summarizeResultOutput(result.output, locale)}
                          </p>
                        </div>
                      ))}
                      {latestBlockers.slice(0, 2).map((result, index) => (
                        <div
                          key={`${result.site}-blocked-${index}`}
                          className="rounded-[1.15rem] border border-red-300/12 bg-red-300/[0.04] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-red-300/15 bg-red-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-red-200">
                              {copy.recap.blockedBadge}
                            </span>
                            <div className="text-sm font-semibold text-white">{result.site}</div>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-stone-300">
                            {summarizeResultOutput(result.output, locale)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm leading-7 text-stone-400">
                      {copy.resultsProof.internalEmpty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {latestResolvedSubmission || managedLaunchPackets.length > 0 ? (
          <section id="proof-pipeline" className="mt-12 scroll-mt-24">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.proofPipeline.title}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {copy.proofPipeline.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-400">
                {copy.proofPipeline.body}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["receipts", proofPipelineStats.receipts],
                  ["threads", proofPipelineStats.threads],
                  ["close", proofPipelineStats.close],
                  ["verify", proofPipelineStats.verify],
                ] as const
              ).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-[1.4rem] border border-[var(--line-soft)] bg-white/[0.04] p-5"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    {copy.proofPipeline.stats[key]}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
              <div className={`rounded-[1.75rem] border p-6 ${proofPriorityTone}`}>
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                  {copy.proofPipeline.priorityTitle}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {proofPriorityTitle}
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-300">
                  {proofPriorityBody}
                </p>
                {latestProofTask ? (
                  <div className="mt-5 rounded-[1rem] border border-white/10 bg-black/15 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                        {copy.proofPipeline.latestTaskTitle}
                      </div>
                      {latestProofTaskStatusLabel ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-200">
                          {copy.proofPipeline.latestTaskStatus}: {latestProofTaskStatusLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-stone-300">
                      {latestProofTask.summary}
                    </p>
                    <div className="mt-3 text-xs text-stone-500">
                      {copy.proofPipeline.latestTaskQueuedAt}:{" "}
                      {formatSubmissionDate(latestProofTask.createdAt, locale)}
                    </div>
                    <div className="mt-2 text-xs text-stone-500">
                      {copy.proofPipeline.latestTaskUpdatedAt}:{" "}
                      {formatSubmissionDate(latestProofTask.updatedAt, locale)}
                    </div>
                    {latestProofTask.completedAt ? (
                      <div className="mt-2 text-xs text-stone-500">
                        {copy.proofPipeline.latestTaskCompletedAt}:{" "}
                        {formatSubmissionDate(latestProofTask.completedAt, locale)}
                      </div>
                    ) : null}
                    <div className="mt-2 text-xs text-stone-500">
                      {copy.proofPipeline.latestTaskReference}: {latestProofTask.id}
                    </div>
                    {latestProofTask.note ? (
                      <p className="mt-3 text-sm leading-7 text-stone-300">
                        {latestProofTask.note}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {latestProofTask.status === "queued" ? (
                        <button
                          type="button"
                          onClick={() => updateProofTask(latestProofTask.id, "start")}
                          disabled={proofTaskActionKey === `${latestProofTask.id}:start`}
                          className="rounded-full bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                        >
                          {proofTaskActionKey === `${latestProofTask.id}:start`
                            ? copy.proofPipeline.updatingTask
                            : copy.proofPipeline.startingTask}
                        </button>
                      ) : null}
                      {(latestProofTask.status === "queued" ||
                        latestProofTask.status === "in_progress") ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateProofTask(latestProofTask.id, "prove")}
                            disabled={proofTaskActionKey === `${latestProofTask.id}:prove`}
                            className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60"
                          >
                            {proofTaskActionKey === `${latestProofTask.id}:prove`
                              ? copy.proofPipeline.updatingTask
                              : copy.proofPipeline.markProved}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProofTask(latestProofTask.id, "drop")}
                            disabled={proofTaskActionKey === `${latestProofTask.id}:drop`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                          >
                            {proofTaskActionKey === `${latestProofTask.id}:drop`
                              ? copy.proofPipeline.updatingTask
                              : copy.proofPipeline.markDropped}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                  {copy.proofPipeline.candidatesTitle}
                </div>

                {proofCandidatePackets.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {proofCandidatePackets.map((packet) => (
                      <div
                        key={packet.id}
                        className="rounded-[1.15rem] border border-white/10 bg-black/15 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {packet.threadStage ? (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${managedPacketThreadStageClasses(
                                packet.threadStage
                              )}`}
                            >
                              {managedInboxCopy.managed.threadStage[packet.threadStage]}
                            </span>
                          ) : null}
                          <div className="text-sm font-semibold text-white">{packet.title}</div>
                        </div>
                        {packet.lastReplySnippet ? (
                          <p className="mt-3 text-sm leading-7 text-stone-300">
                            {packet.lastReplySnippet}
                          </p>
                        ) : null}
                        <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-stone-500">
                          {managedInboxCopy.managed.packetNextStepLabel}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-stone-400">
                          {packet.nextStep}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : latestSuccessReceipts.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {latestSuccessReceipts.slice(0, 3).map((result, index) => (
                      <div
                        key={`${result.site}-${index}`}
                        className="rounded-[1.15rem] border border-emerald-300/12 bg-emerald-300/[0.04] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                            {copy.proofPipeline.receiptCandidateLabel}
                          </span>
                          <div className="text-sm font-semibold text-white">{result.site}</div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          {summarizeResultOutput(result.output, locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-stone-400">
                    {copy.proofPipeline.candidatesEmpty}
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {latestResolvedSubmission ? (
          <section className="mt-12">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                {copy.recap.proofTitle}
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
                {copy.recap.proofTitle}
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-400">
                {copy.recap.proofBody}
              </p>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-2">
              <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                <h3 className="text-xl font-semibold text-white">
                  {copy.recap.receiptsTitle}
                </h3>

                {latestSuccessReceipts.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {latestSuccessReceipts.map((result, index) => (
                      <div
                        key={`${result.site}-${index}`}
                        className="rounded-[1.25rem] border border-emerald-300/15 bg-emerald-300/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-white">{result.site}</div>
                          <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                            {copy.recap.successBadge}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          {summarizeResultOutput(result.output, locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-stone-400">
                    {copy.recap.noReceipts}
                  </p>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6">
                <h3 className="text-xl font-semibold text-white">
                  {copy.recap.blockersTitle}
                </h3>

                {latestBlockers.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {latestBlockers.map((result, index) => (
                      <div
                        key={`${result.site}-${index}`}
                        className="rounded-[1.25rem] border border-red-300/15 bg-red-300/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-white">{result.site}</div>
                          <span className="rounded-full bg-red-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-red-200">
                            {copy.recap.blockedBadge}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          {summarizeResultOutput(result.output, locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-stone-400">
                    {copy.recap.noBlockers}
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {copy.launchMap.title}
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-5xl">
              {copy.launchMap.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              {copy.launchMap.body}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {liveChannels.map((channel) => {
              const localizedChannel = getLocalizedChannel(channel, locale);
              const available = channel.plans.includes(plan);
              const channelSubmission = latestSubmissionByChannel.get(channel.id) || null;
              const channelIsActive =
                channelSubmission?.status === "queued" ||
                channelSubmission?.status === "running";

              let launchMapStatus:
                | "locked"
                | "ready"
                | "recommended"
                | "running"
                | "completed"
                | "failed" = "locked";
              let launchMapBody = copy.launchMap.lockedBody;

              if (!available) {
                launchMapStatus = "locked";
                launchMapBody = copy.launchMap.lockedBody;
              } else if (channelIsActive) {
                launchMapStatus = "running";
                launchMapBody = copy.launchMap.runningBody;
              } else if (channelSubmission?.status === "failed") {
                launchMapStatus = "failed";
                launchMapBody = copy.launchMap.failedBody;
              } else if (channelSubmission?.status === "completed") {
                launchMapStatus = "completed";
                launchMapBody = copy.launchMap.completedBody;
              } else if (recommendedNextLiveChannel?.id === channel.id) {
                launchMapStatus = "recommended";
                launchMapBody = copy.launchMap.recommendedBody;
              } else {
                launchMapStatus = "ready";
                launchMapBody = copy.launchMap.readyBody;
              }

              return (
                <div
                  key={channel.id}
                  className={`rounded-[1.5rem] border p-5 ${launchMapStatusClasses(
                    launchMapStatus
                  )}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-2xl">{channel.icon}</div>
                    <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]">
                      {copy.launchMap.status[launchMapStatus]}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {localizedChannel.name}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    {launchMapBody}
                  </p>
                  {channelSubmission ? (
                    <div className="mt-4 text-xs text-stone-400">
                      {localizedSubmissionStatus(channelSubmission.status, locale)} ·{" "}
                      {formatSubmissionDate(channelSubmission.created_at, locale)}
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-stone-500">
                      {localizedChannel.desc}
                    </div>
                  )}
                </div>
              );
            })}
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

              {recommendedLaneIds.length > 0 ||
              qualityBarIds.length > 0 ||
              antiPatternIds.length > 0 ? (
                <div className="mt-6 rounded-[1.25rem] border border-[var(--line-soft)] bg-black/15 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        {copy.intelligence.playbookTitle}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-stone-400">
                        {copy.intelligence.playbookBody}
                      </p>
                    </div>
                    {playbook.updated_at ? (
                      <div className="text-right text-[10px] text-stone-500">
                        {playbook.updated_at}
                      </div>
                    ) : null}
                  </div>

                  {recommendedLaneIds.length > 0 ? (
                    <div className="mt-5">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        {copy.intelligence.prioritiesTitle}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {recommendedLaneIds.map((laneId) => {
                          const localized = localizePlaybookItem(
                            locale,
                            PLAYBOOK_LANE_COPY,
                            laneId,
                            playbook.raw?.lane_labels?.[laneId]
                          );
                          return (
                            <div
                              key={laneId}
                              className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-3"
                            >
                              <div className="text-sm font-medium text-white">
                                {localized.title}
                              </div>
                              <div className="mt-1 text-xs leading-6 text-stone-400">
                                {localized.description}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        {copy.intelligence.qualityBarTitle}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {qualityBarIds.map((barId) => {
                          const localized = localizePlaybookItem(
                            locale,
                            QUALITY_BAR_COPY,
                            barId
                          );
                          return (
                            <div
                              key={barId}
                              className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-3"
                            >
                              <div className="text-sm font-medium text-white">
                                {localized.title}
                              </div>
                              <div className="mt-1 text-xs leading-6 text-stone-400">
                                {localized.description}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        {copy.intelligence.avoidTitle}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {antiPatternIds.map((patternId) => {
                          const localized = localizePlaybookItem(
                            locale,
                            ANTI_PATTERN_COPY,
                            patternId,
                            playbook.raw?.anti_pattern_labels?.[patternId]
                          );
                          return (
                            <div
                              key={patternId}
                              className="rounded-[1rem] border border-[var(--line-soft)] bg-white/[0.03] p-3"
                            >
                              <div className="text-sm font-medium text-white">
                                {localized.title}
                              </div>
                              <div className="mt-1 text-xs leading-6 text-stone-400">
                                {localized.description}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] text-stone-500">
                    {copy.intelligence.learnedFromLive}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
