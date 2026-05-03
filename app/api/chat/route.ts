import { NextResponse } from "next/server";
import { z } from "zod";

import { handleWebChat } from "@/lib/agent/orchestrator";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional()
});

export async function POST(request: Request) {
  const parsed = chatRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await handleWebChat(parsed.data);
  return NextResponse.json(result);
}
