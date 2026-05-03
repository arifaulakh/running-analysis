import { NextResponse } from "next/server";

import { exchangeStravaCode } from "@/lib/strava/client";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const token = await exchangeStravaCode(code);
  return NextResponse.json({
    ok: true,
    expiresAt: token.expires_at,
    note: "Persist refresh_token in a secret store before production use."
  });
}
