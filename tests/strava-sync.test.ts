import { describe, expect, it } from "vitest";

import { normalizeStravaActivity } from "@/lib/strava/sync";

describe("Strava sync", () => {
  it("normalizes a Strava run into the app Activity shape", () => {
    const activity = normalizeStravaActivity({
      id: 123,
      name: "Morning Run",
      distance: 8046.72,
      moving_time: 2200,
      elapsed_time: 2300,
      total_elevation_gain: 42,
      type: "Run",
      sport_type: "Run",
      start_date: "2026-05-06T14:00:00Z",
      start_date_local: "2026-05-06T07:00:00Z",
      average_heartrate: 152,
      max_heartrate: 170,
      average_cadence: 82,
      average_speed: 3.66,
      map: { summary_polyline: "abc" },
      splits_standard: [{ split: 1, distance: 1609.3, moving_time: 440 }]
    });

    expect(activity).toMatchObject({
      id: "strava-123",
      name: "Morning Run",
      type: "Run",
      distanceM: 8046.72,
      movingTimeS: 2200,
      totalElevationGainM: 42,
      averageHr: 152,
      maxHr: 170,
      averageCadence: 82,
      averageSpeedMps: 3.66,
      mapPolyline: "abc"
    });
    expect(activity.splitsJsonb).toHaveLength(1);
  });
});
