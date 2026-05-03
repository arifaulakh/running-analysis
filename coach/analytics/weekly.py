from __future__ import annotations

from datetime import date, timedelta
from sqlite3 import Connection

from coach import db

QUALITY_TYPES = {"intervals", "tempo", "pace", "race"}
ACTIVITY_DATE_SQL = "COALESCE(start_date_local, date(start_time))"


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def weekly_volume(conn: Connection, start: date) -> dict[str, float | int]:
    end = start + timedelta(days=6)
    row = conn.execute(
        f"""
        SELECT
          COALESCE(SUM(distance_m), 0) / 1000.0 AS total_km,
          COALESCE(SUM(moving_time_s), 0) AS total_time_s,
          COALESCE(MAX(distance_m), 0) / 1000.0 AS longest_run_km
        FROM activities
        WHERE {ACTIVITY_DATE_SQL} BETWEEN ? AND ?
          AND lower(COALESCE(type, '')) IN ('run', 'virtualrun', 'trailrun')
        """,
        (start.isoformat(), end.isoformat()),
    ).fetchone()
    return {
        "total_km": float(row["total_km"]),
        "total_time_s": int(row["total_time_s"]),
        "longest_run_km": float(row["longest_run_km"]),
    }


def wow_volume_change(conn: Connection, start: date) -> float | None:
    current = weekly_volume(conn, start)["total_km"]
    previous = weekly_volume(conn, start - timedelta(days=7))["total_km"]
    if previous == 0:
        return None
    return (float(current) - float(previous)) / float(previous) * 100.0


def plan_intensity_match(conn: Connection, start: date) -> float | None:
    end = start + timedelta(days=6)
    planned_quality = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM plan
        WHERE date BETWEEN ? AND ?
          AND day_type IN ('intervals', 'tempo', 'pace', 'race')
        """,
        (start.isoformat(), end.isoformat()),
    ).fetchone()["count"]
    if planned_quality == 0:
        return None

    return None


def acwr(conn: Connection, start: date) -> float | None:
    current = float(weekly_volume(conn, start)["total_km"])
    chronic_weeks = [
        float(weekly_volume(conn, start - timedelta(days=7 * offset))["total_km"])
        for offset in range(1, 5)
    ]
    non_zero = [volume for volume in chronic_weeks if volume > 0]
    if not non_zero:
        return None
    return current / (sum(non_zero) / len(non_zero))


def persist_week_metrics(conn: Connection, start: date) -> None:
    volume = weekly_volume(conn, start)
    conn.execute(
        """
        INSERT INTO week_metrics(
          week_start, total_km, total_time_s, longest_run_km,
          wow_volume_change_pct, plan_intensity_match_pct, acwr, computed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(week_start) DO UPDATE SET
          total_km = excluded.total_km,
          total_time_s = excluded.total_time_s,
          longest_run_km = excluded.longest_run_km,
          wow_volume_change_pct = excluded.wow_volume_change_pct,
          plan_intensity_match_pct = excluded.plan_intensity_match_pct,
          acwr = excluded.acwr,
          computed_at = excluded.computed_at
        """,
        (
            start.isoformat(),
            volume["total_km"],
            volume["total_time_s"],
            volume["longest_run_km"],
            wow_volume_change(conn, start),
            plan_intensity_match(conn, start),
            acwr(conn, start),
            db.utc_now_iso(),
        ),
    )
