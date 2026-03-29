import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_SAAS_CAPABILITY_HISTORY,
  type SaasCapabilityHistory,
} from "@/lib/saas-capability-history-types";

const CAPABILITY_HISTORY_PATH = path.join(
  process.cwd(),
  "src/lib/capability-upgrade-history.json"
);

export async function readSaasCapabilityHistory() {
  try {
    const content = await readFile(CAPABILITY_HISTORY_PATH, "utf8");
    return JSON.parse(content) as SaasCapabilityHistory;
  } catch {
    return EMPTY_SAAS_CAPABILITY_HISTORY;
  }
}
