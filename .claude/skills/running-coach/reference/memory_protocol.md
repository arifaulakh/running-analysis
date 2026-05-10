# Memory protocol

Three tiers, three files. Different read/write rules per tier.

## Episodic — `data/memory/episodic.jsonl`

Append-only. One JSON per line. The Coach writes one entry per
invocation. The Observer reads; never writes here.

Format:

```json
{
  "id": "ep_<unix_ms>",
  "occurred_at": "<iso>",
  "source": "run|chat|observer",
  "ref": "<run_id or null>",
  "payload": "<short factual statement, 1-2 sentences>",
  "created_at": "<iso>"
}
```

Examples:

```json
{"id":"ep_1716750132000","occurred_at":"2026-05-26T18:42:12Z","source":"run","ref":"run_1716750132","payload":"8mi @ 7:45 avg with negative split (8:00→7:35). User reported tight right calf in last mile. Type was easy per plan.","created_at":"2026-05-26T18:42:12Z"}
{"id":"ep_1716923456000","occurred_at":"2026-05-28T07:15:00Z","source":"chat","ref":null,"payload":"User asked whether to add a 5K next Saturday. Coach answered yes with adjusted Sunday long.","created_at":"2026-05-28T07:15:00Z"}
```

Rules:
- Payload should be a *short, factual* description, not a long retelling.
- Always set `ref` to the `run_id` for Type A invocations.
- Never edit or delete past entries. Append only.

## Semantic — `data/memory/semantic.md`

Curated claims about Arif. **Only the `memory-observer` subagent writes
here.** Coach reads, never writes directly.

Format — one frontmatter block per claim, separated by blank lines:

```markdown
---
id: claim_001
confidence: med
evidence: [ep_1716750132000, ep_1716492801000, ep_1716234567000]
created_at: 2026-05-28T08:00:00Z
reinforced_at: 2026-05-28T08:00:00Z
superseded_by: null
---
Mile 4-5 fade in pace runs (3 instances). Possibly fueling or
cumulative fatigue — needs more data points before calling it.
```

Rules:
- `id` — `claim_<3-digit zero-padded n>`, monotonically increasing.
- `confidence` — `low` (1-2 supporting episodes), `med` (3-4), `high` (5+).
- `evidence` — list of episodic ids that support this claim.
- `superseded_by` — id of the claim that replaced this one, or `null`.
- A claim is **active** if `superseded_by` is `null`.
- The Coach reads ALL active claims on every invocation.

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
