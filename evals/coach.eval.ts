/**
 * Coach fixture set. Each fixture is a frozen `data/` snapshot under
 * evals/golden/coach/<id>/data/, plus a prompt the user would send.
 *
 * The runner stages the snapshot, invokes `claude -p`, and scores the
 * response against evals/rubrics/coach.md.
 *
 * To add a new fixture:
 *   1. mkdir -p evals/golden/coach/<id>/data/memory
 *   2. Populate data/profile.json, data/plan.yaml, data/runs.jsonl,
 *      data/memory/{episodic.jsonl,semantic.md,procedural.md}.
 *   3. Add an entry to coachFixtures below.
 */

import type { Fixture } from "./runner";

export const coachFixtures: Fixture[] = [
  // -------------------------------------------------------------------
  // EXAMPLE FIXTURES — replace with real ones once data/ is populated
  // with real runs. These are sketched here as scaffolding.
  // -------------------------------------------------------------------
  {
    id: "post_run_easy_executed_well",
    description:
      "User logs an easy run executed at correct pace. Coach should affirm restraint without being saccharine, point out one specific positive, and reference tomorrow's prescribed run.",
    dataSnapshot: "evals/golden/coach/post_run_easy_executed_well/data",
    prompt:
      "ran 3mi @ 8:42, HR 138 avg. felt fine, used the trail by the bay.",
    target: "coach",
  },
  {
    id: "post_run_easy_too_fast",
    description:
      "User logs an easy run that was actually 30s/mi too fast. Coach should flag the easy-day creep, citing prior instances if semantic memory has them.",
    dataSnapshot: "evals/golden/coach/post_run_easy_too_fast/data",
    prompt:
      "easy 4mi done. 7:50 avg, HR 152. felt easy honestly.",
    target: "coach",
  },
  {
    id: "morning_brief_intervals_day",
    description:
      "Wednesday in week 7. Coach should produce a morning brief that names the prescribed 8x400m, references one semantic claim, and ties to weeks-to-race.",
    dataSnapshot: "evals/golden/coach/morning_brief_intervals_day/data",
    prompt: "morning brief",
    target: "coach",
  },
  {
    id: "hard_question_should_i_race",
    description:
      "User asks 'can I add a 5K next saturday'. Coach should delegate to the planner subagent (verifiable in trace) and synthesize a defensible answer with proposed plan adjustment.",
    dataSnapshot: "evals/golden/coach/hard_question_should_i_race/data",
    prompt: "can I add a 5K next saturday?",
    target: "coach",
  },
  {
    id: "respects_procedural_rule",
    description:
      "Procedural memory contains 'Don't comment on cadence'. User logs a long run with cadence data. Coach should respond without mentioning cadence, even though the data is present.",
    dataSnapshot: "evals/golden/coach/respects_procedural_rule/data",
    prompt:
      "long run done — 9mi, 8:30 avg, HR 145, cadence dropped to 168 by mile 7. legs felt heavy at the end.",
    target: "coach",
  },
];
