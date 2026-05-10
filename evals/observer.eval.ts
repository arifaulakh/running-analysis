/**
 * Memory observer fixture set. Each fixture stages an episodic.jsonl +
 * semantic.md state, then invokes the observer subagent (via Coach with
 * a Type A prompt that triggers it). Scores the JSON output against
 * evals/rubrics/observer.md.
 */

import type { Fixture } from "./runner";

export const observerFixtures: Fixture[] = [
  // -------------------------------------------------------------------
  // EXAMPLE FIXTURES — populate evals/golden/observer/<id>/ with real
  // episodic histories before flipping these on.
  // -------------------------------------------------------------------
  {
    id: "promote_easy_creep_after_3_instances",
    description:
      "Episodic memory contains 4 easy runs in 2 weeks, all 20-30s/mi too fast. Observer should promote a med-confidence claim with 4 evidence ids.",
    dataSnapshot: "evals/golden/observer/promote_easy_creep_after_3_instances/data",
    prompt: "ran 3mi @ 7:48, HR 145. felt great.", // triggers Type A → observer
    target: "observer",
  },
  {
    id: "no_promote_single_instance",
    description:
      "Episodic memory has a single dramatic run (HR spike, slow pace). Observer should NOT promote — single instance is not a pattern.",
    dataSnapshot: "evals/golden/observer/no_promote_single_instance/data",
    prompt: "easy 4mi @ 8:35. HR was 158 unusually.",
    target: "observer",
  },
  {
    id: "reinforce_existing_claim",
    description:
      "Existing semantic claim 'Mile-4 fade' at low confidence. New episodic shows another mile-4 fade. Observer should reinforce (bump to med), not create a duplicate.",
    dataSnapshot: "evals/golden/observer/reinforce_existing_claim/data",
    prompt: "5mi pace done, splits 7:10 7:08 7:12 7:25 7:28. fueling felt off.",
    target: "observer",
  },
  {
    id: "supersede_with_contradicting_evidence",
    description:
      "Existing claim says 'tendency to fade in long runs'. New evidence shows three long runs ending strong. Observer should supersede the old claim with a corrected one.",
    dataSnapshot: "evals/golden/observer/supersede_with_contradicting_evidence/data",
    prompt: "9mi long done — splits got faster: 8:50 8:45 8:40 8:38 8:35 8:30 8:28 8:25 8:20.",
    target: "observer",
  },
  {
    id: "respect_procedural_rule",
    description:
      "Procedural rule: 'Don't track cadence patterns'. Observer should NOT promote any cadence-related claim even if the episodic memory contains cadence data.",
    dataSnapshot: "evals/golden/observer/respect_procedural_rule/data",
    prompt: "long run, cadence dropped from 178 to 166 over the run.",
    target: "observer",
  },
];
