export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are required");
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error(`Strava token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<StravaTokenResponse>;
}
