import { describe, expect, it } from "vitest";

import { anchorPlanRows, loadHigdonPlan } from "@/lib/plan/loader";

describe("Higdon plan loader", () => {
  it("anchors the 12-week plan to the race date", async () => {
    const plan = await loadHigdonPlan();
    const rows = anchorPlanRows(plan, "2026-07-26");

    expect(rows).toHaveLength(84);
    expect(rows[0]).toMatchObject({
      date: "2026-05-04",
      weekNum: 1,
      dayType: "cross"
    });
    expect(rows.at(-1)).toMatchObject({
      date: "2026-07-26",
      weekNum: 12,
      dayType: "race"
    });
  });
});
