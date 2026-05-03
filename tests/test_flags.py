from __future__ import annotations

from datetime import date

from coach import db
from coach.analytics.flags import evaluate_week
from coach.plan_loader import populate_plan


def test_missed_long_run_flag_waits_until_prescription_has_passed(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)

    with db.connect(db_path) as conn:
        populate_plan(conn, race_date=date(2026, 7, 26))
        before_long_run = evaluate_week(conn, date(2026, 5, 4), as_of=date(2026, 5, 9))
        after_long_run = evaluate_week(conn, date(2026, 5, 4), as_of=date(2026, 5, 11))

    assert all(flag.code != "missed_long_run" for flag in before_long_run)
    assert any(flag.code == "missed_long_run" for flag in after_long_run)


def test_missed_long_run_ignores_non_run_activities(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)

    with db.connect(db_path) as conn:
        populate_plan(conn, race_date=date(2026, 7, 26))
        conn.execute(
            """
            INSERT INTO activities(
              id, start_time, start_time_local, start_date_local, type,
              distance_m, moving_time_s, elapsed_time_s, raw_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                1,
                "2026-05-10T16:00:00+00:00",
                "2026-05-10T09:00:00",
                "2026-05-10",
                "Ride",
                10000.0,
                2400,
                2400,
                "{}",
            ),
        )
        week_flags = evaluate_week(conn, date(2026, 5, 4), as_of=date(2026, 5, 11))

    assert any(flag.code == "missed_long_run" for flag in week_flags)


def test_missed_long_run_uses_local_activity_date(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)

    with db.connect(db_path) as conn:
        populate_plan(conn, race_date=date(2026, 7, 26))
        conn.execute(
            """
            INSERT INTO activities(
              id, start_time, start_time_local, start_date_local, type,
              distance_m, moving_time_s, elapsed_time_s, raw_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                1,
                "2026-05-11T04:30:00+00:00",
                "2026-05-10T21:30:00",
                "2026-05-10",
                "Run",
                6000.0,
                2400,
                2400,
                "{}",
            ),
        )
        week_flags = evaluate_week(conn, date(2026, 5, 4), as_of=date(2026, 5, 11))

    assert all(flag.code != "missed_long_run" for flag in week_flags)


def test_subjective_streaks_break_on_missing_dates(tmp_path) -> None:
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)

    with db.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO daily_log(date, rpe, soreness_1_5) VALUES (?, ?, ?)",
            ("2026-05-04", 8, 4),
        )
        conn.execute(
            "INSERT INTO daily_log(date, rpe, soreness_1_5) VALUES (?, ?, ?)",
            ("2026-05-06", 8, 4),
        )
        conn.execute(
            "INSERT INTO daily_log(date, rpe, soreness_1_5) VALUES (?, ?, ?)",
            ("2026-05-07", 8, 4),
        )
        week_flags = evaluate_week(conn, date(2026, 5, 4), as_of=date(2026, 5, 8))

    assert all(flag.code != "rpe_streak" for flag in week_flags)
    assert any(flag.code == "soreness_streak" for flag in week_flags)
