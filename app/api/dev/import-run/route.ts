import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { runCoach } from "@/lib/agent/coach";
import { importDevRun, recordTrace, recordTrigger } from "@/lib/repository";

const splitSchema = z.object({
  mile: z.number(),
  pace: z.string()
});

const importRunSchema = z.object({
  id: z.string().optional(),
  name: z.string().default("Dev imported run"),
  startTime: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid startTime")
    .optional(),
  distanceMi: z.number().positive(),
  movingTime: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/),
  averageHr: z.number().optional(),
  maxHr: z.number().optional(),
  splits: z.array(splitSchema).default([])
});

function parseMovingTime(value: string): number {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

const sampleRun = {
  name: "Dev sample pace run",
  startTime: "2026-05-09T07:15:00.000-07:00",
  distanceMi: 5.02,
  movingTime: "0:36:09",
  averageHr: 156,
  maxHr: 171,
  splits: [
    { mile: 1, pace: "7:29" },
    { mile: 2, pace: "7:08" },
    { mile: 3, pace: "7:07" },
    { mile: 4, pace: "7:20" },
    { mile: 5, pace: "7:10" }
  ]
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => sampleRun);
  const parsed = importRunSchema.safeParse(body?.sample ? sampleRun : body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const activityId = data.id ?? `dev-run-${randomUUID()}`;
  const triggerId = `trigger-${randomUUID()}`;
  const movingTimeS = parseMovingTime(data.movingTime);
  const distanceM = data.distanceMi * 1609.344;

  await importDevRun({
    id: activityId,
    startTime: new Date(data.startTime ?? new Date().toISOString()),
    type: "Run",
    distanceM,
    movingTimeS,
    totalElevationGainM: null,
    averageHr: data.averageHr ?? null,
    maxHr: data.maxHr ?? null,
    averageCadence: null,
    averageSpeedMps: distanceM / movingTimeS,
    name: data.name,
    mapPolyline: null,
    splitsJsonb: data.splits,
    rawJsonb: data,
    fetchedAt: new Date()
  });

  await recordTrigger({
    id: triggerId,
    kind: "strava_webhook",
    externalId: activityId,
    payload: { source: "dev_import", activityId }
  });

  const result = await runCoach({ trigger: "post_run" });

  await recordTrace({
    id: result.traceId,
    triggerEventId: triggerId,
    agent: "coach",
    model: process.env.ANTHROPIC_MODEL ?? "fallback-local-coach",
    outputText: result.message
  });

  return NextResponse.json({
    activityId,
    ...result
  });
}
