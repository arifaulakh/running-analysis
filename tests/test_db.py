from __future__ import annotations

from datetime import date

from coach import db


def test_init_is_idempotent_and_creates_schema(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"

    first = db.init(db_path)
    second = db.init(db_path)

    assert first == second == db_path
    with db.connect(db_path) as conn:
        assert db.get_schema_version(conn) == db.SCHEMA_VERSION
        tables = {
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )
        }
    assert {
        "activities",
        "streams",
        "run_metrics",
        "week_metrics",
        "daily_log",
        "profile",
        "plan",
        "athlete_model",
        "telemetry",
    }.issubset(tables)
    with db.connect(db_path) as conn:
        activity_columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(activities)").fetchall()
        }
        metric_columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(run_metrics)").fetchall()
        }

    assert {"start_time_local", "start_date_local"}.issubset(activity_columns)
    assert "plan_classification" in metric_columns


def test_initialize_profile_estimates_max_hr_and_zones(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)

    with db.connect(db_path) as conn:
        db.initialize_profile(conn, race_date=date(2026, 7, 26), goal_time="1:35:00", age=35)
        profile = db.get_profile(conn)

    assert profile["race_date"] == "2026-07-26"
    assert profile["max_hr"] == {"value": 185, "method": "220-age"}
    assert profile["hr_zones"]["bounds_bpm"]["z2"] == [111, 130]
