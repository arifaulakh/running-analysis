from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Mapping
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from coach.config import default_db_path, get_paths

SCHEMA_VERSION = 2


def utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def connect(db_path: str | Path | None = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path else default_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init(db_path: str | Path | None = None) -> Path:
    paths = get_paths()
    paths.ensure_dirs()
    path = Path(db_path) if db_path else paths.db_path

    with connect(path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS activities(
              id INTEGER PRIMARY KEY,
              start_time TEXT NOT NULL,
              start_time_local TEXT,
              start_date_local TEXT,
              type TEXT,
              distance_m REAL,
              moving_time_s INTEGER,
              elapsed_time_s INTEGER,
              total_elevation_gain_m REAL,
              average_hr REAL,
              max_hr REAL,
              average_cadence REAL,
              average_speed_mps REAL,
              suffer_score REAL,
              raw_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS streams(
              activity_id INTEGER NOT NULL,
              sample_index INTEGER NOT NULL,
              time_s REAL,
              distance_m REAL,
              hr REAL,
              cadence REAL,
              altitude_m REAL,
              velocity_mps REAL,
              PRIMARY KEY(activity_id, sample_index),
              FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS run_metrics(
              activity_id INTEGER PRIMARY KEY,
              gap_pace_s_per_km REAL,
              hr_drift_pct REAL,
              decoupling_pct REAL,
              z1_s INTEGER NOT NULL DEFAULT 0,
              z2_s INTEGER NOT NULL DEFAULT 0,
              z3_s INTEGER NOT NULL DEFAULT 0,
              z4_s INTEGER NOT NULL DEFAULT 0,
              z5_s INTEGER NOT NULL DEFAULT 0,
              plan_classification TEXT,
              easy_or_quality TEXT,
              computed_at TEXT NOT NULL,
              FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS week_metrics(
              week_start TEXT PRIMARY KEY,
              total_km REAL NOT NULL DEFAULT 0,
              total_time_s INTEGER NOT NULL DEFAULT 0,
              longest_run_km REAL NOT NULL DEFAULT 0,
              wow_volume_change_pct REAL,
              plan_intensity_match_pct REAL,
              acwr REAL,
              computed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS plan(
              date TEXT PRIMARY KEY,
              week_num INTEGER NOT NULL,
              day_name TEXT NOT NULL,
              day_type TEXT NOT NULL,
              prescribed_distance_km REAL,
              prescribed_duration_min INTEGER,
              prescribed_pace_zone TEXT,
              notes TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_plan_week_num ON plan(week_num);

            CREATE TABLE IF NOT EXISTS profile(
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_log(
              date TEXT PRIMARY KEY,
              rpe INTEGER,
              sleep_hours REAL,
              soreness_1_5 INTEGER,
              life_stress_1_5 INTEGER,
              notes TEXT
            );

            CREATE TABLE IF NOT EXISTS athlete_model(
              version INTEGER PRIMARY KEY,
              snapshot_json TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              reason TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS telemetry(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              loop_type TEXT NOT NULL,
              started_at TEXT NOT NULL,
              latency_ms INTEGER,
              input_tokens INTEGER,
              output_tokens INTEGER,
              cache_read_tokens INTEGER,
              cache_creation_tokens INTEGER,
              cost_usd REAL,
              metadata_json TEXT
            );
            """
        )
        _ensure_column(conn, "activities", "start_time_local", "TEXT")
        _ensure_column(conn, "activities", "start_date_local", "TEXT")
        _ensure_column(conn, "run_metrics", "plan_classification", "TEXT")
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
    return path


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def get_schema_version(conn: sqlite3.Connection) -> int:
    return int(conn.execute("PRAGMA user_version").fetchone()[0])


def set_profile(conn: sqlite3.Connection, key: str, value: Any) -> None:
    serialized = json.dumps(value)
    conn.execute(
        """
        INSERT INTO profile(key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        """,
        (key, serialized, utc_now_iso()),
    )


def get_profile(conn: sqlite3.Connection) -> dict[str, Any]:
    rows = conn.execute("SELECT key, value FROM profile").fetchall()
    return {row["key"]: json.loads(row["value"]) for row in rows}


def initialize_profile(
    conn: sqlite3.Connection,
    *,
    race_date: date,
    goal_time: str,
    age: int,
    current_plan: str = "higdon_intermediate_2",
) -> None:
    max_hr = 220 - age
    zone_bounds = {
        "z1": [round(max_hr * 0.50), round(max_hr * 0.60)],
        "z2": [round(max_hr * 0.60), round(max_hr * 0.70)],
        "z3": [round(max_hr * 0.70), round(max_hr * 0.80)],
        "z4": [round(max_hr * 0.80), round(max_hr * 0.90)],
        "z5": [round(max_hr * 0.90), round(max_hr * 1.00)],
    }
    set_profile(conn, "race_date", race_date.isoformat())
    set_profile(conn, "goal_time", goal_time)
    set_profile(conn, "age", age)
    set_profile(conn, "current_plan", current_plan)
    set_profile(conn, "max_hr", {"value": max_hr, "method": "220-age"})
    set_profile(conn, "hr_zones", {"method": "percent_max_hr", "bounds_bpm": zone_bounds})


def replace_plan_rows(conn: sqlite3.Connection, rows: Iterable[Mapping[str, Any]]) -> int:
    materialized = list(rows)
    conn.execute("DELETE FROM plan")
    conn.executemany(
        """
        INSERT INTO plan(
          date, week_num, day_name, day_type, prescribed_distance_km,
          prescribed_duration_min, prescribed_pace_zone, notes
        )
        VALUES (
          :date, :week_num, :day_name, :day_type, :prescribed_distance_km,
          :prescribed_duration_min, :prescribed_pace_zone, :notes
        )
        """,
        materialized,
    )
    return len(materialized)


def get_plan_week(conn: sqlite3.Connection, week_num: int) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT *
        FROM plan
        WHERE week_num = ?
        ORDER BY date
        """,
        (week_num,),
    ).fetchall()


def get_plan_between(conn: sqlite3.Connection, start: date, end: date) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT *
        FROM plan
        WHERE date BETWEEN ? AND ?
        ORDER BY date
        """,
        (start.isoformat(), end.isoformat()),
    ).fetchall()


def get_plan_for_date(conn: sqlite3.Connection, plan_date: date) -> sqlite3.Row | None:
    return conn.execute(
        """
        SELECT *
        FROM plan
        WHERE date = ?
        """,
        (plan_date.isoformat(),),
    ).fetchone()


def upsert_daily_log(
    conn: sqlite3.Connection,
    *,
    log_date: date,
    rpe: int | None,
    sleep_hours: float | None,
    soreness_1_5: int | None,
    life_stress_1_5: int | None,
    notes: str | None,
) -> None:
    conn.execute(
        """
        INSERT INTO daily_log(date, rpe, sleep_hours, soreness_1_5, life_stress_1_5, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          rpe = excluded.rpe,
          sleep_hours = excluded.sleep_hours,
          soreness_1_5 = excluded.soreness_1_5,
          life_stress_1_5 = excluded.life_stress_1_5,
          notes = excluded.notes
        """,
        (log_date.isoformat(), rpe, sleep_hours, soreness_1_5, life_stress_1_5, notes),
    )
