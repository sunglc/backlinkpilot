import { NextResponse } from "next/server";
import { readSaasCapabilityContract } from "@/lib/saas-capability-contract";
import {
  acknowledgeSaasCapabilityReview,
  readSaasCapabilityReviewState,
} from "@/lib/saas-capability-review-state";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contract = await readSaasCapabilityContract();
  const reviewState = await readSaasCapabilityReviewState({
    userId: user.id,
    currentFingerprint: contract.capability_fingerprint,
  });

  return NextResponse.json({ reviewState });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contract = await readSaasCapabilityContract();

  if (!contract.capability_fingerprint) {
    return NextResponse.json(
      { error: "No capability fingerprint available." },
      { status: 400 }
    );
  }

  const reviewState = await acknowledgeSaasCapabilityReview({
    userId: user.id,
    fingerprint: contract.capability_fingerprint,
  });

  return NextResponse.json({ reviewState });
}
