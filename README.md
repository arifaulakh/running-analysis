# Strava Coach

Personal running coach for the SF Marathon Second Half training block.

The architecture keeps deterministic analytics separate from LLM interpretation:
SQLite stores Strava activity data, persisted run/week metrics, subjective daily logs,
profile values, plan rows, agent memory, and telemetry. The agent and MCP server read
those persisted facts rather than recomputing them.

## Current Slice

- SQLite schema and idempotent initialization.
- Profile/config helpers rooted at `~/.config/coach` by default.
- Hal Higdon Half Marathon Intermediate 2 plan encoded as data and anchored to a race date.
- Deterministic run metric helpers for HR zones, HR drift, decoupling, and approximate GAP.
- CLI commands for initialization, profile updates, plan loading/showing, daily logs, and weekly report output.
- Focused unit tests for the database, plan loader, and metrics.

## Development

```bash
make setup
make check
```

The project uses a local `.venv` for dependency isolation, but you do not need
to activate it for normal commands. Use the wrapper:

```bash
./scripts/coach --help
```

Use a repo-local config/database during development:

```bash
export COACH_CONFIG_DIR="$PWD/.context/dev-config"
./scripts/coach init --race-date 2026-07-26 --goal-time 1:35:00 --age 35
./scripts/coach plan load
./scripts/coach plan show --week 1
./scripts/coach weekly-report
```

Configure Strava credentials, then sync a single activity:

```bash
./scripts/coach strava configure \
  --client-id "$STRAVA_CLIENT_ID" \
  --client-secret "$STRAVA_CLIENT_SECRET" \
  --refresh-token "$STRAVA_REFRESH_TOKEN"

./scripts/coach sync --activity 123456789
```

Quality checks use Ruff and pytest:

```bash
make format
make check
```

## Decision Log

- SQLite over DuckDB: this is a single-athlete workload with small row counts and simple persistence needs.
- Direct analytics library calls for the agent: MCP is a read surface for Claude Desktop, not the internal agent bus.
- Persisted metrics: eval failures can be separated into metric errors versus reasoning errors.
- No agent framework in v1: the loop mechanics and telemetry are part of the project’s learning value.
- ACWR is advisory only; weekly reports lead with week-over-week volume and long-run progression.

## Attribution

The bundled training schedule is a data representation of Hal Higdon’s public
Half Marathon Intermediate 2 program. See:
https://www.halhigdon.com/training-programs/half-marathon-training/intermediate-2-half-marathon/
