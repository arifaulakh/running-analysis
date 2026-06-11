# running-analysis

A personal half-marathon coach built as a [Claude Skill][skills] with two
custom subagents, three-tier persistent memory, and a rubric-scored eval
suite. No web app, no database, no infrastructure — just files on disk
and Claude Code as the runtime.

Built to train for the SF Marathon Second Half (2026-07-26, sub-1:35
goal) following the Hal Higdon Intermediate 2 plan, but the architecture
is plan-agnostic — fork it and swap `data/plan.yaml` and
`data/profile.json` for your own race.

## Why this design

Most personal-coach demos are either toy chatbots (LLM + system prompt,
no memory, no structure) or over-engineered dashboards (Postgres + web
UI + webhooks + push). This project deliberately picks a middle path:

- **The agent runtime is Claude Code**, not a custom orchestrator.
- **State is plain files** (JSON, JSONL, YAML, markdown), not a database.
- **The data model is identical** to what a v1 web app would need —
  porting later is mechanical.

The agent-engineering depth shows up in the design choices that live
*around* the runtime: structured three-tier memory with explicit
promotion logic, sub-agent decomposition, eval suite with regression CI,
and a documented failure-mode log.

## Architecture

```
.claude/
├── settings.json               # pre-approves the Strava project MCP server
├── skills/running-coach/       # the Coach itself
│   ├── SKILL.md                # ~150 lines: persona + protocol
│   └── reference/
│       ├── run_schema.md       # how to parse freetext runs
│       ├── memory_protocol.md  # 3-tier read/write rules
│       └── phase_guidance.md   # base/build/peak/taper coaching
└── agents/                     # custom subagents
    ├── memory-observer.md      # promotes episodic → semantic memory
    └── training-planner.md     # ReAct decomposition for hard questions

.mcp.json                       # registers the Strava read-only MCP server

data/
├── profile.json                # race + goal config (gitignored)
├── plan.yaml                   # Higdon Int-2, anchored to race date
├── runs.jsonl                  # run log: Strava-synced + freetext (gitignored)
├── strava_state.json           # Strava sync watermark (gitignored)
└── memory/
    ├── episodic.jsonl          # append-only log (gitignored)
    ├── semantic.md             # curated claims with provenance (gitignored)
    ├── procedural.md           # user/agent rules (gitignored)
    └── observer_state.json     # subagent bookkeeping (gitignored)

evals/                          # rubric-scored eval harness
├── runner.ts                   # stages fixture → claude -p → LLM-as-judge
├── rubrics/{coach,observer}.md # 6 criteria, 1-5 scoring, rationale per score
├── coach.eval.ts               # post-run, morning-brief, hard-question fixtures
├── observer.eval.ts            # promotion / reinforce / supersede fixtures
└── failure_log.md              # documented failures + fixes
```

### The three triggers

The Coach skill auto-invokes on training-related messages and classifies
each into one of four trigger types:

- **Type A** — user shared run data (any combination of distance, pace,
  HR, splits, qualitative notes). Ingest first into `runs.jsonl`, then
  analyze, then invoke the `memory-observer` subagent.
- **Type B** — morning brief / future-looking. Read today's plan day,
  pull one watchpoint from semantic memory, deliver an anchor tied to
  weeks-to-race.
- **Type C** — hard question requiring multi-step reasoning. Delegate to
  the `training-planner` subagent which does ReAct-style decomposition
  with explicit tool calls.
- **Type D** — simple chat. Answer directly.

### The three-tier memory

Each tier has different read/write semantics:

| Tier | File | Writers | Notes |
|---|---|---|---|
| Episodic | `episodic.jsonl` | Coach (every invocation) | Append-only, never edited. |
| Semantic | `semantic.md` | **Only** the Observer subagent | Promotion thresholds and frontmatter shape live in [`reference/memory_protocol.md`](.claude/skills/running-coach/reference/memory_protocol.md) — that doc is the source of truth. |
| Procedural | `procedural.md` | User-set or Coach-confirmed | Rules win over semantic claims; claims win over inferred patterns. |

The Observer's promotion logic is the agent-engineering centerpiece — it
runs after every Type A ingestion, reads new episodic entries since its
`last_processed_episodic_id` watermark, compares against existing claims, and decides per pattern:
*promote*, *reinforce*, *supersede*, or *no_action* (with reason).
Output is structured JSON with full evidence provenance.

### Eval discipline

The eval harness lives in `evals/` and runs on every PR via GitHub
Actions. Each fixture is:

1. A frozen `data/` snapshot in `evals/golden/<id>/data/`.
2. A user prompt the Coach would receive.
3. A target rubric (coach or observer).

The runner stages the snapshot, invokes `claude -p` headless, and scores
the output using LLM-as-judge against a 6-criterion rubric. Regression CI
fails if any criterion's mean score drops by >0.5 vs baseline.

`evals/failure_log.md` is the artifact that proves real-world iteration:
every coach failure caught during use gets an entry with the reproducing
fixture and the fix.

## How to fork this for your own race

```bash
git clone https://github.com/arifaulakh/running-analysis
cd running-analysis

# Bootstrap your data files from the .example templates
cp data/profile.json.example data/profile.json
cp data/runs.jsonl.example data/runs.jsonl  # or: touch data/runs.jsonl
cp data/memory/episodic.jsonl.example data/memory/episodic.jsonl  # or empty
cp data/memory/semantic.md.example data/memory/semantic.md
cp data/memory/procedural.md.example data/memory/procedural.md
cp data/memory/observer_state.json.example data/memory/observer_state.json
cp data/strava_state.json.example data/strava_state.json  # optional, for Strava sync

# Edit profile.json with your race date, goal time, age, etc.
# Edit plan.yaml to anchor the Higdon plan dates to your race
# (or replace it entirely with a different plan structure)

# Open Claude Code in this directory
claude

# Tell it about a recent run
> ran 5mi @ 8:30 today, HR 138, felt easy
```

The skill auto-invokes; the rest is conversation.

## Strava sync (optional)

The Coach can pull the **quantitative** layer of each run — distance,
moving time, pace, average/max HR, per-km splits, elevation — straight
from Strava's read-only [MCP connector][strava-mcp], so you only type the
**qualitative** part ("felt strong, calf tight"). Strava numbers and your
freetext merge into a single `runs.jsonl` entry, deduped on
`strava_activity_id`.

### How the connector is hooked up

Two committed files wire it in — no secrets in either:

1. **[`.mcp.json`](.mcp.json)** registers Strava's remote MCP server with
   the project, so it loads for anyone who clones (the durable alternative
   to a machine-local `claude mcp add`):

   ```json
   {
     "mcpServers": {
       "strava-mcp": { "type": "http", "url": "https://mcp.strava.com/mcp" }
     }
   }
   ```

2. **[`.claude/settings.json`](.claude/settings.json)** pre-approves that
   server via `enabledMcpjsonServers: ["strava-mcp"]`, so Claude Code
   doesn't prompt to trust the project MCP server on every session.

OAuth tokens are held in Claude Code's own credential store, never in the
repo. The one manual step is authenticating once:

```bash
claude
> /mcp            # select strava-mcp → complete the browser OAuth flow
```

After that, the Coach has these read-only Strava tools (all namespaced
`mcp__strava-mcp__*`):

| Tool | Used for |
|---|---|
| `eligibility` / `health` | gate the sync; confirm the connector is reachable |
| `list_activities` | enumerate runs in a date range (cursor-paginated) |
| `get_activity_performance` | avg/max HR, cadence, calories, laps, best efforts |
| `get_activity_streams` | per-point time-series (HR, distance, velocity, …) |
| `get_athlete_profile` | measurement preference (metric vs imperial) |

### Enabling sync

Turn it on in `data/strava_state.json` (gitignored; copy from the
`.example`):

```json
{ "sync_enabled": true, "last_synced_at": null, "last_activity_id": null }
```

On every Coach invocation, with `sync_enabled: true`, the skill pulls runs
newer than `last_synced_at`, maps them via the **Strava → schema mapping**
in [`run_schema.md`](.claude/skills/running-coach/reference/run_schema.md),
and logs any not already present (deduped on `strava_activity_id`). To
catch up the whole block once, say "backfill Strava since 2026-04-20".

**Graceful degradation.** Strava granted MCP access in a gradual rollout;
the sync is gated on `mcp__strava-mcp__eligibility`. If it reports
`eligible: false`, the activity tools aren't live for that account yet —
auto-sync silently no-ops and the Coach falls back to the freetext
workflow until access lands. Setting `sync_enabled: false` (or omitting
the state file, as the eval golden snapshots do) keeps `claude -p` fully
offline and the eval suite hermetic.

[strava-mcp]: https://press.strava.com/articles/strava-launches-mcp-connector

## Running the eval suite

```bash
pnpm install                    # @anthropic-ai/sdk + tsx
pnpm tsx evals/runner.ts coach
pnpm tsx evals/runner.ts observer
pnpm tsx evals/runner.ts all
```

Requires `ANTHROPIC_API_KEY` in the environment for the LLM-as-judge
calls. The fixtures in `evals/coach.eval.ts` and `evals/observer.eval.ts`
need real `data/` snapshots in `evals/golden/` before they can run —
populate those from your accumulated runs as the project matures.

## Status

Started: 2026-04-20 (training day 1).
Race: 2026-07-26 (SF Marathon Second Half).

Built and used by [@arifaulakh](https://github.com/arifaulakh).

[skills]: https://docs.anthropic.com/en/docs/claude-code/skills
