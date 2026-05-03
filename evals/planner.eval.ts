import { describe, expect, it } from "vitest";

import { runPlanner } from "@/lib/agent/planner";

describe("planner scaffold", () => {
  it("returns a decomposition and answer", async () => {
    const result = await runPlanner("can I add a 5K next saturday?");

    expect(result.plan.length).toBeGreaterThan(1);
    expect(result.answer).toContain("5K");
  });
});
