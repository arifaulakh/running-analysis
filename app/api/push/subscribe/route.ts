import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { pushSubscriptionSchema } from "@/lib/push/subscribe";
import { registerPushSubscription } from "@/lib/repository";

export async function POST(request: Request) {
  const parsed = pushSubscriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await registerPushSubscription({
    id: `push-${randomUUID()}`,
    endpoint: parsed.data.endpoint,
    p256dhKey: parsed.data.keys.p256dh,
    authKey: parsed.data.keys.auth,
    userAgent: request.headers.get("user-agent") ?? undefined
  });

  return NextResponse.json({ ok: true });
}
