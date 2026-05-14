# Memory protocol

Three tiers, three files. Different read/write rules per tier.

This document is the **source of truth** for the memory tiers: promotion
thresholds, claim id format, frontmatter shape, episodic source enum,
evidence-id width. Other docs (`README.md`, `.claude/agents/memory-observer.md`)
reference this section rather than restating the rules.

## Episodic — `data/memory/episodic.jsonl`

Append-only. One JSON per line. The Coach writes one entry per
invocation. The Observer reads; never writes here.

Format:

```json
{
  "id": "ep_<unix_ms>",
  "occurred_at": "<iso>",
  "source": "run|chat|observer|lift",
  "ref": "<run_id or null>",
  "payload": "<short factual statement, 1-2 sentences>",
  "created_at": "<iso>"
}
```

Examples:

```json
{"id":"ep_1716750132000","occurred_at":"2026-05-26T18:42:12Z","source":"run","ref":"run_1716750132","payload":"13 km @ 4:48/km avg with negative split (5:00/km → 4:43/km). User reported tight right calf in last km. Type was easy per plan.","created_at":"2026-05-26T18:42:12Z"}
{"id":"ep_1716923456000","occurred_at":"2026-05-28T07:15:00Z","source":"chat","ref":null,"payload":"User asked whether to add a 5K next Saturday. Coach answered yes with adjusted Sunday long.","created_at":"2026-05-28T07:15:00Z"}
```

Rules:
- Payload should be a *short, factual* description, not a long retelling.
- Always set `ref` to the `run_id` for Type A invocations.
- Never edit or delete past entries. Append only.

### Source enum

- `run` — Type A invocations (after a run was logged).
- `chat` — Type B/C/D invocations (morning brief, question, plain chat).
- `observer` — written when the observer summarizes its own action (rare).
- `lift` — strength-training entry. Persisted as **context for running
  adjustments** (residual fatigue, scheduling), not as a first-class
  coached domain. The Observer must not promote pure-strength patterns
  to semantic claims (see `memory-observer.md`).

### Evidence id width

Canonical form is **13-digit ms**: `ep_<unix_ms>`. The Coach generates
this on append. The Observer cites these ids in `evidence` lists on
semantic claims.

**Legacy 10-digit ids.** A small number of older episodic entries were
written with `ep_<unix_seconds>` (10-digit) — e.g., `ep_1778634000`
cited by `claim_9`. The episodic log is append-only, so those entries
stay as-is on disk. Cite legacy ids **verbatim** in any claim that
references them so the link continues to resolve. All *new* writes
(both episodic entries and claim evidence) use the 13-digit ms form.

## Semantic — `data/memory/semantic.md`

Curated claims about Arif. **Only the `memory-observer` subagent writes
here.** Coach reads, never writes directly.

Format — one frontmatter block per claim, separated by blank lines. The
claim text lives inside the frontmatter as the `claim:` field:

```markdown
---
id: claim_7
claim: "Mile 4-5 fade in pace runs (3 instances). Possibly fueling or cumulative fatigue — needs more data points before calling it."
confidence: med
evidence: ["ep_1716750132000", "ep_1716492801000", "ep_1716234567000"]
created_at: "2026-05-28T08:00:00Z"
reinforced_at: "2026-05-28T08:00:00Z"
superseded_by: null
---
```

Rules:
- `id` — `claim_<n>` (unpadded integer), monotonically increasing.
- `claim` — the claim text, inside the frontmatter.
- `evidence` — list of episodic ids that support this claim (canonical
  13-digit form).
- `superseded_by` — id of the claim that replaced this one, or `null`.
- A claim is **active** if `superseded_by` is `null`.
- The Coach reads ALL active claims on every invocation.

### Promotion thresholds (SOURCE OF TRUTH)

The Observer subagent uses these thresholds. All other documents
(`SKILL.md`, `memory-observer.md`, `README.md`) defer to this section.

| Supporting episodes | Confidence |
|---|---|
| 1–2 | `low` |
| 3–4 | `med` |
| 5+ | `high` |

This is the scale under which live data was promoted (e.g., `claim_5`
med at 4 evidence, `claim_8` med at 4 evidence, `claim_1` high at 6
evidence). Reinforcement bumps confidence when the new evidence count
crosses a threshold.

The Observer still exercises judgement on whether a pattern is real —
one dramatic episode at `low` confidence is reasonable to record but
should be flagged as preliminary; two unrelated episodes are not a
pattern just because they coexist.

## Procedural — `data/memory/procedural.md`

Rules. Hard constraints. The Coach treats these as system-prompt-level.

Format — markdown bullet list:

```markdown
- [proc_001] (user-explicit, 2026-05-27) Hold me to easy-pace targets even if I say "felt great".
- [proc_002] (user-explicit, 2026-05-14) Don't comment on cadence in long runs.
- [proc_003] (agent-default, 2026-05-04) Always ask before changing the plan.
```

Sources:
- `user-explicit` — user said "always" / "never" / "stop" / "keep"
- `user-implicit` — agent inferred from a correction; user confirmed
- `agent-default` — built-in defaults

Rules for the Coach to write here:
- When the user says "always X" / "never X" / "stop X-ing" / "keep doing
  X," append a new procedural rule.
- When invoked via the `/rule` slash command, append exactly what they say.
- Never edit existing rules silently. To change a rule, append a new one
  and mark the old as `(retired YYYY-MM-DD)` inline.

## On contradictions

If a claim contradicts a rule, the rule wins. If a rule contradicts data
in `runs.jsonl`, the rule wins (the user is telling you something the
data doesn't show). If two rules contradict, ask the user.
