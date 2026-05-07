import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refreshStravaAccessToken } from "@/lib/strava/client";

const originalEnv = process.env;

describe("Strava client", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      STRAVA_CLIENT_ID: "123",
      STRAVA_CLIENT_SECRET: "secret",
      STRAVA_REFRESH_TOKEN: "refresh-old"
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it("refreshes an access token with the expected OAuth payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access-new",
        refresh_token: "refresh-new",
        expires_at: 123456,
        expires_in: 3600,
        token_type: "Bearer"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const token = await refreshStravaAccessToken("refresh-old");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(token.access_token).toBe("access-new");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("grant_type=refresh_token");
    expect(String(init.body)).toContain("refresh_token=refresh-old");
  });
});
