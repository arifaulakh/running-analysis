# Run schema

Each line in `data/runs.jsonl` is a JSON object with this shape. Extract
what the user gives you; leave missing fields `null`. Never invent values.

Storage is **km-primary**. The user has set `proc_006` (km-only voice),
so write `distance_km` and `avg_pace_per_km` as the primary fields and
omit the mile equivalents going forward. Legacy entries that contain
both forms are read-tolerant; the agent will accept either.

```json
{
  "id": "run_<unix_seconds>",
  "strava_activity_id": null,
  "date": "2026-05-26",
  "distance_km": 12.87,
  "moving_time_s": 3720,
  "avg_pace_per_km": "4:48",
  "avg_hr": 148,
  "max_hr": 172,
  "splits_per_km": [5.00, 4.92, 4.83, 4.75, 4.78, 4.82, 4.75, 4.68, 4.70, 4.65, 4.72, 4.60, 4.55],
  "elevation_gain_m": null,
  "type_inferred": "easy",
  "notes": "felt strong, calf tight last km",
  "raw_input": "ran 13km, 4:48 avg, HR 148/172, splits 5:00 4:55 4:50 4:45 4:47 4:49 4:45 4:41 4:42 4:39 4:43 4:36 4:33. felt strong, calf got tight last km",
  "logged_at": "2026-05-26T18:42:13Z"
}
```

## Field rules

- **id** — `"run_" + Math.floor(Date.now() / 1000)`. Always generate fresh.
- **strava_activity_id** — integer Strava activity id for runs pulled from
  the Strava MCP connector, or `null` for freetext-only runs. This is the
  **dedup/merge key**: never write two `runs.jsonl` lines with the same
  non-null `strava_activity_id`. See the mapping table below.
- **date** — ISO date (YYYY-MM-DD). Default to today in the user's
  local timezone (`profile.timezone` = America/Los_Angeles), not UTC.
  A run logged at 9pm PST is still that calendar day, not the next UTC day.
- **distance_km** — primary required distance field. If the user
  reports miles, convert (1 mi = 1.609344 km). Round to 2 decimals.
- **moving_time_s** — integer seconds. Convert from "1:42" or "1h 42m" etc.
- **avg_pace_per_km** — primary pace field, as string `"M:SS"`. Convert
  from mile pace if needed.
- **avg_hr / max_hr** — integers, BPM.
- **splits_per_km** — array of pace decimals (e.g. `4:48` → `4.80`).
  One per km. Null if not given.
- **elevation_gain_m** — integer meters. Convert from feet (1 ft = 0.3048 m).
- **type_inferred** — one of:
  `easy | long | pace | tempo | interval | race | shakeout | other`.
  Use {distance, pace, day-of-week vs the plan} to infer.
- **notes** — qualitative — extract any feeling/symptom phrases the user
  included. Keep verbatim where short; summarize when long.
- **raw_input** — the user's exact freetext, preserved for re-parsing.
- **logged_at** — ISO timestamp at the moment of logging.

## Strava → schema mapping

When a run is sourced from the Strava MCP connector (see `## Strava sync`
in `SKILL.md`), map the activity's fields into the schema like this. The
schema is already km-primary, so the mapping is close to 1:1.

| Strava field | run field | transform |
|---|---|---|
| `id` | `strava_activity_id` | as-is (integer) |
| `distance` (m) | `distance_km` | `/1000`, round 2 |
| `moving_time` (s) | `moving_time_s` | as-is (integer) |
| `average_speed` (m/s) | `avg_pace_per_km` | `1000/speed` seconds → `"M:SS"` |
| `average_heartrate` | `avg_hr` | round to integer |
| `max_heartrate` | `max_hr` | round to integer |
| `total_elevation_gain` (m) | `elevation_gain_m` | round to integer |
| `splits_metric[].average_speed` (m/s) | `splits_per_km` | each → pace decimal (`1000/speed/60`, round 2) |
| `start_date_local` | `date` | take `YYYY-MM-DD` (already local — do not re-offset) |
| `name` | `raw_input` | the activity name (Strava has no freetext to preserve) |
| `description` | `notes` | only if present; otherwise leave for user freetext |

Notes:

- **`type_inferred`** — infer the same way as for freetext (distance, pace,
  day-of-week vs the plan). Strava's `workout_type` (1 = race, 2 = long
  run) may be used as a *hint* only, never as the sole determinant.
- **`avg_pace_per_km` from `average_speed`**: pace seconds per km =
  `1000 / average_speed`; format as `"M:SS"` (e.g. `3.47 m/s` →
  `288s` → `"4:48"`).
- **`splits_per_km` pace decimals**: a split's `average_speed` of
  `3.47 m/s` → `1000 / 3.47 / 60 = 4.80` minutes per km.
- Leave any field Strava doesn't provide as `null`. Never invent values.

### Legacy fields (read-tolerant, do not write)

Older entries may include `distance_mi`, `avg_pace_per_mi`, and
`splits_per_mi`. The agent will read either form. Do not emit them on
new entries.

## Inference examples

| User input | type_inferred |
|---|---|
| "ran 5km @ 5:18/km" + Tuesday in plan = "easy" | `easy` |
| "19km @ 5:25/km" + Sunday in plan = "long" | `long` |
| "5 x 400m at 5K pace" + Wednesday | `interval` |
| "30 min tempo" + Wednesday | `tempo` |
| "5km pace run @ goal pace" + Saturday | `pace` |
| "did the bay-to-breakers 12K" | `race` |
| "easy 3km shakeout before bed" | `shakeout` |

If you can't tell, use `other` and ask the user to clarify in your reply.
