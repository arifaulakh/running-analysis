import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { isRunCreateEvent, verifyStravaWebhookSignature } from "@/lib/strava/webhook";
import { POST as syncStrava } from "@/app/api/dev/sync-strava/route";

describe("Strava webhook helpers", () => {
  it("verifies HMAC signatures when a secret is configured", () => {
    const body = JSON.stringify({ object_id: 123 });
    const secret = "secret";
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    expect(
      verifyStravaWebhookSignature({
        body,
        signatureHeader: `sha256=${signature}`,
        secret
      })
    ).toBe(true);
  });

  it("detects activity create events", () => {
    expect(isRunCreateEvent({ object_type: "activity", aspect_type: "create" })).toBe(true);
    expect(isRunCreateEvent({ object_type: "activity", aspect_type: "delete" })).toBe(false);
  });
});

describe("manual Strava sync endpoint", () => {
  it("returns a useful error when Strava credentials are missing", async () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;
    delete process.env.STRAVA_REFRESH_TOKEN;

    const response = await syncStrava(
      new Request("http://localhost/api/dev/sync-strava", {
        method: "POST",
        body: JSON.stringify({ limit: 1 })
      })
    );
    const body = await response.json();

    process.env = originalEnv;
    expect(response.status).toBe(500);
    expect(body.error).toContain("STRAVA_CLIENT_ID");
  });
});
