import {
  formatKm,
  formatMiles,
  pacePerMile
} from "@/lib/dates";
import {
  getActiveMemory,
  getLatestActivity,
  getPlanForDate,
  getPlanWindow,
  getRecentActivities
} from "@/lib/repository";
import type { Activity } from "@/lib/db/schema";

export async function getActivitySummary() {
  const activity = await getLatestActivity();
  if (!activity) return "No synced activities yet.";

  return `${activity.name}: ${formatMiles(activity.distanceM)} at ${pacePerMile(
    activity.distanceM,
    activity.movingTimeS
  )}/mi avg.`;
}

export async function getRecentRunsSummary(limit = 5) {
  const runs = await getRecentActivities(limit);
  if (runs.length === 0) return "No recent runs.";

  return runs
    .map((run: Activity) => {
      return `${run.name} (${run.startTime.toISOString().slice(0, 10)}): ${formatMiles(
        run.distanceM
      )} at ${pacePerMile(run.distanceM, run.movingTimeS)}/mi`;
    })
    .join("\n");
}

export async function readPlanSummary(date?: string) {
  const day = await getPlanForDate(date);
  if (!day) return "No plan row found.";

  const distance = day.prescribedDistanceKm ? `${formatKm(day.prescribedDistanceKm)} ` : "";
  const duration = day.prescribedDurationMin ? `${day.prescribedDurationMin}min ` : "";
  const pace = day.prescribedPace ? ` @ ${day.prescribedPace}` : "";
  return `${day.date}: ${distance}${duration}${day.dayType}${pace}. ${day.notes ?? ""}`.trim();
}

export async function readPlanWindowSummary() {
  const days = await getPlanWindow(7);
  return days
    .map((day) => {
      const distance = day.prescribedDistanceKm ? `${formatKm(day.prescribedDistanceKm)} ` : "";
      return `${day.date}: ${distance}${day.dayType} (${day.notes ?? "no notes"})`;
    })
    .join("\n");
}

export async function readMemorySummary() {
  const memory = await getActiveMemory();
  const semantic = memory.semantic.map((item) => `- ${item.claimText}`).join("\n");
  const procedural = memory.procedural.map((item) => `- ${item.ruleText}`).join("\n");

  return [
    "What I am watching:",
    semantic || "- Nothing promoted yet.",
    "",
    "Rules:",
    procedural || "- No rules yet."
  ].join("\n");
}

export const coachToolDescriptions = [
  {
    name: "get_activity",
    description: "Read the latest synced Strava activity as a concise summary."
  },
  {
    name: "get_recent_runs",
    description: "Read recent runs with dates, distances, and average paces."
  },
  {
    name: "read_plan",
    description: "Read the training plan for a specific date or the current day."
  },
  {
    name: "read_memory",
    description: "Read active semantic and procedural memory."
  },
  {
    name: "propose_memory_update",
    description: "Propose a memory update; conversational mutations require confirmation."
  },
  {
    name: "propose_plan_change",
    description: "Propose a training plan change; never mutate without confirmation."
  }
] as const;
