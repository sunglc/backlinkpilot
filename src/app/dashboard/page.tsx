import { redirect } from "next/navigation";
import { loginHrefForNext } from "@/lib/auth-return";
import {
  getManagedInboxRecord,
  reconcileManagedInboxRecordWithSendLog,
} from "@/lib/managed-inbox-server";
import type { WorkspacePolicyClientSnapshot } from "@/lib/workspace-policy-types";
import { buildWorkspacePolicySnapshot } from "@/lib/workspace-policy";
import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import { summarizeProductProofPipeline } from "@/lib/proof-pipeline";
import { readSaasOperationalInsights } from "@/lib/saas-operational-insights";
import { readWorkspaceTaskPlans } from "@/lib/workspace-task-plans";
import DashboardClient from "./dashboard-client";

type DashboardSearchParams = Promise<{
  checkout?: string | string[];
}>;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const checkoutParam = Array.isArray(resolvedSearchParams.checkout)
    ? resolvedSearchParams.checkout[0]
    : resolvedSearchParams.checkout;
  const checkoutState =
    checkoutParam === "success" || checkoutParam === "cancelled"
      ? checkoutParam
      : null;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = checkoutState
      ? `/dashboard?checkout=${checkoutState}`
      : "/dashboard";
    redirect(loginHrefForNext(nextPath));
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();
  const currentPlan =
    subscription?.status === "active" ? subscription.plan || "starter" : "free";

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const productIds = (products || []).map((product) => product.id);
  const { data: submissions } = productIds.length
    ? await supabase
        .from("submissions")
        .select(
          "id, product_id, channel, status, total_sites, completed_sites, success_sites, created_at"
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const operationalInsights = await readSaasOperationalInsights();
  const workspacePolicySnapshot = await buildWorkspacePolicySnapshot({
    userId: user.id,
    currentPlan,
    products: (products || []).map((product) => ({
      id: product.id,
      name: product.name || "",
    })),
    submissions: submissions || [],
  });
  const mapLaneOwners = (productIds: string[]) =>
    productIds.flatMap((productId) => {
      const product = workspacePolicySnapshot.products.find(
        (candidate) => candidate.productId === productId
      );

      if (!product) {
        return [];
      }

      return [
        {
          productId: product.productId,
          productName: product.productName,
          workspaceLane: product.lane,
          proofScore: product.proofScore,
          openSubmissionCount: product.openSubmissionCount,
          receiptCount: product.receiptCount,
          repliedThreadCount: product.repliedThreadCount,
          closeCount: product.closeCount,
          verifyCount: product.verifyCount,
          activeProofTaskCount: product.activeProofTaskCount,
        },
      ];
    });
  const workspacePolicy = {
    currentPlan: workspacePolicySnapshot.currentPlan,
    strategyMode: workspacePolicySnapshot.strategyMode,
    loads: workspacePolicySnapshot.loads,
    capacity: workspacePolicySnapshot.capacity,
    allowances: workspacePolicySnapshot.allowances,
    laneOwners: {
      submission: mapLaneOwners(workspacePolicySnapshot.laneOwners.submission),
      proof: mapLaneOwners(workspacePolicySnapshot.laneOwners.proof),
      premium: mapLaneOwners(workspacePolicySnapshot.laneOwners.premium),
    },
  } satisfies WorkspacePolicyClientSnapshot;
  const workspaceTaskPlans = (
    await Promise.all(
      (products || []).map((product) =>
        readWorkspaceTaskPlans({
          productId: product.id,
          userId: user.id,
        })
      )
    )
  ).flat();
  const productProofSummaries = await Promise.all(
    (products || []).map(async (product) => {
      const initialManagedInboxRecord = await getManagedInboxRecord({
        productId: product.id,
        userId: user.id,
      });
      const managedInboxRecord = await reconcileManagedInboxRecordWithSendLog({
        record: initialManagedInboxRecord,
        product: {
          id: product.id,
          name: product.name || "",
          url: product.url || "",
          description: product.description || "",
        },
      });

      return {
        productId: product.id,
        ...summarizeProductProofPipeline({
          record: managedInboxRecord,
          submissions: (submissions || []).filter(
            (submission) => submission.product_id === product.id
          ),
        }),
      };
    })
  );

  return (
    <DashboardClient
      locale={locale}
      user={user}
      subscription={subscription}
      products={products || []}
      submissions={submissions || []}
      productProofSummaries={productProofSummaries}
      operationalInsights={operationalInsights}
      workspaceTaskPlans={workspaceTaskPlans}
      workspacePolicy={workspacePolicy}
      checkoutState={checkoutState}
    />
  );
}
