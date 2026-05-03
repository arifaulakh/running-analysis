from __future__ import annotations

import json
import stat
from datetime import date

from coach import db
from coach.plan_loader import populate_plan
from coach.strava_sync import refreshed_client, save_credentials, sync_activity, sync_all


class FakeClient:
    def __init__(
        self,
        *,
        start_date: str = "2026-05-05T13:00:00+00:00",
        start_date_local: str = "2026-05-05T06:00:00",
    ) -> None:
        self.activity_calls: list[int] = []
        self.start_date = start_date
        self.start_date_local = start_date_local

    def get_activity(self, activity_id: int) -> dict:
        self.activity_calls.append(activity_id)
        return {
            "id": activity_id,
            "start_date": self.start_date,
            "start_date_local": self.start_date_local,
            "sport_type": "Run",
            "distance": 3600.0,
            "moving_time": 1200,
            "elapsed_time": 1210,
            "total_elevation_gain": 25.0,
            "average_heartrate": 142.0,
            "max_heartrate": 165,
            "average_cadence": 82.0,
            "average_speed": 3.0,
            "suffer_score": 18,
        }

    def get_activity_streams(self, activity_id: int, types: list[str]) -> dict:
        return {
            "time": {"data": [0, 60, 120, 180]},
            "distance": {"data": [0.0, 180.0, 360.0, 540.0]},
            "heartrate": {"data": [120, 130, 140, 150]},
            "cadence": {"data": [80, 81, 82, 83]},
            "altitude": {"data": [4.0, 5.0, 5.0, 6.0]},
            "velocity_smooth": {"data": [3.0, 3.0, 3.0, 3.0]},
        }

    def get_activities(self, after=None, before=None):
        return [{"id": 101}, {"id": 102}]


def prepared_db(tmp_path):
    db_path = tmp_path / "coach.sqlite3"
    db.init(db_path)
    with db.connect(db_path) as conn:
        db.initialize_profile(conn, race_date=date(2026, 7, 26), goal_time="1:35:00", age=35)
        populate_plan(conn, race_date=date(2026, 7, 26))
    return db_path


def test_sync_activity_writes_activity_streams_and_metrics(tmp_path) -> None:
    db_path = prepared_db(tmp_path)

    sync_activity(123, db_path=db_path, client=FakeClient())
    sync_activity(123, db_path=db_path, client=FakeClient())

    with db.connect(db_path) as conn:
        activity = conn.execute("SELECT * FROM activities WHERE id = 123").fetchone()
        stream_count = conn.execute(
            "SELECT COUNT(*) AS count FROM streams WHERE activity_id = 123"
        ).fetchone()["count"]
        metrics = conn.execute("SELECT * FROM run_metrics WHERE activity_id = 123").fetchone()
        week = conn.execute(
            "SELECT * FROM week_metrics WHERE week_start = '2026-05-04'"
        ).fetchone()

    assert activity["type"] == "Run"
    assert json.loads(activity["raw_json"])["distance"] == 3600.0
    assert stream_count == 4
    assert activity["start_date_local"] == "2026-05-05"
    assert activity["start_time_local"] == "2026-05-05T06:00:00"
    assert metrics["plan_classification"] == "planned_easy_or_recovery"
    assert metrics["easy_or_quality"] is None
    assert metrics["z2_s"] > 0
    assert week["total_km"] == 3.6


def test_sync_activity_uses_strava_local_date_for_plan_and_week(tmp_path) -> None:
    db_path = prepared_db(tmp_path)
    client = FakeClient(
        start_date="2026-05-04T04:30:00+00:00",
        start_date_local="2026-05-03T21:30:00",
    )

    with db.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO plan(
              date, week_num, day_name, day_type, prescribed_distance_km,
              prescribed_duration_min, prescribed_pace_zone, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("2026-05-03", 0, "sunday", "tempo", 5.0, None, "tempo", "Local evening"),
        )

    sync_activity(124, db_path=db_path, client=client)

    with db.connect(db_path) as conn:
        activity = conn.execute("SELECT * FROM activities WHERE id = 124").fetchone()
        metrics = conn.execute("SELECT * FROM run_metrics WHERE activity_id = 124").fetchone()
        local_week = conn.execute(
            "SELECT * FROM week_metrics WHERE week_start = '2026-04-27'"
        ).fetchone()
        utc_week = conn.execute(
            "SELECT * FROM week_metrics WHERE week_start = '2026-05-04'"
        ).fetchone()

    assert activity["start_date_local"] == "2026-05-03"
    assert metrics["plan_classification"] == "planned_quality"
    assert local_week["total_km"] == 3.6
    assert local_week["plan_intensity_match_pct"] is None
    assert utc_week is None


def test_sync_all_reuses_client_and_honors_max_activities(tmp_path) -> None:
    db_path = prepared_db(tmp_path)
    client = FakeClient()

    synced = sync_all(db_path=db_path, client=client, max_activities=1, pause_every=0)

    assert synced == [101]
    assert client.activity_calls == [101]


def test_refreshed_client_updates_credentials(tmp_path, monkeypatch) -> None:
    credentials_path = tmp_path / "credentials.json"
    save_credentials(
        {
            "client_id": 123,
            "client_secret": "secret",
            "refresh_token": "old-refresh",
            "access_token": "old-access",
            "expires_at": 1,
        },
        credentials_path,
    )

    class RefreshingClient:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def refresh_access_token(self, client_id: int, client_secret: str, refresh_token: str):
            assert client_id == 123
            assert client_secret == "secret"
            assert refresh_token == "old-refresh"
            return {
                "access_token": "new-access",
                "refresh_token": "new-refresh",
                "expires_at": 999,
            }

    monkeypatch.setattr("coach.strava_sync.Client", RefreshingClient)

    refreshed_client(credentials_path)

    credentials = json.loads(credentials_path.read_text())
    assert credentials["access_token"] == "new-access"
    assert credentials["refresh_token"] == "new-refresh"
    assert credentials["expires_at"] == 999
    assert stat.S_IMODE(credentials_path.stat().st_mode) == 0o600
