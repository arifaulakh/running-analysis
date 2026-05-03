import { NextResponse } from "next/server";
import { z } from "zod";

import { saveMemoryMarkdown } from "@/lib/repository";

const memoryEditSchema = z.object({
  markdown: z.string().min(1)
});

export async function PUT(request: Request) {
  const parsed = memoryEditSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await saveMemoryMarkdown(parsed.data.markdown);

  return NextResponse.json({
    ok: true
  });
}
