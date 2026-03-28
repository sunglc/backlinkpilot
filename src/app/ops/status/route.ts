import { NextResponse } from "next/server";

import {
  getOpsStatusAuthMode,
  getProvidedOpsToken,
  isOpsStatusAuthorized,
  loadOpsStatus,
  renderOpsStatusHtml,
} from "@/lib/ops-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsStatusAuthorized(request)) {
    return new NextResponse("未授权访问", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "WWW-Authenticate": 'Basic realm="BacklinkPilot Ops"',
      },
    });
  }

  const payload = await loadOpsStatus(request);
  const html = renderOpsStatusHtml(
    payload,
    getProvidedOpsToken(request),
    getOpsStatusAuthMode(request)
  );
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
