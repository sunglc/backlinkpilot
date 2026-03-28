import { NextResponse } from "next/server";

import {
  buildOpsStatusSummaryZh,
  getOpsStatusAuthMode,
  isOpsStatusAuthorized,
  loadOpsStatus,
} from "@/lib/ops-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsStatusAuthorized(request)) {
    return NextResponse.json(
      { error: "未授权访问" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="BacklinkPilot Ops"' },
      }
    );
  }

  const authMode = getOpsStatusAuthMode(request);
  const payload = await loadOpsStatus(request);
  return NextResponse.json({
    ...payload,
    summaryZh: buildOpsStatusSummaryZh(payload, authMode),
  });
}
