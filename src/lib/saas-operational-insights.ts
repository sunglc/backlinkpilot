import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_OPERATIONAL_INSIGHTS,
  type OperationalInsights,
} from "@/lib/saas-operational-insights-types";

export { EMPTY_OPERATIONAL_INSIGHTS } from "@/lib/saas-operational-insights-types";
export type {
  OperationalInsights,
  OperationalInsightsDiscoveryMarket,
  OperationalInsightsPaidTarget,
} from "@/lib/saas-operational-insights-types";

const OPERATIONAL_INSIGHTS_PATH = path.join(
  process.cwd(),
  "src/lib/operational-insights.json"
);

export async function readSaasOperationalInsights() {
  try {
    const content = await readFile(OPERATIONAL_INSIGHTS_PATH, "utf8");
    return JSON.parse(content) as OperationalInsights;
  } catch {
    return EMPTY_OPERATIONAL_INSIGHTS;
  }
}
