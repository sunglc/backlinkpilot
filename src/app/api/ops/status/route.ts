import { NextResponse } from "next/server";

import { isOpsStatusAuthorized, loadOpsStatus } from "@/lib/ops-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsStatusAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="BacklinkPilot Ops"' },
      }
    );
  }

  const payload = await loadOpsStatus(request);
  return NextResponse.json(payload);
}
