from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from sqlite3 import Connection

from coach.analytics import weekly

RUN_TYPES = {"run", "virtualrun", "trailrun"}


@dataclass(frozen=True)
class Flag:
    level: str
    code: str
    message: str


def evaluate_week(conn: Connection, start: date, *, as_of: date | None = None) -> list[Flag]:
    as_of = as_of or date.today()
    flags: list[Flag] = []
    wow = weekly.wow_volume_change(conn, start)
    if wow is not None and wow > 15:
        flags.append(Flag("red", "wow_volume_gt_15", f"Week-over-week volume is up {wow:.1f}%."))

    recent_logs = conn.execute(
        """
        SELECT date, rpe, soreness_1_5
        FROM daily_log
        WHERE date BETWEEN ? AND ?
        ORDER BY date
        """,
        ((start - timedelta(days=6)).isoformat(), (start + timedelta(days=6)).isoformat()),
    ).fetchall()

    logs_by_date = {date.fromisoformat(row["date"]): row for row in recent_logs}
    rpe_streak = 0
    soreness_streak = 0
    rpe_flagged = False
    soreness_flagged = False
    for day_offset in range(13):
        day = start - timedelta(days=6) + timedelta(days=day_offset)
        row = logs_by_date.get(day)
        if row is None:
            rpe_streak = 0
            soreness_streak = 0
            continue
        rpe_streak = rpe_streak + 1 if row["rpe"] is not None and row["rpe"] >= 8 else 0
        soreness_streak = (
            soreness_streak + 1
            if row["soreness_1_5"] is not None and row["soreness_1_5"] >= 4
            else 0
        )
        if rpe_streak >= 3 and not rpe_flagged:
            flags.append(Flag("red", "rpe_streak", "RPE has been 8+ for at least 3 days."))
            rpe_flagged = True
        if soreness_streak >= 2 and not soreness_flagged:
            flags.append(
                Flag("red", "soreness_streak", "Soreness has been 4+ for at least 2 days.")
            )
            soreness_flagged = True

    long_plan = conn.execute(
        """
        SELECT date, prescribed_distance_km
        FROM plan
        WHERE date BETWEEN ? AND ?
          AND day_type = 'long'
        ORDER BY prescribed_distance_km DESC
        LIMIT 1
        """,
        (start.isoformat(), (start + timedelta(days=6)).isoformat()),
    ).fetchone()
    if (
        long_plan
        and long_plan["prescribed_distance_km"]
        and date.fromisoformat(long_plan["date"]) < as_of
    ):
        actual = conn.execute(
            f"""
            SELECT COALESCE(MAX(distance_m), 0) / 1000.0 AS longest_run_km
            FROM activities
            WHERE {weekly.ACTIVITY_DATE_SQL} BETWEEN ? AND ?
              AND lower(COALESCE(type, '')) IN ({",".join("?" for _ in RUN_TYPES)})
            """,
            (start.isoformat(), (start + timedelta(days=6)).isoformat(), *sorted(RUN_TYPES)),
        ).fetchone()["longest_run_km"]
        if actual < float(long_plan["prescribed_distance_km"]) * 0.70:
            flags.append(Flag("yellow", "missed_long_run", "Long run is more than 30% short."))

    return flags
