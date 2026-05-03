import webpush from "web-push";

import type { DeliveryAdapter, PushPayload } from "@/lib/push/adapter";

export class WebPushAdapter implements DeliveryAdapter {
  constructor() {
    if (
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
    ) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }

  async send(payload: PushPayload): Promise<{ sent: number; failed: number }> {
    void payload;
    // Subscription fanout lands in Phase 3 once Postgres and VAPID keys are configured.
    return { sent: 0, failed: 0 };
  }
}

export function notificationPreview(message: string): string {
  return message.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 240);
}
