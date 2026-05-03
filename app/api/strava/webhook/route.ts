import { NextResponse } from "next/server";

import { handlePostRun } from "@/lib/agent/orchestrator";
import { isRunCreateEvent, verifyStravaWebhookSignature } from "@/lib/strava/webhook";
import { syncActivity } from "@/lib/strava/sync";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Invalid verification request" }, { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.text();
  const verified = verifyStravaWebhookSignature({
    body,
    signatureHeader: request.headers.get("x-strava-signature"),
    secret: process.env.STRAVA_WEBHOOK_SECRET
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as Record<string, unknown>;
  if (!isRunCreateEvent(payload)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (payload.object_id) {
    await syncActivity(String(payload.object_id));
  }

  const result = await handlePostRun(payload);
  return NextResponse.json(result);
}
