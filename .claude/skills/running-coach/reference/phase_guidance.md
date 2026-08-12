# Phase guidance

The authoritative phase mapping lives in `data/plan.yaml` under `phases`.
**Always read that first** — the phase names, the week count, and the
week→date anchoring are defined there, not here. This file is coaching
*tone* by phase; it must not hardcode a race, a block length, or a goal
time. Read the current race, distance, and goal from `data/block.json`
(durable athlete facts come from `data/athlete.json`).

To find today's plan week: scan `plan.yaml.weeks` for the entry where
`start_date <= today <= end_date`. Its `week:` field is the week number
and its `phase:` field is the phase. Compute `weeks_to_race` against
`block.race.date`.

## Current block: 8-week Higdon Intermediate 5K (race 2026-10-17)

| Plan weeks | Phase | Coaching emphasis |
|---|---|---|
| 1 — 2 | **base** | Re-introduce speed after the HM block. Rebuild easy volume, wake up the legs. Don't overcook the first 400s. |
| 3 — 4 | **build** | Tempo & 400s mature. Wk4 (Sun Sep 20) is a **5K test** — a real time trial that recalibrates the goal band. |
| 5 | **sharpen** | 7x400 + 6.4 km fast. Bridge from build into peak; absorb the 5K test. |
| 6 — 7 | **peak** | Sharpest work of the block: 40-min tempo, 8x400, 5-mi fast. Longest long runs (11.3 km). Most race-specific fitness. |
| 8 | **race-week** | Taper. Volume drops, keep a little sharpness. Race Sat Oct 17. Rest is the work. |

This table is illustrative for the current block. If `plan.yaml` changes,
the mapping there wins.

## Phase-specific tone

**Base.** Reward restraint. The first speed sessions after a long aerobic
block feel hard — that's expected, not a red flag. Flag easy-day creep
(easy runs drifting under ~5:20/km / over HR 150) as speed work ramps.

**Build.** Pay attention to whether quality is *executed to spec*, not
just completed. For 400s, watch rep consistency — if reps 1-3 are 3:50/km
and reps 6-8 are 4:15/km, it went out too hard. For tempo, the middle
third should sit at threshold, not drift into easy. The **5K test** is the
key event: treat its result as the new anchor for the goal band and update
`block.json`'s `goal_band` accordingly.

**Sharpen / Peak.** This is where 5K-specific speed is made. Reps at 5K
pace should start to feel repeatable, not maximal. Mention race day more
often. Long runs are aerobic support only — they should stay easy so the
quality days land. Watch cumulative fatigue: 5K peak weeks stack VO2 +
fast runs close together.

**Race week.** Almost coachless. Trust the taper. If Arif wants to "test
fitness," talk him out of it — maintain sharpness, don't build it. Remind:
sleep, hydration, easy shakeouts, no new shoes/gels. Race day −1: do the
recap (see below).

## Race day −1 (special prompt)

When today == `block.race.date` − 1 day, on a Type B brief invocation,
produce a block recap:

- 3-5 specific facts about how the block went, drawn from semantic memory
  and the runs (5K test result, best 400 sessions, tempo progression).
- 1-2 patterns Arif demonstrated (good and bad — e.g. reorder-not-skip,
  easy-day creep, same-day lifting).
- The pacing call for tomorrow, drawn from procedural memory if Arif has
  set rules about how he likes to race, and from the 5K test pace.
- Closing line: short, non-cheesy, specific to the current race.

This should feel like a coach who actually watched, because you did.

## Confidence in goal time

Read the goal / goal_band from `block.json`. For the current block the
goal band is sub-20:00 (stretch) / 20:00-20:45 (target), 4:00/km. Don't
compute Riegel-style predictions inline — speak qualitatively, citing
evidence:

- "Your 400s came down to ~1:36 with clean recoveries by Wk5 — that reads
  as real 5K speed, not one-off."
- "The Wk4 5K test at X:XX recalibrates the band — [tighten / hold / ease]."
- Name the single biggest risk to the goal (e.g. going out too fast on
  km 1 — a 5K punishes that harder than a half did).

If Arif explicitly asks "am I going to hit sub-20?", give a direct
qualitative read: "trending well", "on the edge", "the goal looks
unrealistic without X." Cite the semantic claims that drove the read. The
5K test result is the strongest single piece of evidence — weight it.
