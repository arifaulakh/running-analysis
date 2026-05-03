from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

import pandas as pd

ZONE_KEYS = ("z1_s", "z2_s", "z3_s", "z4_s", "z5_s")
QUALITY_TYPES = {"intervals", "tempo", "pace", "race"}


@dataclass(frozen=True)
class RunMetrics:
    gap_pace_s_per_km: float | None
    hr_drift_pct: float | None
    decoupling_pct: float | None
    z1_s: int
    z2_s: int
    z3_s: int
    z4_s: int
    z5_s: int
    plan_classification: str | None


def streams_to_frame(streams: Sequence[Mapping[str, Any]] | pd.DataFrame) -> pd.DataFrame:
    if isinstance(streams, pd.DataFrame):
        frame = streams.copy()
    else:
        frame = pd.DataFrame(streams)
    if frame.empty:
        return pd.DataFrame(columns=["time_s", "distance_m", "hr", "altitude_m", "velocity_mps"])
    return frame.sort_values("time_s").reset_index(drop=True)


def elapsed_seconds(frame: pd.DataFrame) -> float:
    if frame.empty or "time_s" not in frame:
        return 0.0
    return float(frame["time_s"].max() - frame["time_s"].min())


def sample_durations(frame: pd.DataFrame) -> pd.Series:
    if frame.empty or "time_s" not in frame:
        return pd.Series(dtype=float)
    durations = frame["time_s"].shift(-1) - frame["time_s"]
    return durations.fillna(0).clip(lower=0)


def compute_zone_time(
    streams: Sequence[Mapping[str, Any]] | pd.DataFrame,
    max_hr: int | float,
) -> dict[str, int]:
    frame = streams_to_frame(streams)
    result = dict.fromkeys(ZONE_KEYS, 0)
    if frame.empty or "hr" not in frame or not max_hr:
        return result

    durations = sample_durations(frame)
    hr = frame["hr"]
    fractions = [0.60, 0.70, 0.80, 0.90]
    zone_names = list(ZONE_KEYS)
    for idx, value in hr.items():
        if pd.isna(value) or value < max_hr * 0.50:
            continue
        zone_idx = sum(value >= max_hr * threshold for threshold in fractions)
        result[zone_names[zone_idx]] += int(round(durations.iloc[idx]))
    return result


def compute_gap_pace(streams: Sequence[Mapping[str, Any]] | pd.DataFrame) -> float | None:
    """Approximate grade-adjusted pace in seconds/km.

    This is not a clone of Strava's proprietary GAP model. It applies a simple
    grade factor from stream altitude/distance so persisted metrics can be tested
    and later swapped for a better model without changing downstream contracts.
    """
    frame = streams_to_frame(streams)
    required = {"distance_m", "time_s", "altitude_m"}
    if frame.empty or not required.issubset(frame.columns):
        return None

    frame = frame.dropna(subset=["distance_m", "time_s", "altitude_m"])
    if len(frame) < 2:
        return None

    distance_delta = frame["distance_m"].diff().clip(lower=0).fillna(0)
    time_delta = frame["time_s"].diff().clip(lower=0).fillna(0)
    altitude_delta = frame["altitude_m"].diff().fillna(0)
    moving = (distance_delta > 0) & (time_delta > 0)
    if not moving.any():
        return None

    grade = (altitude_delta[moving] / distance_delta[moving]).clip(lower=-0.20, upper=0.20)
    grade_factor = (1 + grade * 3.0).clip(lower=0.70, upper=1.60)
    adjusted_distance_m = (distance_delta[moving] * grade_factor).sum()
    total_time_s = time_delta[moving].sum()
    if adjusted_distance_m <= 0:
        return None
    return float(total_time_s / (adjusted_distance_m / 1000.0))


def _moving_segment(frame: pd.DataFrame) -> pd.DataFrame:
    if frame.empty or "time_s" not in frame:
        return frame
    cutoff = float(frame["time_s"].min()) + 600
    if elapsed_seconds(frame) > 1800:
        return frame[frame["time_s"] >= cutoff].copy()
    return frame.copy()


def _half_metric(frame: pd.DataFrame, value_col: str) -> tuple[float, float] | None:
    if value_col not in frame or "time_s" not in frame:
        return None
    usable = _moving_segment(frame).dropna(subset=[value_col, "time_s"])
    if elapsed_seconds(frame) <= 3600 or len(usable) < 4:
        return None

    midpoint = usable["time_s"].min() + (usable["time_s"].max() - usable["time_s"].min()) / 2
    first = usable[usable["time_s"] <= midpoint][value_col].mean()
    second = usable[usable["time_s"] > midpoint][value_col].mean()
    if pd.isna(first) or pd.isna(second) or first == 0:
        return None
    return float(first), float(second)


def compute_hr_drift(streams: Sequence[Mapping[str, Any]] | pd.DataFrame) -> float | None:
    halves = _half_metric(streams_to_frame(streams), "hr")
    if not halves:
        return None
    first, second = halves
    return (second - first) / first * 100.0


def _pace_hr_ratio(frame: pd.DataFrame) -> tuple[float, float] | None:
    required = {"time_s", "distance_m", "hr"}
    if frame.empty or not required.issubset(frame.columns):
        return None
    usable = _moving_segment(frame).dropna(subset=["time_s", "distance_m", "hr"])
    if elapsed_seconds(frame) <= 3600 or len(usable) < 4:
        return None

    midpoint = usable["time_s"].min() + (usable["time_s"].max() - usable["time_s"].min()) / 2
    parts = [usable[usable["time_s"] <= midpoint], usable[usable["time_s"] > midpoint]]
    ratios: list[float] = []
    for part in parts:
        duration_h = (part["time_s"].max() - part["time_s"].min()) / 3600.0
        distance_km = (part["distance_m"].max() - part["distance_m"].min()) / 1000.0
        avg_hr = part["hr"].mean()
        if duration_h <= 0 or distance_km <= 0 or pd.isna(avg_hr) or avg_hr <= 0:
            return None
        speed_kmh = distance_km / duration_h
        ratios.append(float(speed_kmh / avg_hr))
    return ratios[0], ratios[1]


def compute_decoupling(streams: Sequence[Mapping[str, Any]] | pd.DataFrame) -> float | None:
    ratios = _pace_hr_ratio(streams_to_frame(streams))
    if not ratios:
        return None
    first, second = ratios
    return (first - second) / first * 100.0


def classify_plan_day(plan_day_type: str | None) -> str | None:
    if not plan_day_type:
        return None
    return "planned_quality" if plan_day_type in QUALITY_TYPES else "planned_easy_or_recovery"


def classify_easy_or_quality(plan_day_type: str | None) -> str | None:
    return classify_plan_day(plan_day_type)


def compute_run_metrics(
    streams: Sequence[Mapping[str, Any]] | pd.DataFrame,
    *,
    max_hr: int | float | None,
    plan_day_type: str | None = None,
) -> RunMetrics:
    zones = compute_zone_time(streams, max_hr) if max_hr else dict.fromkeys(ZONE_KEYS, 0)
    return RunMetrics(
        gap_pace_s_per_km=compute_gap_pace(streams),
        hr_drift_pct=compute_hr_drift(streams),
        decoupling_pct=compute_decoupling(streams),
        plan_classification=classify_plan_day(plan_day_type),
        **zones,
    )
