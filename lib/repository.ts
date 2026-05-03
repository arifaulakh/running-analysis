import { desc, eq, isNull } from "drizzle-orm";

import { db, hasDatabaseUrl } from "@/lib/db/client";
import {
  type Activity,
  type PlanDay,
  type ProceduralMemory,
  type SemanticMemory,
  type TraceEvent,
  type ToolCall,
  activities,
  conversations,
  messages,
  planDays,
  proceduralMemory,
  profile,
  pushSubscriptions,
  semanticMemory,
  toolCalls,
  traceEvents,
  triggerEvents
} from "@/lib/db/schema";
import {
  seedActivities,
  seedPlanDays,
  seedProfile
} from "@/lib/db/seed";
import { readDevStore, updateDevStore } from "@/lib/dev-store";
import { isoDate } from "@/lib/dates";

export type CoachHome = Awaited<ReturnType<typeof getHomeContext>>;

export async function getProfile(): Promise<Record<string, string>> {
  if (!hasDatabaseUrl()) return { ...seedProfile };

  const rows = await db().select().from(profile);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getPlanForDate(date = isoDate(new Date())): Promise<PlanDay | null> {
  if (!hasDatabaseUrl()) {
    return seedPlanDays.find((day) => day.date === date) ?? seedPlanDays[0];
  }

  const [row] = await db().select().from(planDays).where(eq(planDays.date, date)).limit(1);
  return row ?? null;
}

export async function getPlanWindow(limit = 7): Promise<PlanDay[]> {
  if (!hasDatabaseUrl()) return seedPlanDays.slice(0, limit);

  return db().select().from(planDays).limit(limit);
}

export async function getRecentActivities(limit = 5): Promise<Activity[]> {
  if (!hasDatabaseUrl()) {
    const store = await readDevStore();
    return store.activities
      .slice()
      .sort((a: Activity, b: Activity) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  return db().select().from(activities).orderBy(desc(activities.startTime)).limit(limit);
}

export async function getLatestActivity(): Promise<Activity | null> {
  const runs = await getRecentActivities(1);
  return runs[0] ?? null;
}

export async function getActiveMemory(): Promise<{
  semantic: SemanticMemory[];
  procedural: ProceduralMemory[];
}> {
  if (!hasDatabaseUrl()) {
    const store = await readDevStore();
    return {
      semantic: store.semanticMemory.filter((item) => !item.retiredAt),
      procedural: store.proceduralMemory.filter((item) => !item.retiredAt)
    };
  }

  const [semantic, procedural] = await Promise.all([
    db().select().from(semanticMemory).where(isNull(semanticMemory.retiredAt)),
    db().select().from(proceduralMemory).where(isNull(proceduralMemory.retiredAt))
  ]);

  return { semantic, procedural };
}

export async function getHomeContext() {
  const [profileData, today, planWindow, latestActivity, memory, traces] = await Promise.all([
    getProfile(),
    getPlanForDate(),
    getPlanWindow(),
    getLatestActivity(),
    getActiveMemory(),
    getTraceList(5)
  ]);

  return {
    profile: profileData,
    today,
    planWindow,
    latestActivity,
    memory,
    latestTrace: traces[0] ?? null,
    databaseConnected: hasDatabaseUrl()
  };
}

export async function getTraceList(limit = 25): Promise<TraceEvent[]> {
  if (!hasDatabaseUrl()) {
    const store = await readDevStore();
    return store.traces
      .slice()
      .sort((a: TraceEvent, b: TraceEvent) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  return db().select().from(traceEvents).orderBy(desc(traceEvents.startedAt)).limit(limit);
}

export async function getTraceDetail(id: string): Promise<{
  trace: TraceEvent | null;
  toolCalls: ToolCall[];
}> {
  if (!hasDatabaseUrl()) {
    const store = await readDevStore();
    const trace = store.traces.find((item) => item.id === id) ?? null;
    return {
      trace,
      toolCalls: store.toolCalls.filter((call) => call.traceId === id)
    };
  }

  const [trace] = await db().select().from(traceEvents).where(eq(traceEvents.id, id)).limit(1);
  const calls = await db().select().from(toolCalls).where(eq(toolCalls.traceId, id));
  return {
    trace: trace ?? null,
    toolCalls: calls
  };
}

export async function recordTrigger(input: {
  id: string;
  kind: "strava_webhook" | "cron_morning" | "web_chat";
  externalId: string;
  payload: Record<string, unknown>;
}) {
  if (!hasDatabaseUrl()) return;

  await db()
    .insert(triggerEvents)
    .values({
      id: input.id,
      kind: input.kind,
      externalId: input.externalId,
      payloadJsonb: input.payload
    })
    .onConflictDoNothing();
}

export async function recordTrace(input: {
  id: string;
  triggerEventId?: string;
  agent: "coach" | "observer" | "planner";
  model: string;
  outputText: string;
  status?: "done" | "failed";
}) {
  if (!hasDatabaseUrl()) {
    await updateDevStore((store) => {
      const now = new Date();
      store.traces.unshift({
        id: input.id,
        triggerEventId: input.triggerEventId ?? null,
        agent: input.agent,
        startedAt: now,
        endedAt: now,
        tokensIn: 0,
        tokensOut: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        costUsd: "0",
        model: input.model,
        status: input.status ?? "done",
        outputText: input.outputText
      });
    });
    return;
  }

  await db().insert(traceEvents).values({
    id: input.id,
    triggerEventId: input.triggerEventId,
    agent: input.agent,
    model: input.model,
    status: input.status ?? "done",
    outputText: input.outputText,
    endedAt: new Date()
  });
}

export async function recordChatMessage(input: {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  traceId?: string;
}) {
  if (!hasDatabaseUrl()) return;

  await db()
    .insert(conversations)
    .values({ id: input.conversationId, channel: "web" })
    .onConflictDoNothing();
  await db().insert(messages).values(input);
}

export async function registerPushSubscription(input: {
  id: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
}) {
  if (!hasDatabaseUrl()) return;

  await db()
    .insert(pushSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dhKey: input.p256dhKey,
        authKey: input.authKey,
        userAgent: input.userAgent,
        revokedAt: null
      }
    });
}

export async function importDevRun(activity: typeof seedActivities[number]) {
  if (hasDatabaseUrl()) {
    await db()
      .insert(activities)
      .values(activity)
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          startTime: activity.startTime,
          type: activity.type,
          distanceM: activity.distanceM,
          movingTimeS: activity.movingTimeS,
          totalElevationGainM: activity.totalElevationGainM,
          averageHr: activity.averageHr,
          maxHr: activity.maxHr,
          averageCadence: activity.averageCadence,
          averageSpeedMps: activity.averageSpeedMps,
          name: activity.name,
          splitsJsonb: activity.splitsJsonb,
          rawJsonb: activity.rawJsonb,
          fetchedAt: activity.fetchedAt
        }
      });
    return;
  }

  await updateDevStore((store) => {
    store.activities = [
      activity,
      ...store.activities.filter((existing) => existing.id !== activity.id)
    ];
  });
}

export async function saveMemoryMarkdown(markdown: string) {
  if (!hasDatabaseUrl()) {
    await updateDevStore((store) => {
      store.memoryMarkdown = markdown;
    });
  }
}

export async function getMemoryMarkdownOverride() {
  if (hasDatabaseUrl()) return undefined;
  const store = await readDevStore();
  return store.memoryMarkdown;
}
