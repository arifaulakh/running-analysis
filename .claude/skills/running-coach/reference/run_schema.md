# Run schema

Each line in `data/runs.jsonl` is a JSON object with this shape. Extract
what the user gives you; leave missing fields `null`. Never invent values.

```json
{
  "id": "run_<unix_seconds>",
  "date": "2026-05-26",
  "distance_mi": 8.0,
  "distance_km": 12.87,
  "moving_time_s": 3720,
  "avg_pace_per_mi": "7:45",
  "avg_pace_per_km": "4:48",
  "avg_hr": 148,
  "max_hr": 172,
  "splits_per_mi": [8.0, 7.83, 7.75, 7.67, 7.70, 7.80, 7.73, 7.58],
  "splits_per_km": null,
  "elevation_gain_m": null,
  "type_inferred": "easy",
  "notes": "felt strong, calf tight last mile",
  "raw_input": "ran 8mi, 7:45 avg, HR 148/172, splits 8:00 7:50 7:45 7:40 7:42 7:48 7:44 7:35. felt strong, calf got tight last mile",
  "logged_at": "2026-05-26T18:42:13Z"
}
```

## Field rules

- **id** — `"run_" + Math.floor(Date.now() / 1000)`. Always generate fresh.
- **date** — ISO date (YYYY-MM-DD). Default to today in the user's local timezone (`profile.timezone` = America/Los_Angeles), not UTC. A run logged at 9pm PST is still that calendar day, not the next UTC day.
- **distance_mi / distance_km** — fill whichever the user gives; convert
  to fill the other (1 mi = 1.609344 km). Round to 2 decimals.
- **moving_time_s** — integer seconds. Convert from "1:42" or "1h 42m" etc.
- **avg_pace_per_mi / avg_pace_per_km** — string `"M:SS"`. Convert across
  units when computable.
- **avg_hr / max_hr** — integers, BPM.
- **splits_per_mi / splits_per_km** — array of pace decimals (e.g.
  `7:45` → `7.75`). One per mile or km. Null if not given.
- **elevation_gain_m** — integer meters. Convert from feet (1 ft = 0.3048 m).
- **type_inferred** — one of:
  `easy | long | pace | tempo | interval | race | shakeout | other`.
  Use {distance, pace, day-of-week vs the plan} to infer.
- **notes** — qualitative — extract any feeling/symptom phrases the user
  included. Keep verbatim where short; summarize when long.
- **raw_input** — the user's exact freetext, preserved for re-parsing.
- **logged_at** — ISO timestamp at the moment of logging.

## Inference examples

| User input | type_inferred |
|---|---|
| "ran 3mi @ 8:30" + Tuesday in plan = "3 mi easy" | `easy` |
| "12mi @ 8:45" + Sunday in plan = "12 mi long" | `long` |
| "5 x 400m at 5K pace" + Wednesday | `interval` |
| "30 min tempo" + Wednesday | `tempo` |
| "3 mi pace run @ goal pace" + Saturday | `pace` |
| "did the bay-to-breakers 12K" | `race` |
| "easy 2mi shakeout before bed" | `shakeout` |

If you can't tell, use `other` and ask the user to clarify in your reply.
