import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { runCoach } from "@/lib/agent/coach";
import { recordTrace, recordTrigger } from "@/lib/repository";
import { syncRecentStravaRuns } from "@/lib/strava/sync";

const syncRequestSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = syncRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const triggerId = `trigger-${randomUUID()}`;
    const sync = await syncRecentStravaRuns({ limit: parsed.data.limit });

    await recordTrigger({
      id: triggerId,
      kind: "strava_webhook",
      externalId: `manual-strava-sync-${Date.now()}`,
      payload: {
        source: "manual_strava_sync",
        synced: sync.synced,
        skipped: sync.skipped,
        activityIds: sync.activities.map((activity) => activity.id)
      }
    });

    if (!sync.latestActivity) {
      return NextResponse.json({
        ok: true,
        synced: 0,
        skipped: sync.skipped,
        latestActivityId: null,
        message: "No recent Strava runs found.",
        traceId: null,
        refreshedToken: sync.refreshedToken
      });
    }

    const result = await runCoach({ trigger: "post_run" });
    await recordTrace({
      id: result.traceId,
      triggerEventId: triggerId,
      agent: "coach",
      model: process.env.ANTHROPIC_MODEL ?? "fallback-local-coach",
      outputText: result.message
    });

    return NextResponse.json({
      ok: true,
      synced: sync.synced,
      skipped: sync.skipped,
      latestActivityId: sync.latestActivity.id,
      message: result.message,
      traceId: result.traceId,
      refreshedToken: sync.refreshedToken
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Strava sync failed"
      },
      { status: 500 }
    );
  }
}
