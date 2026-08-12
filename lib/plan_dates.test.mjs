// Unit tests for the deterministic plan-generation surface.
// Run:  node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addDays,
  buildPlan,
  dateFor,
  mileToKm,
  weekdayOf,
  WEEKDAYS
} from "./plan_dates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

test("weekdayOf: 0=Monday .. 6=Sunday", () => {
  assert.equal(weekdayOf("2026-08-17"), 0); // Monday
  assert.equal(weekdayOf("2026-08-23"), 6); // Sunday
  assert.equal(weekdayOf("2026-10-17"), 5); // Saturday
});

test("addDays crosses month/year boundaries", () => {
  assert.equal(addDays("2026-08-31", 1), "2026-09-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28"); // 2026 not a leap year
});

test("dateFor stamps the right weekday within a week", () => {
  assert.equal(dateFor("2026-08-17", "monday"), "2026-08-17");
  assert.equal(dateFor("2026-08-17", "sunday"), "2026-08-23");
});

test("mileToKm matches the Higdon conversion table (1 mi = 1.609344 km, 1dp)", () => {
  assert.equal(mileToKm(2), 3.2);
  assert.equal(mileToKm(3), 4.8);
  assert.equal(mileToKm(4), 6.4);
  assert.equal(mileToKm(5), 8.0);
  assert.equal(mileToKm(6), 9.7);
  assert.equal(mileToKm(7), 11.3);
});

test("buildPlan: every day's date matches its weekday label", () => {
  const plan = buildPlan(readJson("data/block.json"), readJson("templates/hal-higdon-intermediate-5k.json"));
  for (const w of plan.weeks) {
    for (const [wd, day] of Object.entries(w.days)) {
      assert.equal(weekdayOf(day.date), WEEKDAYS.indexOf(wd), `${wd} ${day.date} weekday mismatch`);
    }
    // weeks are contiguous Mon..Sun
    assert.equal(weekdayOf(w.start_date), 0);
    assert.equal(addDays(w.start_date, 6), w.end_date);
  }
});

test("buildPlan: travel deviation inserted, weeks stay contiguous, race lands on race_date", () => {
  const block = readJson("data/block.json");
  const plan = buildPlan(block, readJson("templates/hal-higdon-intermediate-5k.json"));

  const labels = plan.weeks.map((w) => w.week);
  assert.deepEqual(labels, [1, "travel", 2, 3, 4, 5, 6, 7, 8]);

  const w1 = plan.weeks.find((w) => w.week === 1);
  const w2 = plan.weeks.find((w) => w.week === 2);
  assert.equal(w1.start_date, "2026-08-17");
  assert.equal(w2.start_date, "2026-08-31"); // one travel week pushed W2 out

  // contiguity across the whole sequence
  for (let i = 1; i < plan.weeks.length; i++) {
    assert.equal(plan.weeks[i].start_date, addDays(plan.weeks[i - 1].end_date, 1), "gap/overlap between weeks");
  }

  // race is on Saturday Oct 17, Sunday is season-done
  const w8 = plan.weeks.find((w) => w.week === 8);
  assert.equal(w8.days.saturday.type, "race");
  assert.equal(w8.days.saturday.date, "2026-10-17");
  assert.equal(w8.days.saturday.date, block.race.date);
  assert.equal(w8.days.sunday.type, "rest");

  // Wk4 Sunday is the 5K test
  const w4 = plan.weeks.find((w) => w.week === 4);
  assert.equal(w4.days.sunday.type, "race");
  assert.equal(w4.days.sunday.date, "2026-09-20");
});

test("buildPlan: correctness gate throws on inconsistent inputs", () => {
  const template = readJson("templates/hal-higdon-intermediate-5k.json");
  const block = readJson("data/block.json");

  // training_start_date not a Monday
  assert.throws(() => buildPlan({ ...block, training_start_date: "2026-08-18" }, template), /must be a Monday/);

  // race_date that the sequencing can't produce
  assert.throws(() => buildPlan({ ...block, race: { ...block.race, date: "2026-10-24" } }, template), /!= block\.race\.date/);
});
