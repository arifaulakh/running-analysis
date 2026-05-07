import { z } from "zod";

import { readDevStore, updateDevStore } from "@/lib/dev-store";

export type StravaTokenResponse = {
  token_type?: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
  scope?: string;
  athlete?: unknown;
};

const stravaMapSchema = z
  .object({
    summary_polyline: z.string().nullable().optional(),
    polyline: z.string().nullable().optional()
  })
  .nullable()
  .optional();

const stravaSplitSchema = z.object({
  distance: z.number().optional(),
  elapsed_time: z.number().optional(),
  moving_time: z.number().optional(),
  split: z.number().optional(),
  average_speed: z.number().optional(),
  pace_zone: z.number().nullable().optional()
});

export const stravaActivitySchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().default("Strava activity"),
  distance: z.number().default(0),
  moving_time: z.number().default(0),
  elapsed_time: z.number().optional(),
  total_elevation_gain: z.number().nullable().optional(),
  type: z.string().optional(),
  sport_type: z.string().optional(),
  start_date: z.string(),
  start_date_local: z.string().optional(),
  average_heartrate: z.number().nullable().optional(),
  max_heartrate: z.number().nullable().optional(),
  average_cadence: z.number().nullable().optional(),
  average_speed: z.number().nullable().optional(),
  map: stravaMapSchema,
  splits_standard: z.array(stravaSplitSchema).optional(),
  splits_metric: z.array(stravaSplitSchema).optional()
});

export type StravaActivity = z.infer<typeof stravaActivitySchema>;

const stravaActivitiesSchema = z.array(stravaActivitySchema);

function requireStravaCredentials() {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are required");
  }

  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET
  };
}

function configuredRefreshToken(refreshToken?: string): string {
  const token = refreshToken ?? process.env.STRAVA_REFRESH_TOKEN;
  if (!token) {
    throw new Error("STRAVA_REFRESH_TOKEN is required for Strava sync");
  }
  return token;
}

async function latestRefreshToken(refreshToken?: string): Promise<string> {
  if (refreshToken) return refreshToken;
  const store = await readDevStore();
  return configuredRefreshToken(store.stravaToken?.refreshToken);
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const credentials = requireStravaCredentials();

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      grant_type: "authorization_code"
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`Strava token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<StravaTokenResponse>;
}

export async function refreshStravaAccessToken(
  refreshToken?: string
): Promise<StravaTokenResponse> {
  const credentials = requireStravaCredentials();
  const token = await latestRefreshToken(refreshToken);

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "refresh_token",
      refresh_token: token
    }).toString()
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strava token refresh failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as StravaTokenResponse;

  await updateDevStore((store) => {
    store.stravaToken = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: payload.expires_at,
      updatedAt: new Date().toISOString()
    };
  });

  return payload;
}

async function stravaApiFetch(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strava API request failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function listAthleteActivities(input: {
  accessToken: string;
  before?: number;
  after?: number;
  page?: number;
  perPage?: number;
}): Promise<StravaActivity[]> {
  const params = new URLSearchParams();
  if (input.before) params.set("before", String(input.before));
  if (input.after) params.set("after", String(input.after));
  params.set("page", String(input.page ?? 1));
  params.set("per_page", String(input.perPage ?? 30));

  const payload = await stravaApiFetch(`/athlete/activities?${params}`, input.accessToken);
  return stravaActivitiesSchema.parse(payload);
}

export async function getActivityById(input: {
  accessToken: string;
  activityId: string;
}): Promise<StravaActivity> {
  const payload = await stravaApiFetch(
    `/activities/${input.activityId}?include_all_efforts=false`,
    input.accessToken
  );
  return stravaActivitySchema.parse(payload);
}
