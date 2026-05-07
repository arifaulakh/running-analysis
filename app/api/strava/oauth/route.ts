import { NextResponse } from "next/server";

import { exchangeStravaCode } from "@/lib/strava/client";
import { updateDevStore } from "@/lib/dev-store";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const token = await exchangeStravaCode(code);
  await updateDevStore((store) => {
    store.stravaToken = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_at,
      updatedAt: new Date().toISOString()
    };
  });

  return NextResponse.json({
    ok: true,
    expiresAt: token.expires_at,
    scope: token.scope,
    note: "Stored token locally in .context/dev-data/coach.json. Keep the refresh token out of git."
  });
}
