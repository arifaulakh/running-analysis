import type { Activity } from "@/lib/db/schema";
import { importDevRun } from "@/lib/repository";
import {
  getActivityById,
  listAthleteActivities,
  refreshStravaAccessToken,
  type StravaActivity
} from "@/lib/strava/client";

function activityKind(activity: StravaActivity): Activity["type"] {
  const type = activity.sport_type ?? activity.type ?? "";
  if (type.includes("Run")) return "Run";
  if (type.includes("Ride") || type.includes("Bike")) return "Ride";
  if (type.includes("Workout")) return "Workout";
  return "Other";
}

function isRunLike(activity: StravaActivity): boolean {
  return activityKind(activity) === "Run";
}

export function normalizeStravaActivity(activity: StravaActivity): Activity {
  const distanceM = activity.distance;
  const movingTimeS = activity.moving_time;

  return {
    id: `strava-${activity.id}`,
    startTime: new Date(activity.start_date),
    type: activityKind(activity),
    distanceM,
    movingTimeS,
    totalElevationGainM: activity.total_elevation_gain ?? null,
    averageHr: activity.average_heartrate ?? null,
    maxHr: activity.max_heartrate ?? null,
    averageCadence: activity.average_cadence ?? null,
    averageSpeedMps:
      activity.average_speed ?? (movingTimeS > 0 ? distanceM / movingTimeS : null),
    name: activity.name,
    mapPolyline: activity.map?.summary_polyline ?? activity.map?.polyline ?? null,
    splitsJsonb: activity.splits_standard ?? activity.splits_metric ?? null,
    rawJsonb: activity,
    fetchedAt: new Date()
  };
}

export async function syncActivity(
  activityId: string
): Promise<{ activityId: string; synced: boolean; activity?: Activity }> {
  const token = await refreshStravaAccessToken();
  const stravaActivity = await getActivityById({
    accessToken: token.access_token,
    activityId
  });

  if (!isRunLike(stravaActivity)) {
    return { activityId, synced: false };
  }

  const activity = normalizeStravaActivity(stravaActivity);
  await importDevRun(activity);
  return { activityId, synced: true, activity };
}

export async function syncRecentStravaRuns(input: { limit?: number } = {}): Promise<{
  synced: number;
  skipped: number;
  latestActivity: Activity | null;
  activities: Activity[];
  refreshedToken: {
    expiresAt: number;
    refreshTokenRotated: boolean;
  };
}> {
  const limit = input.limit ?? 5;
  const token = await refreshStravaAccessToken();
  const summaries = await listAthleteActivities({
    accessToken: token.access_token,
    page: 1,
    perPage: Math.max(limit * 3, 10)
  });

  const runSummaries = summaries.filter(isRunLike).slice(0, limit);
  const activities: Activity[] = [];

  for (const summary of runSummaries) {
    const detail = await getActivityById({
      accessToken: token.access_token,
      activityId: String(summary.id)
    });
    const activity = normalizeStravaActivity(detail);
    await importDevRun(activity);
    activities.push(activity);
  }

  return {
    synced: activities.length,
    skipped: summaries.length - runSummaries.length,
    latestActivity: activities[0] ?? null,
    activities,
    refreshedToken: {
      expiresAt: token.expires_at,
      refreshTokenRotated: token.refresh_token !== process.env.STRAVA_REFRESH_TOKEN
    }
  };
}
