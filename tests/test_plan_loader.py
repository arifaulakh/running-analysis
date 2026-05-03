from __future__ import annotations

from datetime import date

from coach import db
from coach.plan_loader import load_plan_data, plan_start_for_race, populate_plan


def test_plan_start_for_sunday_race_is_12_week_monday() -> None:
    assert plan_start_for_race(date(2026, 7, 26)) == date(2026, 5, 4)


def test_populate_plan_anchors_all_rows(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)

    with db.connect(db_path) as conn:
        count = populate_plan(conn, race_date=date(2026, 7, 26))
        week_1 = db.get_plan_week(conn, 1)
        week_12 = db.get_plan_week(conn, 12)
        profile = db.get_profile(conn)

    assert count == 84
    assert week_1[0]["date"] == "2026-05-04"
    assert week_1[-1]["date"] == "2026-05-10"
    assert week_12[-1]["date"] == "2026-07-26"
    assert week_12[-1]["day_type"] == "race"
    assert profile["current_plan"] == "higdon_intermediate_2"


def test_bundled_plan_has_expected_shape() -> None:
    plan = load_plan_data()

    assert len(plan["weeks"]) == 12
    assert plan["weeks"]["week_11"]["sunday"]["distance_km"] == 19.3
    assert plan["weeks"]["week_12"]["sunday"]["notes"] == "Half Marathon"
