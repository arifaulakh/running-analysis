import { readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";
import { z } from "zod";

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const workoutSchema = z.object({
  type: z.string(),
  distance_km: z.number().optional(),
  duration_min: z.number().optional(),
  pace_zone: z.string().optional(),
  notes: z.string().optional()
});

const planSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  source_url: z.string().url(),
  units: z.literal("km"),
  weeks: z.record(z.record(workoutSchema))
});

export type AnchoredPlanRow = {
  date: string;
  weekNum: number;
  phase: "base" | "build" | "peak" | "taper" | "race";
  dayType: string;
  prescribedDistanceKm: number | null;
  prescribedDurationMin: number | null;
  prescribedPace: string | null;
  notes: string | null;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function mondayOfRaceWeek(raceDate: Date): Date {
  const day = raceDate.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(raceDate, offset);
}

function phaseForWeek(weekNum: number): AnchoredPlanRow["phase"] {
  if (weekNum <= 3) return "base";
  if (weekNum <= 7) return "build";
  if (weekNum <= 10) return "peak";
  if (weekNum === 11) return "taper";
  return "race";
}

export async function loadHigdonPlan() {
  const file = await readFile(path.join(process.cwd(), "lib/plan/higdon_int_2.yaml"), "utf8");
  return planSchema.parse(YAML.parse(file));
}

export function anchorPlanRows(
  plan: z.infer<typeof planSchema>,
  raceDateIso: string
): AnchoredPlanRow[] {
  const raceDate = new Date(`${raceDateIso}T00:00:00.000Z`);
  const weekKeys = Object.keys(plan.weeks).sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]));
  const start = addDays(mondayOfRaceWeek(raceDate), -7 * (weekKeys.length - 1));

  return anchorPlanRowsToStart(plan, start.toISOString().slice(0, 10));
}

export function anchorPlanRowsToStart(
  plan: z.infer<typeof planSchema>,
  startDateIso: string
): AnchoredPlanRow[] {
  const weekKeys = Object.keys(plan.weeks).sort(
    (a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1])
  );
  const start = new Date(`${startDateIso}T00:00:00.000Z`);

  return weekKeys.flatMap((weekKey, weekIndex) => {
    const weekNum = weekIndex + 1;
    const week = plan.weeks[weekKey];

    return dayNames.map((dayName, dayIndex) => {
      const workout = week[dayName];
      const date = addDays(start, weekIndex * 7 + dayIndex).toISOString().slice(0, 10);
      return {
        date,
        weekNum,
        phase: phaseForWeek(weekNum),
        dayType: workout.type,
        prescribedDistanceKm: workout.distance_km ?? null,
        prescribedDurationMin: workout.duration_min ?? null,
        prescribedPace: workout.pace_zone ?? null,
        notes: workout.notes ?? null
      };
    });
  });
}
