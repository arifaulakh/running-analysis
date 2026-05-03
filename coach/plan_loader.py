from __future__ import annotations

from collections.abc import Iterator, Mapping
from datetime import date, timedelta
from importlib import resources
from pathlib import Path
from typing import Any

import yaml

from coach import db

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
DEFAULT_PLAN = "higdon_intermediate_2"


def load_plan_data(plan_name: str = DEFAULT_PLAN) -> dict[str, Any]:
    if "/" in plan_name or "\\" in plan_name:
        plan_path = Path(plan_name)
        return yaml.safe_load(plan_path.read_text())

    resource = resources.files("coach.plans").joinpath(f"{plan_name}.yaml")
    return yaml.safe_load(resource.read_text())


def race_week_monday(race_date: date) -> date:
    return race_date - timedelta(days=race_date.weekday())


def plan_start_for_race(race_date: date, week_count: int = 12) -> date:
    return race_week_monday(race_date) - timedelta(weeks=week_count - 1)


def anchored_rows(plan_data: Mapping[str, Any], race_date: date) -> Iterator[dict[str, Any]]:
    weeks: Mapping[str, Mapping[str, Mapping[str, Any]]] = plan_data["weeks"]
    start = plan_start_for_race(race_date, week_count=len(weeks))

    for week_num in range(1, len(weeks) + 1):
        week_key = f"week_{week_num}"
        week = weeks[week_key]
        for day_offset, day_name in enumerate(DAYS):
            workout = week[day_name]
            workout_date = start + timedelta(weeks=week_num - 1, days=day_offset)
            yield {
                "date": workout_date.isoformat(),
                "week_num": week_num,
                "day_name": day_name,
                "day_type": workout["type"],
                "prescribed_distance_km": workout.get("distance_km"),
                "prescribed_duration_min": workout.get("duration_min"),
                "prescribed_pace_zone": workout.get("pace_zone"),
                "notes": workout.get("notes"),
            }


def populate_plan(conn, *, race_date: date, plan_name: str = DEFAULT_PLAN) -> int:
    plan_data = load_plan_data(plan_name)
    rows = list(anchored_rows(plan_data, race_date))
    inserted = db.replace_plan_rows(conn, rows)
    db.set_profile(conn, "race_date", race_date.isoformat())
    db.set_profile(conn, "current_plan", plan_data.get("name", plan_name))
    db.set_profile(conn, "plan_source_url", plan_data.get("source_url"))
    return inserted
