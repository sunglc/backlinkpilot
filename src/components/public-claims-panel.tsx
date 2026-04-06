import type { Locale } from "@/lib/locale-config";
import type { SaasPublicClaims } from "@/lib/saas-public-claims";

function getPublicClaimsCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      provenLabel: "当前 proven 市场",
      buildoutLabel: "重点 buildout 市场",
      watchlistLabel: "Watchlist 市场",
      ruleLabel: "对外宣称规则",
      summaryLabel: "当前对用户的核心说法",
      guardrailLabel: "对外口径护栏",
      anchorLabel: "Anchor markets",
      adaptiveLabel: "目标语言自适应文案",
      salesLabel: "销售/演示说明",
      surfacesLabel: "当前影响的用户侧产品面",
      readyStatus: "已证明",
      buildoutStatus: "Buildout",
      watchStatus: "观察中",
      noMarkets: "当前没有可展示的市场。",
      noSurfaces: "当前没有登记用户侧产品面。",
    };
  }

  return {
    provenLabel: "Proven markets",
    buildoutLabel: "Priority buildout markets",
    watchlistLabel: "Watchlist markets",
    ruleLabel: "Claim rule",
    summaryLabel: "Current customer summary",
    guardrailLabel: "Public-claim guardrail",
    anchorLabel: "Anchor markets",
    adaptiveLabel: "Language-adaptive copy",
    salesLabel: "Sales/demo note",
    surfacesLabel: "Customer-facing surfaces affected now",
    readyStatus: "Proven",
    buildoutStatus: "Buildout",
    watchStatus: "Watchlist",
    noMarkets: "No markets are ready to show here yet.",
    noSurfaces: "No customer-facing product surfaces are registered right now.",
  };
}

function joinLabels(locale: Locale, labels: string[]) {
  return labels.length > 0
    ? labels.join(locale === "zh" ? "、" : ", ")
    : null;
}

interface PublicClaimsPanelProps {
  locale: Locale;
  publicClaims: SaasPublicClaims;
  showMarketTiers?: boolean;
  className?: string;
}

export default function PublicClaimsPanel({
  locale,
  publicClaims,
  showMarketTiers = false,
  className = "",
}: PublicClaimsPanelProps) {
  const copy = getPublicClaimsCopy(locale);
  const marketCards = [
    {
      key: "proven",
      label: copy.provenLabel,
      status: copy.readyStatus,
      tone: "text-emerald-200",
      items: publicClaims.provenMarkets,
    },
    {
      key: "buildout",
      label: copy.buildoutLabel,
      status: copy.buildoutStatus,
      tone: "text-amber-200",
      items: publicClaims.buildoutMarkets,
    },
    {
      key: "watchlist",
      label: copy.watchlistLabel,
      status: copy.watchStatus,
      tone: "text-stone-300",
      items: publicClaims.watchlistMarkets,
    },
  ] as const;
  const anchorMarkets =
    joinLabels(
      locale,
      publicClaims.anchorMarkets.map((market) => market.toUpperCase())
    ) || (locale === "zh" ? "无" : "None");
  const customerFacingSurfaces =
    joinLabels(locale, publicClaims.customerFacingSurfaces) || copy.noSurfaces;

  return (
    <div className={className}>
      {showMarketTiers ? (
        <div className="grid gap-4 md:grid-cols-3">
          {marketCards.map((group) => (
            <div
              key={group.key}
              className="rounded-[1.5rem] border border-[var(--line-soft)] bg-black/15 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                  {group.label}
                </p>
                <span className={`text-[10px] uppercase tracking-[0.2em] ${group.tone}`}>
                  {group.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.length > 0 ? (
                  group.items.map((market) => (
                    <span
                      key={`${group.key}:${market}`}
                      className={`rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-3 py-1 text-xs font-medium ${group.tone}`}
                    >
                      {market}
                    </span>
                  ))
                ) : (
                  <span className="text-xs leading-6 text-stone-500">
                    {copy.noMarkets}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] border border-[var(--line-soft)] bg-black/15 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              {copy.ruleLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              {publicClaims.claimRule}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              {copy.summaryLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              {publicClaims.customerSummary}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              {copy.guardrailLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              {publicClaims.claimGuardrail}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              {copy.salesLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              {publicClaims.salesEnablementNote}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              {copy.anchorLabel}
            </p>
            <p className="mt-3 text-xs leading-6 text-stone-500">
              {anchorMarkets}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              {copy.adaptiveLabel}
            </p>
            <p className="mt-3 text-xs leading-6 text-stone-500">
              {publicClaims.localizedCopyNote}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
            {copy.surfacesLabel}
          </p>
          <p className="mt-3 text-xs leading-6 text-stone-500">
            {customerFacingSurfaces}
          </p>
        </div>
      </div>
    </div>
  );
}
