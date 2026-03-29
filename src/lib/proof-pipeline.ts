import type {
  ManagedInboxLaunchPacketThreadStage,
  ManagedInboxRecord,
} from "@/lib/managed-inbox-types";

export type ProductProofPriority =
  | "verify_published"
  | "protect_publication"
  | "send_materials"
  | "review_commercial"
  | "hold_review"
  | "push_receipts"
  | "build_signal";

export interface ProductProofSubmissionSnapshot {
  success_sites: number;
  created_at: string;
}

export interface ProductProofSummary {
  counts: {
    receipts: number;
    threads: number;
    close: number;
    verify: number;
  };
  priority: ProductProofPriority;
  topStage: ManagedInboxLaunchPacketThreadStage | null;
  score: number;
  lastSignalAt: string | null;
  candidateLabels: string[];
}

function stageRank(stage: ManagedInboxLaunchPacketThreadStage | null) {
  if (stage === "published") {
    return 6;
  }
  if (stage === "publication_ready") {
    return 5;
  }
  if (stage === "needs_materials") {
    return 4;
  }
  if (stage === "commercial_review") {
    return 3;
  }
  if (stage === "under_review") {
    return 2;
  }
  if (stage === "thread_open") {
    return 1;
  }
  return 0;
}

export function summarizeProductProofPipeline(args: {
  record: ManagedInboxRecord | null;
  submissions: ProductProofSubmissionSnapshot[];
}): ProductProofSummary {
  const packets = args.record?.launchRequest?.packets || [];
  const repliedPackets = packets.filter((packet) => packet.replyStatus === "replied");
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

  const counts = {
    receipts: args.submissions.reduce(
      (sum, submission) => sum + submission.success_sites,
      0
    ),
    threads: repliedPackets.length,
    close: publicationReadyPackets.length,
    verify: publishedPackets.length,
  };

  let priority: ProductProofPriority = "build_signal";
  let topStage: ManagedInboxLaunchPacketThreadStage | null = null;

  if (publishedPackets.length > 0) {
    priority = "verify_published";
    topStage = "published";
  } else if (publicationReadyPackets.length > 0) {
    priority = "protect_publication";
    topStage = "publication_ready";
  } else if (needsMaterialsPackets.length > 0) {
    priority = "send_materials";
    topStage = "needs_materials";
  } else if (commercialReviewPackets.length > 0) {
    priority = "review_commercial";
    topStage = "commercial_review";
  } else if (underReviewPackets.length > 0 || threadOpenPackets.length > 0) {
    priority = "hold_review";
    topStage =
      underReviewPackets.length > 0 ? "under_review" : "thread_open";
  } else if (counts.receipts > 0) {
    priority = "push_receipts";
  }

  const candidateLabels = repliedPackets
    .slice()
    .sort((left, right) => {
      const rankDelta = stageRank(right.threadStage) - stageRank(left.threadStage);
      if (rankDelta !== 0) {
        return rankDelta;
      }
      const leftDate = left.lastReplyAt || left.sentAt || "";
      const rightDate = right.lastReplyAt || right.sentAt || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 3)
    .map((packet) => packet.title);

  const lastPacketSignalAt = repliedPackets
    .map((packet) => packet.lastReplyAt || packet.sentAt || "")
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
  const lastSubmissionSignalAt = args.submissions
    .map((submission) => submission.created_at)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
  const lastSignalAt =
    [lastPacketSignalAt, lastSubmissionSignalAt]
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left))[0] || null;

  const score =
    counts.verify * 40 +
    counts.close * 25 +
    needsMaterialsPackets.length * 16 +
    commercialReviewPackets.length * 12 +
    underReviewPackets.length * 10 +
    threadOpenPackets.length * 8 +
    counts.receipts * 2;

  return {
    counts,
    priority,
    topStage,
    score,
    lastSignalAt,
    candidateLabels,
  };
}
