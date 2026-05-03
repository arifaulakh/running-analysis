from __future__ import annotations

import pytest

from coach.analytics.metrics import (
    classify_plan_day,
    compute_decoupling,
    compute_gap_pace,
    compute_hr_drift,
    compute_zone_time,
)


def make_stream(duration_s: int = 4200) -> list[dict[str, float]]:
    rows = []
    for time_s in range(0, duration_s + 1, 60):
        first_half = time_s <= duration_s / 2
        rows.append(
            {
                "time_s": float(time_s),
                "distance_m": time_s * 3.0,
                "hr": 140.0 if first_half else 150.0,
                "altitude_m": time_s / 120.0,
                "velocity_mps": 3.0,
            }
        )
    return rows


def test_zone_time_uses_percent_of_max_hr() -> None:
    streams = [
        {"time_s": 0, "hr": 100},
        {"time_s": 10, "hr": 125},
        {"time_s": 20, "hr": 145},
        {"time_s": 30, "hr": 165},
        {"time_s": 40, "hr": 185},
    ]

    zones = compute_zone_time(streams, max_hr=200)

    assert zones == {
        "z1_s": 10,
        "z2_s": 10,
        "z3_s": 10,
        "z4_s": 10,
        "z5_s": 0,
    }
    assert sum(zones.values()) == 40


def test_hr_drift_requires_runs_over_60_minutes() -> None:
    assert compute_hr_drift(make_stream(duration_s=3000)) is None
    assert compute_hr_drift(make_stream(duration_s=4200)) == pytest.approx(5.92, rel=0.05)


def test_decoupling_requires_runs_over_60_minutes() -> None:
    assert compute_decoupling(make_stream(duration_s=3000)) is None
    assert compute_decoupling(make_stream(duration_s=4200)) == pytest.approx(5.59, rel=0.10)


def test_gap_pace_returns_seconds_per_km() -> None:
    gap = compute_gap_pace(make_stream(duration_s=1200))

    assert gap is not None
    assert gap > 0


def test_classify_plan_day_is_explicitly_plan_derived() -> None:
    assert classify_plan_day("tempo") == "planned_quality"
    assert classify_plan_day("long") == "planned_easy_or_recovery"
    assert classify_plan_day(None) is None
