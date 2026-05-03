import { NextResponse } from "next/server";

import { handleMorningBrief } from "@/lib/agent/orchestrator";
import { notificationPreview, WebPushAdapter } from "@/lib/push/send";

export async function GET() {
  const result = await handleMorningBrief();
  const delivery = await new WebPushAdapter().send({
    title: "Coach",
    body: notificationPreview(result.message),
    url: "/"
  });

  return NextResponse.json({ ...result, delivery });
}
