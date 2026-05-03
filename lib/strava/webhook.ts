import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStravaWebhookSignature(input: {
  body: string;
  signatureHeader: string | null;
  secret: string | undefined;
}): boolean {
  if (!input.secret) return true;
  if (!input.signatureHeader) return false;

  const expected = createHmac("sha256", input.secret).update(input.body).digest("hex");
  const received = input.signatureHeader.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isRunCreateEvent(payload: Record<string, unknown>): boolean {
  return payload.object_type === "activity" && payload.aspect_type === "create";
}
