import "server-only";

import { readSaasCapabilityContract } from "@/lib/saas-capability-contract";
import { readSaasOperationalInsights } from "@/lib/saas-operational-insights";
import { buildSaasPublicClaims } from "@/lib/saas-public-claims";

export async function readSaasPublicClaims() {
  const [capabilityContract, operationalInsights] = await Promise.all([
    readSaasCapabilityContract(),
    readSaasOperationalInsights(),
  ]);

  return buildSaasPublicClaims({
    capabilityContract,
    operationalInsights,
  });
}
