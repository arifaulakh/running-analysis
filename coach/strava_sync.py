from __future__ import annotations

import json
import os
import time
from collections.abc import Mapping, Sequence
from dataclasses import asdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

from stravalib.client import Client

from coach import db
from coach.analytics.metrics import RunMetrics, compute_run_metrics
from coach.analytics.weekly import persist_week_metrics, week_start
from coach.config import get_paths

STREAM_TYPES = ["time", "distance", "heartrate", "cadence", "altitude", "velocity_smooth"]


def load_credentials(path: Path | None = None) -> dict[str, Any]:
    credentials_path = path or get_paths().credentials_path
    if not credentials_path.exists():
        raise FileNotFoundError(
            f"No Strava credentials found at {credentials_path}. "
            "Create credentials.json with client_id, client_secret, "
            "refresh_token, and access_token."
        )
    return json.loads(credentials_path.read_text())


def save_credentials(credentials: dict[str, Any], path: Path | None = None) -> None:
    credentials_path = path or get_paths().credentials_path
    credentials_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(credentials, indent=2, sort_keys=True) + "\n"
    fd = os.open(credentials_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(payload)
    os.chmod(credentials_path, 0o600)


def refreshed_client(credentials_path: Path | None = None) -> Client:
    credentials = load_credentials(credentials_path)
    missing = {"client_id", "client_secret", "refresh_token"} - credentials.keys()
    if missing:
        raise ValueError(f"Strava credentials missing required keys: {sorted(missing)}")

    client = Client(
        access_token=credentials.get("access_token"),
        token_expires=credentials.get("expires_at"),
        refresh_token=credentials.get("refresh_token"),
    )
    access_info = client.refresh_access_token(
        client_id=int(credentials["client_id"]),
        client_secret=str(credentials["client_secret"]),
        refresh_token=str(credentials["refresh_token"]),
    )
    credentials.update(access_info)
    save_credentials(credentials, credentials_path)
    return Client(
        access_token=credentials["access_token"],
        token_expires=credentials["expires_at"],
        refresh_token=credentials["refresh_token"],
    )


def _dump_model(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", exclude_none=True)
    if isinstance(value, Mapping):
        return dict(value)
    raise TypeError(f"Expected pydantic model or mapping, got {type(value)!r}")


def _activity_field(activity: Any, raw: Mapping[str, Any], *names: str) -> Any:
    for name in names:
        if name in raw and raw[name] is not None:
            return raw[name]
        if hasattr(activity, name):
            value = getattr(activity, name)
            if value is not None:
                return value
    return None


def _activity_row(activity: Any) -> dict[str, Any]:
    raw = _dump_model(activity)
    activity_id = _activity_field(activity, raw, "id")
    start_time = _activity_field(activity, raw, "start_date", "start_time")
    start_time_local = _activity_field(activity, raw, "start_date_local", "start_time_local")
    if not activity_id:
        raise ValueError("Strava activity did not include an id.")
    if not start_time:
        raise ValueError(f"Strava activity {activity_id} did not include start_date.")
    local_time_text = _time_text(start_time_local or start_time)

    return {
        "id": int(activity_id),
        "start_time": _time_text(start_time),
        "start_time_local": local_time_text,
        "start_date_local": _date_text(local_time_text),
        "type": _activity_field(activity, raw, "sport_type", "type"),
        "distance_m": _activity_field(activity, raw, "distance"),
        "moving_time_s": _activity_field(activity, raw, "moving_time"),
        "elapsed_time_s": _activity_field(activity, raw, "elapsed_time"),
        "total_elevation_gain_m": _activity_field(activity, raw, "total_elevation_gain"),
        "average_hr": _activity_field(activity, raw, "average_heartrate", "average_hr"),
        "max_hr": _activity_field(activity, raw, "max_heartrate", "max_hr"),
        "average_cadence": _activity_field(activity, raw, "average_cadence"),
        "average_speed_mps": _activity_field(activity, raw, "average_speed"),
        "suffer_score": _activity_field(activity, raw, "suffer_score"),
        "raw_json": json.dumps(raw, sort_keys=True),
    }


def _time_text(value: Any) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _date_text(value: Any) -> str:
    text = _time_text(value)
    if len(text) >= 10:
        try:
            return date.fromisoformat(text[:10]).isoformat()
        except ValueError:
            pass
    return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()


def _stream_data(streams: Mapping[str, Any], stream_type: str) -> Sequence[Any]:
    stream = streams.get(stream_type)
    if stream is None:
        return []
    if isinstance(stream, Mapping):
        return stream.get("data") or []
    return getattr(stream, "data", None) or []


def stream_rows(activity_id: int, streams: Mapping[str, Any]) -> list[dict[str, Any]]:
    data = {stream_type: _stream_data(streams, stream_type) for stream_type in STREAM_TYPES}
    sample_count = max((len(values) for values in data.values()), default=0)
    rows: list[dict[str, Any]] = []
    for index in range(sample_count):
        rows.append(
            {
                "activity_id": activity_id,
                "sample_index": index,
                "time_s": _at(data["time"], index),
                "distance_m": _at(data["distance"], index),
                "hr": _at(data["heartrate"], index),
                "cadence": _at(data["cadence"], index),
                "altitude_m": _at(data["altitude"], index),
                "velocity_mps": _at(data["velocity_smooth"], index),
            }
        )
    return rows


def _at(values: Sequence[Any], index: int) -> Any:
    return values[index] if index < len(values) else None


def _upsert_activity(conn, row: Mapping[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO activities(
          id, start_time, start_time_local, start_date_local, type,
          distance_m, moving_time_s, elapsed_time_s,
          total_elevation_gain_m, average_hr, max_hr, average_cadence,
          average_speed_mps, suffer_score, raw_json
        )
        VALUES (
          :id, :start_time, :start_time_local, :start_date_local, :type,
          :distance_m, :moving_time_s, :elapsed_time_s,
          :total_elevation_gain_m, :average_hr, :max_hr, :average_cadence,
          :average_speed_mps, :suffer_score, :raw_json
        )
        ON CONFLICT(id) DO UPDATE SET
          start_time = excluded.start_time,
          start_time_local = excluded.start_time_local,
          start_date_local = excluded.start_date_local,
          type = excluded.type,
          distance_m = excluded.distance_m,
          moving_time_s = excluded.moving_time_s,
          elapsed_time_s = excluded.elapsed_time_s,
          total_elevation_gain_m = excluded.total_elevation_gain_m,
          average_hr = excluded.average_hr,
          max_hr = excluded.max_hr,
          average_cadence = excluded.average_cadence,
          average_speed_mps = excluded.average_speed_mps,
          suffer_score = excluded.suffer_score,
          raw_json = excluded.raw_json
        """,
        row,
    )


def _replace_streams(conn, activity_id: int, rows: Sequence[Mapping[str, Any]]) -> None:
    conn.execute("DELETE FROM streams WHERE activity_id = ?", (activity_id,))
    conn.executemany(
        """
        INSERT INTO streams(
          activity_id, sample_index, time_s, distance_m, hr, cadence, altitude_m, velocity_mps
        )
        VALUES (
          :activity_id, :sample_index, :time_s, :distance_m, :hr, :cadence,
          :altitude_m, :velocity_mps
        )
        """,
        rows,
    )


def _upsert_run_metrics(conn, activity_id: int, metrics: RunMetrics) -> None:
    row = asdict(metrics) | {"activity_id": activity_id, "computed_at": db.utc_now_iso()}
    conn.execute(
        """
        INSERT INTO run_metrics(
          activity_id, gap_pace_s_per_km, hr_drift_pct, decoupling_pct,
          z1_s, z2_s, z3_s, z4_s, z5_s, plan_classification, computed_at
        )
        VALUES (
          :activity_id, :gap_pace_s_per_km, :hr_drift_pct, :decoupling_pct,
          :z1_s, :z2_s, :z3_s, :z4_s, :z5_s, :plan_classification, :computed_at
        )
        ON CONFLICT(activity_id) DO UPDATE SET
          gap_pace_s_per_km = excluded.gap_pace_s_per_km,
          hr_drift_pct = excluded.hr_drift_pct,
          decoupling_pct = excluded.decoupling_pct,
          z1_s = excluded.z1_s,
          z2_s = excluded.z2_s,
          z3_s = excluded.z3_s,
          z4_s = excluded.z4_s,
          z5_s = excluded.z5_s,
          plan_classification = excluded.plan_classification,
          computed_at = excluded.computed_at
        """,
        row,
    )


def _profile_max_hr(conn) -> int | None:
    profile = db.get_profile(conn)
    max_hr = profile.get("max_hr")
    if isinstance(max_hr, Mapping):
        return int(max_hr["value"])
    if max_hr is not None:
        return int(max_hr)
    return None


def _activity_date(start_date_local: str) -> date:
    return date.fromisoformat(start_date_local)


def sync_activity(
    activity_id: int,
    *,
    db_path: str | Path | None = None,
    credentials_path: Path | None = None,
    client: Client | None = None,
) -> int:
    db_path = db.init(db_path)
    strava = client or refreshed_client(credentials_path)
    activity = strava.get_activity(activity_id)
    activity_row = _activity_row(activity)
    streams = strava.get_activity_streams(activity_id, types=STREAM_TYPES)
    rows = stream_rows(activity_id, streams)

    with db.connect(db_path) as conn:
        _upsert_activity(conn, activity_row)
        _replace_streams(conn, activity_id, rows)

        activity_day = _activity_date(activity_row["start_date_local"])
        plan_row = db.get_plan_for_date(conn, activity_day)
        plan_day_type = plan_row["day_type"] if plan_row else None
        metrics = compute_run_metrics(
            rows,
            max_hr=_profile_max_hr(conn),
            plan_day_type=plan_day_type,
        )
        _upsert_run_metrics(conn, activity_id, metrics)
        persist_week_metrics(conn, week_start(activity_day))

    return activity_id


def sync_all(
    *,
    db_path: str | Path | None = None,
    credentials_path: Path | None = None,
    after: datetime | str | None = None,
    before: datetime | str | None = None,
    max_activities: int | None = None,
    pause_every: int = 90,
    pause_seconds: int = 900,
    client: Client | None = None,
) -> list[int]:
    strava = client or refreshed_client(credentials_path)
    synced: list[int] = []
    for activity in strava.get_activities(after=after, before=before):
        activity_id = _activity_field(activity, _dump_model(activity), "id")
        if activity_id is None:
            continue
        sync_activity(int(activity_id), db_path=db_path, client=strava)
        synced.append(int(activity_id))
        if max_activities is not None and len(synced) >= max_activities:
            break
        if pause_every > 0 and len(synced) % pause_every == 0:
            time.sleep(pause_seconds)
    return synced
