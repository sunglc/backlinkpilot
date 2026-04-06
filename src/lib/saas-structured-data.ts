import type { SaasPublicClaims } from "@/lib/saas-public-claims";
import { buildClaimAwareDescription } from "@/lib/saas-public-claims";

function compact(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean) as string[];
}

export function buildSoftwareApplicationStructuredData(args: {
  locale: "zh" | "en";
  name: string;
  url: string;
  baseDescription: string;
  publicClaims: SaasPublicClaims;
  keywords: string[];
  priceUsd?: number;
  featureList?: string[];
}) {
  const description = buildClaimAwareDescription({
    locale: args.locale,
    baseDescription: args.baseDescription,
    publicClaims: args.publicClaims,
  });

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: args.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: args.url,
    description,
    keywords: args.keywords.join(", "),
    featureList: compact([
      ...(args.featureList || []),
      args.publicClaims.customerSummary,
      args.publicClaims.claimGuardrail,
      args.publicClaims.localizedCopyNote,
    ]),
    availableLanguage: compact([
      ...args.publicClaims.provenMarkets,
      ...args.publicClaims.buildoutMarkets.slice(0, 2),
    ]),
    offers: args.priceUsd
      ? {
          "@type": "Offer",
          price: String(args.priceUsd),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: args.url,
        }
      : undefined,
  };
}
