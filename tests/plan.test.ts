import { describe, expect, it } from "vitest";

import { anchorPlanRows, anchorPlanRowsToStart, loadHigdonPlan } from "@/lib/plan/loader";

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

  it("can anchor the plan two weeks early so May 4 is week 3", async () => {
    const plan = await loadHigdonPlan();
    const rows = anchorPlanRowsToStart(plan, "2026-04-20");
    const mayFourth = rows.find((row) => row.date === "2026-05-04");

    expect(rows[0]).toMatchObject({
      date: "2026-04-20",
      weekNum: 1
    });
    expect(mayFourth).toMatchObject({
      weekNum: 3,
      dayType: "cross",
      prescribedDurationMin: 40
    });
  });
});
