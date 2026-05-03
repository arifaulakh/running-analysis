import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { isRunCreateEvent, verifyStravaWebhookSignature } from "@/lib/strava/webhook";

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
