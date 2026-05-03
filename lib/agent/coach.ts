import { randomUUID } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";

import { buildCoachContext } from "@/lib/agent/context";
import type { CoachResult, CoachTrigger } from "@/lib/agent/types";

const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

function fallbackMessage(
  trigger: CoachTrigger,
  userMessage: string | undefined,
  context: Awaited<ReturnType<typeof buildCoachContext>>
) {
  if (trigger === "morning_brief") {
    return `Today: ${context.todaySummary}. ${context.semanticClaims[0] ?? "Keep the effort honest and leave something for the next run."}`;
  }

  if (trigger === "post_run") {
    return `Solid. Latest run: ${context.latestActivitySummary}. Next plan item: ${context.todaySummary}. ${context.semanticClaims[0] ?? "No pattern promoted yet."}`;
  }

  if (userMessage?.toLowerCase().includes("tomorrow")) {
    const tomorrow = context.planWindow[1];
    if (tomorrow) {
      return `Tomorrow is ${tomorrow.dayType}${tomorrow.prescribedDistanceKm ? ` for ${(tomorrow.prescribedDistanceKm * 0.621371).toFixed(1)}mi` : ""}. ${tomorrow.notes ?? ""}`.trim();
    }
  }

  return `I’m looking at the plan, recent running, and memory. Today is ${context.todaySummary}; latest run is ${context.latestActivitySummary}. My current watch item: ${context.semanticClaims[0] ?? "nothing promoted yet"}.`;
}

export async function runCoach(input: {
  trigger: CoachTrigger;
  userMessage?: string;
}): Promise<CoachResult> {
  const traceId = `trace-${randomUUID()}`;
  const context = await buildCoachContext();

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      traceId,
      trigger: input.trigger,
      message: fallbackMessage(input.trigger, input.userMessage, context),
      proposals: []
    };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = [
    "You are a personal running coach for a sub-1:35 half marathon training block.",
    "Be specific, brief, and grounded only in the provided context.",
    "Do not invent workouts, activity facts, or memory claims.",
    "When a user asks to mutate memory or plan, ask for confirmation unless the change is only logging the user's reported symptom or subjective note.",
    context.proceduralRules.length > 0
      ? `Procedural rules:\n${context.proceduralRules
          .map((rule: string) => `- ${rule}`)
          .join("\n")}`
      : "No procedural rules are active."
  ].join("\n\n");

  const prompt = [
    `Trigger: ${input.trigger}`,
    `Date: ${context.nowIsoDate}`,
    `Race: ${context.profile.race_name} on ${context.profile.race_date}; goal ${context.profile.goal_time} (${context.profile.goal_pace_mi}/mi).`,
    `Days to race: ${context.daysToRace}`,
    `Today: ${context.todaySummary}`,
    `Latest activity: ${context.latestActivitySummary}`,
    `Semantic memory:\n${context.semanticClaims
      .map((claim: string) => `- ${claim}`)
      .join("\n") || "- none"}`,
    input.userMessage ? `User message: ${input.userMessage}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: prompt }]
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  return {
    traceId,
    trigger: input.trigger,
    message: text || fallbackMessage(input.trigger, input.userMessage, context),
    proposals: []
  };
}
