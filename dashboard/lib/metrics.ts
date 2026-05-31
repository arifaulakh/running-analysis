import type {
  DashboardData,
  DashboardMetrics,
  LongRunPoint,
  MemoryClaim,
  PacePoint,
  PlanDay,
  PlanWeek,
  RecentRun,
  Run,
  WeeklyVolume,
  WeekSessions
} from "./types";
import { formatPace, parsePace } from "./pace";

const RACE_DISTANCE_KM = 21.1;

function asDateString(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function formatDateLabel(date: string) {
  const parsed = utcDate(date);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function getToday() {
  if (process.env.DASHBOARD_TODAY) {
    return process.env.DASHBOARD_TODAY;
  }
  // Use the local calendar date, not the UTC date. toISOString() returns UTC,
  // which rolls over a day early in the evening for negative-offset zones (e.g.
  // PT), making "today" — and therefore days-to-race and the current week — off
  // by one.
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  return Math.ceil((utcDate(end).getTime() - utcDate(start).getTime()) / 86_400_000);
}

export function weekForDate(date: string, weeks: PlanWeek[]) {
  return weeks.find((week) => {
    const start = asDateString(week.start_date);
    const end = asDateString(week.end_date);
    return date >= start && date <= end;
  });
}

function prescribedDistanceKm(week: PlanWeek) {
  return Object.values(week.days || {}).reduce((total, day) => {
    if (typeof day.distance_km === "number") {
      return total + day.distance_km;
    }

    if (day.race_distance === "half marathon") {
      return total + RACE_DISTANCE_KM;
    }

    if (day.race_distance === "10K") {
      return total + 10;
    }

    if (day.race_distance === "15K") {
      return total + 15;
    }

    if (day.race_distance === "5K") {
      return total + 5;
    }

    return total;
  }, 0);
}

function completedDistanceKm(runs: Run[], week: PlanWeek) {
  const start = asDateString(week.start_date);
  const end = asDateString(week.end_date);
  return runs.reduce((total, run) => {
    if (run.date >= start && run.date <= end && typeof run.distance_km === "number") {
      return total + run.distance_km;
    }
    return total;
  }, 0);
}

function buildWeeklyVolume(data: DashboardData): WeeklyVolume[] {
  return data.plan.weeks.map((week) => ({
    label: `W${week.week}`,
    week: week.week,
    phase: week.phase,
    prescribedKm: rounded(prescribedDistanceKm(week)),
    completedKm: rounded(completedDistanceKm(data.runs, week))
  }));
}

function buildPaceSeries(runs: Run[]): PacePoint[] {
  return runs
    .filter((run) => run.avg_pace_per_km && typeof run.distance_km === "number")
    .map((run) => ({
      date: run.date,
      label: formatDateLabel(run.date),
      type: run.type_inferred || "other",
      paceSec: parsePace(run.avg_pace_per_km),
      hr: typeof run.avg_hr === "number" ? run.avg_hr : null,
      km: rounded(run.distance_km || 0),
      notes: run.notes || run.raw_input || ""
    }))
    .filter((point) => point.paceSec > 0);
}

function buildLongRuns(data: DashboardData): LongRunPoint[] {
  return data.plan.weeks.map((week) => {
    const start = asDateString(week.start_date);
    const end = asDateString(week.end_date);
    const longest = data.runs.reduce((max, run) => {
      if (run.date >= start && run.date <= end && typeof run.distance_km === "number") {
        return Math.max(max, run.distance_km);
      }
      return max;
    }, 0);

    return {
      label: `W${week.week}`,
      week: week.week,
      longestKm: rounded(longest)
    };
  });
}

function buildRecentRuns(runs: Run[]): RecentRun[] {
  return runs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((run) => ({
      id: run.id,
      date: run.date,
      type: run.type_inferred || "other",
      distanceKm: typeof run.distance_km === "number" ? rounded(run.distance_km) : null,
      pace: run.avg_pace_per_km || null,
      hr: typeof run.avg_hr === "number" ? run.avg_hr : null,
      notes: run.notes || run.raw_input || ""
    }));
}

function sessionLabel(day: PlanDay): string {
  const dist = typeof day.distance_km === "number" ? `${rounded(day.distance_km)} km` : null;
  if (day.race_distance) {
    return `race · ${day.race_distance}`;
  }
  switch (day.type) {
    case "long":
      return dist ? `long run · ${dist}` : "long run";
    case "interval":
      return day.intervals ? `intervals · ${day.intervals}` : "intervals";
    case "cross":
      return "cross-training";
    case "tempo":
      return dist ? `tempo · ${dist}` : "tempo run";
    case "pace":
      return dist ? `pace · ${dist}` : "pace run";
    case "easy":
      return dist ? `easy · ${dist}` : "easy run";
    default:
      return dist ? `${day.type} · ${dist}` : day.type;
  }
}

function buildWeekSessions(runs: Run[], week: PlanWeek | undefined): WeekSessions | null {
  if (!week) {
    return null;
  }
  // A planned session counts as done if any run was logged on that date. This
  // sidesteps the prescribed-vs-completed km mismatch: interval/cross days have
  // no distance in the plan, so a distance ratio under/over-counts them.
  const runDates = new Set(runs.map((run) => run.date));
  const sessions = Object.values(week.days || {})
    .filter((day): day is PlanDay & { date: string | Date } => day.type !== "rest" && day.date != null)
    .map((day) => {
      const date = asDateString(day.date);
      return { date, type: day.type, label: sessionLabel(day), done: runDates.has(date) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    completed: sessions.filter((session) => session.done).length,
    planned: sessions.length,
    next: sessions.find((session) => !session.done) ?? null
  };
}

function buildWatchpoints(claims: MemoryClaim[], easyTargetSec: number) {
  return claims
    .filter((claim) => claim.superseded_by === null)
    .map((claim) => {
      const normalized = claim.claim.toLowerCase();
      const isEasyPace =
        (normalized.includes("easy") && normalized.includes("pace")) ||
        normalized.includes("easy days") ||
        normalized.includes("pacing-discipline");
      const isCalf = normalized.includes("calf");

      return {
        id: claim.id,
        title: isEasyPace ? "Easy pace discipline" : isCalf ? "Calf tightness" : claim.claim.split(".")[0],
        body: claim.claim,
        confidence: claim.confidence,
        evidenceCount: claim.evidence.length,
        recommendation: isEasyPace
          ? `Keep easy days at ${formatPace(easyTargetSec)}/km or slower this week.`
          : isCalf
            ? "Watch for recurrence after long runs before treating it as a pattern."
            : "Keep this pattern visible when adjusting the week."
      };
    });
}

function buildInsights({
  currentWeekVolume,
  paceSeries,
  bestLongRunKm,
  longRunGapKm,
  hrSeries,
  easyTargetSec
}: {
  currentWeekVolume: WeeklyVolume | null;
  paceSeries: PacePoint[];
  bestLongRunKm: number;
  longRunGapKm: number;
  hrSeries: { hr: number }[];
  easyTargetSec: number;
}) {
  const latestPacedRun = paceSeries[paceSeries.length - 1];
  const latestHr = hrSeries[hrSeries.length - 1];

  return {
    volume: currentWeekVolume
      ? `This week: ${currentWeekVolume.completedKm} / ${currentWeekVolume.prescribedKm} km completed.`
      : "No current training week found.",
    pace: latestPacedRun
      ? `Latest paced run: ${formatPace(latestPacedRun.paceSec)}/km, ${
          latestPacedRun.paceSec <= easyTargetSec ? "faster than" : "slower than"
        } easy target.`
      : "No paced runs recorded yet.",
    longRun:
      bestLongRunKm > 0
        ? `Best long run: ${bestLongRunKm} km, ${longRunGapKm} km short of race distance.`
        : "No long run distance recorded yet.",
    hr: latestHr ? `Latest average HR: ${latestHr.hr} bpm.` : "No heart-rate data recorded yet."
  };
}

export function computeMetrics(data: DashboardData): DashboardMetrics {
  const today = getToday();
  const currentWeek = weekForDate(today, data.plan.weeks);
  const raceDate = data.profile.race.date;
  const goalPaceSec = parsePace(data.profile.goal_pace_per_km);
  const easyTargetSec = parsePace(data.profile.easy_pace_target_per_km);
  const weeklyVolume = buildWeeklyVolume(data);
  const paceSeries = buildPaceSeries(data.runs);
  const longRuns = buildLongRuns(data);
  const hrSeries = data.runs
    .filter((run) => typeof run.avg_hr === "number")
    .map((run) => ({
      date: run.date,
      label: formatDateLabel(run.date),
      hr: run.avg_hr as number,
      type: run.type_inferred || "other"
    }));
  const currentWeekVolume = weeklyVolume.find((week) => week.week === currentWeek?.week) ?? null;
  const bestLongRunKm = rounded(Math.max(0, ...longRuns.map((point) => point.longestKm)));
  const longRunGapKm = rounded(Math.max(0, RACE_DISTANCE_KM - bestLongRunKm));

  return {
    today,
    raceName: data.profile.race.name,
    raceDate,
    daysToRace: Math.max(0, daysBetween(today, raceDate)),
    higdonWeek: currentWeek?.higdon_week ?? null,
    calendarWeek: currentWeek?.week ?? null,
    phase: currentWeek?.phase || "off-plan",
    goalTime: data.profile.goal_time,
    goalPaceSec,
    easyTargetSec,
    currentWeekVolume,
    currentWeekSessions: buildWeekSessions(data.runs, currentWeek),
    bestLongRunKm,
    longRunGapKm,
    insights: buildInsights({ currentWeekVolume, paceSeries, bestLongRunKm, longRunGapKm, hrSeries, easyTargetSec }),
    weeklyVolume,
    paceSeries,
    longRuns,
    hrSeries,
    watchpoints: buildWatchpoints(data.claims, easyTargetSec),
    recentRuns: buildRecentRuns(data.runs)
  };
}
