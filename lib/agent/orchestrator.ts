import { randomUUID } from "node:crypto";

import { runCoach } from "@/lib/agent/coach";
import type { CoachResult } from "@/lib/agent/types";
import { recordChatMessage, recordTrace, recordTrigger } from "@/lib/repository";

export async function handleWebChat(input: {
  message: string;
  conversationId?: string;
}): Promise<CoachResult> {
  const conversationId = input.conversationId ?? `conversation-${randomUUID()}`;
  const triggerId = `trigger-${randomUUID()}`;

  await recordTrigger({
    id: triggerId,
    kind: "web_chat",
    externalId: `${conversationId}-${Date.now()}`,
    payload: { message: input.message, conversationId }
  });

  await recordChatMessage({
    id: `message-${randomUUID()}`,
    conversationId,
    role: "user",
    content: input.message
  });

  const result = await runCoach({ trigger: "web_chat", userMessage: input.message });

  await recordTrace({
    id: result.traceId,
    triggerEventId: triggerId,
    agent: "coach",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    outputText: result.message
  });

  await recordChatMessage({
    id: `message-${randomUUID()}`,
    conversationId,
    role: "assistant",
    content: result.message,
    traceId: result.traceId
  });

  return result;
}

export async function handleMorningBrief(): Promise<CoachResult> {
  const triggerId = `trigger-${randomUUID()}`;
  await recordTrigger({
    id: triggerId,
    kind: "cron_morning",
    externalId: new Date().toISOString().slice(0, 10),
    payload: {}
  });

  const result = await runCoach({ trigger: "morning_brief" });
  await recordTrace({
    id: result.traceId,
    triggerEventId: triggerId,
    agent: "coach",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    outputText: result.message
  });
  return result;
}

export async function handlePostRun(payload: Record<string, unknown>): Promise<CoachResult> {
  const triggerId = `trigger-${randomUUID()}`;
  await recordTrigger({
    id: triggerId,
    kind: "strava_webhook",
    externalId: String(payload.object_id ?? payload.event_time ?? Date.now()),
    payload
  });

  const result = await runCoach({ trigger: "post_run" });
  await recordTrace({
    id: result.traceId,
    triggerEventId: triggerId,
    agent: "coach",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    outputText: result.message
  });
  return result;
}
