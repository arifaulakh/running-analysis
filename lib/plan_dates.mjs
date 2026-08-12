// The entire deterministic surface of the running-coach harness.
// All calendar/date/weekday/unit arithmetic that materializes a training
// plan lives here as small, pure, unit-tested functions — never done by the
// LLM by hand (that was the wrong-weekday failure that motivated this).
// Zero dependencies; runs directly on node (ESM). See docs/harness-architecture.md.

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const MS_PER_DAY = 86400000;
const MI_TO_KM = 1.609344;

export function weekdayIndex(name) {
  const i = WEEKDAYS.indexOf(String(name).toLowerCase());
  if (i < 0) throw new Error(`Not a weekday: ${name}`);
  return i;
}

// Parse a YYYY-MM-DD string as a UTC epoch (ms). UTC avoids DST/timezone
// drift — plan dates are calendar dates, not instants.
export function isoToUtc(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) throw new Error(`Not an ISO date (YYYY-MM-DD): ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function utcToIso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  return utcToIso(isoToUtc(iso) + n * MS_PER_DAY);
}

// 0 = Monday ... 6 = Sunday.
export function weekdayOf(iso) {
  const jsDow = new Date(isoToUtc(iso)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDow + 6) % 7;
}

// The calendar date of a given weekday within the week that starts on mondayIso.
export function dateFor(mondayIso, weekday) {
  return addDays(mondayIso, weekdayIndex(weekday));
}

export function mileToKm(mi) {
  return Math.round(mi * MI_TO_KM * 10) / 10;
}

function phaseForWeek(weekNum, phases) {
  for (const [name, weeks] of Object.entries(phases)) {
    if (Array.isArray(weeks) && weeks.includes(weekNum)) return name;
  }
  throw new Error(`No phase covers week ${weekNum} in template.phases`);
}

// Materialize one template day (relative) into a concrete plan day.
function materializeDay(mondayIso, weekday, tmplDay) {
  const day = { date: dateFor(mondayIso, weekday), type: tmplDay.type };
  if (tmplDay.distance_mi != null) day.distance_km = mileToKm(tmplDay.distance_mi);
  if (tmplDay.distance_km != null) day.distance_km = tmplDay.distance_km;
  if (tmplDay.duration_min != null) day.duration_min = tmplDay.duration_min;
  if (tmplDay.intervals) day.intervals = tmplDay.intervals;
  if (tmplDay.race_distance) day.race_distance = tmplDay.race_distance;
  if (tmplDay.notes) day.notes = tmplDay.notes;
  return day;
}

// The standard "down week" used for a travel deviation: easy-optional, no
// quality. dev.start_date must be a Monday.
function buildTravelWeek(dev) {
  if (weekdayOf(dev.start_date) !== 0) {
    throw new Error(`Deviation start_date must be a Monday: ${dev.start_date}`);
  }
  const easy = (note) => ({ type: "easy", distance_km: mileToKm(3), notes: note });
  const longer = (note) => ({ type: "easy", distance_km: mileToKm(4), notes: note });
  const rest = (note) => ({ type: "rest", notes: note });
  const optional = "Optional easy if convenient while travelling";
  const tmpl = {
    monday: rest("Travel — rest or optional easy"),
    tuesday: easy(optional),
    wednesday: rest("Travel — rest or optional easy"),
    thursday: easy(optional),
    friday: rest("Travel — rest or optional easy"),
    saturday: longer("Optional easy — a longer one if you get the chance"),
    sunday: rest("Travel — rest or optional easy")
  };
  const days = {};
  for (const wd of WEEKDAYS) days[wd] = materializeDay(dev.start_date, wd, tmpl[wd]);
  return {
    week: "travel",
    start_date: dev.start_date,
    end_date: dev.end_date || addDays(dev.start_date, 6),
    phase: "travel",
    note: dev.note || "Travel break — not a numbered plan week; optional easy only.",
    days
  };
}

// Move the race off the template's default race weekday onto the block's
// actual race weekday, in the final week. Days from the old race day onward
// become season-done rest. Deterministic; no coaching judgment.
function applyRaceDayShift(week, template, block) {
  const fromWd = (template.race_default_weekday || "sunday").toLowerCase();
  const toWd = (block.race_weekday || fromWd).toLowerCase();
  if (toWd === fromWd) return;

  const toIdx = weekdayIndex(toWd);
  const raceContent = week.days[fromWd];
  if (!raceContent || raceContent.type !== "race") {
    throw new Error(`Template's race_default_weekday (${fromWd}) is not a race day in the final week`);
  }
  // Place the race on the target weekday (keeping that day's own date).
  week.days[toWd] = {
    date: week.days[toWd].date,
    type: "race",
    race_distance: raceContent.race_distance,
    notes: raceContent.notes
  };
  // Every day AFTER the new race day is season-done (this also clears the old
  // race day, which by definition sits later in the week than the new one).
  for (const wd of WEEKDAYS) {
    if (weekdayIndex(wd) > toIdx) {
      week.days[wd] = {
        date: week.days[wd].date,
        type: "rest",
        notes: "Season done. Optional very-easy shakeout only."
      };
    }
  }
}

// Compose the goal-race note from block config so the goal band travels with
// the block, not the template.
function goalRaceNote(block) {
  const gb = block.goal_band || {};
  const band = gb.stretch && gb.target ? ` Goal band ${gb.stretch} stretch / ${gb.target} target.` : "";
  return `★★★ GOAL RACE — ${block.race.name}.${band}`;
}

/**
 * Build a fully-materialized plan object from a relative template + per-block
 * config. Pure: no IO. Throws on inconsistent inputs (the by-construction
 * correctness gate — e.g. the computed race date not matching block.race.date).
 */
export function buildPlan(block, template) {
  const start = block.training_start_date;
  if (weekdayOf(start) !== 0) {
    throw new Error(`training_start_date must be a Monday: ${start}`);
  }
  const planWeeks = block.plan_weeks || template.plan_weeks;
  const deviations = block.deviations || [];
  const weeks = [];
  let offset = 0;

  for (const tw of template.weeks) {
    if (tw.week > planWeeks) continue;
    const mondayIso = addDays(start, offset);
    const week = {
      week: tw.week,
      start_date: mondayIso,
      end_date: addDays(mondayIso, 6),
      phase: phaseForWeek(tw.week, template.phases),
      higdon_week: tw.week,
      days: {}
    };
    for (const wd of WEEKDAYS) {
      if (tw.days[wd]) week.days[wd] = materializeDay(mondayIso, wd, tw.days[wd]);
    }
    // Final week: set the goal-race note, then shift the race to its real weekday.
    if (tw.week === planWeeks) {
      const fromWd = (template.race_default_weekday || "sunday").toLowerCase();
      if (week.days[fromWd] && week.days[fromWd].type === "race") {
        week.days[fromWd].notes = goalRaceNote(block);
      }
      applyRaceDayShift(week, template, block);
    }
    weeks.push(week);
    offset += 7;

    // Insert any deviation scheduled after this week (pushes later weeks out).
    for (const dev of deviations) {
      if (dev.type === "travel_break" && dev.after_week === tw.week) {
        const expected = addDays(start, offset);
        if (dev.start_date && dev.start_date !== expected) {
          throw new Error(`Deviation after week ${tw.week} should start ${expected}, got ${dev.start_date}`);
        }
        weeks.push(buildTravelWeek({ ...dev, start_date: dev.start_date || expected }));
        offset += 7;
      }
    }
  }

  // Correctness gate: the materialized race day must equal block.race.date.
  const raceWd = (block.race_weekday || template.race_default_weekday || "sunday").toLowerCase();
  const finalWeek = weeks.find((w) => w.week === planWeeks);
  const materializedRaceDate = finalWeek && finalWeek.days[raceWd] && finalWeek.days[raceWd].date;
  if (materializedRaceDate !== block.race.date) {
    throw new Error(
      `Generated race date ${materializedRaceDate} != block.race.date ${block.race.date}. ` +
        `Check training_start_date, deviations, plan_weeks, and race_weekday.`
    );
  }

  return {
    race_date: block.race.date,
    race_name: block.race.name,
    race_distance: block.race.distance,
    plan: template.name,
    plan_template: template.id,
    plan_weeks: planWeeks,
    phases: template.phases,
    weeks
  };
}
