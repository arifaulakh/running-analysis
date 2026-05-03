import { describe, expect, it } from "vitest";

import { runCoach } from "@/lib/agent/coach";

describe("coach scaffold", () => {
  it("answers from seeded context without an API key", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await runCoach({ trigger: "web_chat", userMessage: "what is tomorrow?" });

    process.env.ANTHROPIC_API_KEY = original;
    expect(result.message).toContain("Tomorrow");
    expect(result.traceId).toMatch(/^trace-/);
  });
});
