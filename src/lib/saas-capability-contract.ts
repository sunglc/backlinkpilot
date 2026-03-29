import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_SAAS_CAPABILITY_CONTRACT,
  type SaasCapabilityContract,
} from "@/lib/saas-capability-contract-types";

const CAPABILITY_CONTRACT_PATH = path.join(
  process.cwd(),
  "src/lib/capability-upgrade-feed.json"
);

export async function readSaasCapabilityContract() {
  try {
    const content = await readFile(CAPABILITY_CONTRACT_PATH, "utf8");
    return JSON.parse(content) as SaasCapabilityContract;
  } catch {
    return EMPTY_SAAS_CAPABILITY_CONTRACT;
  }
}
