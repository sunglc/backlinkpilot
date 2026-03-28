import { NextResponse } from "next/server";

import { fetchSitePreview } from "@/lib/site-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  try {
    const preview = await fetchSitePreview(body.url || "");
    return NextResponse.json(preview);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not preview that website.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
