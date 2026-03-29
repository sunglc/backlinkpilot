export type WorkspaceTaskPlanMode = "auto_coverage" | "import_list";

export type WorkspaceTaskPlanGranularity = "batch" | "per_target";

export type WorkspaceTaskPlanStage =
  | "pending"
  | "planned"
  | "awaiting_effect"
  | "live";

export interface WorkspaceTaskPlanTarget {
  id: string;
  label: string;
  detail: string;
  url: string | null;
  host: string | null;
}

export interface WorkspaceTaskPlan {
  version: 1;
  id: string;
  productId: string;
  userId: string;
  mode: WorkspaceTaskPlanMode;
  granularity: WorkspaceTaskPlanGranularity;
  stage: WorkspaceTaskPlanStage;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  recommendedChannelIds: string[];
  targets: WorkspaceTaskPlanTarget[];
  successCost: number;
  failureCost: number;
}
