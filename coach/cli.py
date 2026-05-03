from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta
from typing import Any

from coach import db
from coach.analytics import flags, weekly
from coach.config import get_paths
from coach.plan_loader import populate_plan
from coach.strava_sync import save_credentials, sync_activity, sync_all


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def parse_bounded_int(name: str, minimum: int, maximum: int):
    def parser(value: str) -> int:
        try:
            parsed = int(value)
        except ValueError as exc:
            raise argparse.ArgumentTypeError(f"{name} must be an integer.") from exc
        if parsed < minimum or parsed > maximum:
            raise argparse.ArgumentTypeError(f"{name} must be between {minimum} and {maximum}.")
        return parsed

    return parser


def parse_sleep_hours(value: str) -> float:
    try:
        parsed = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("sleep must be a number of hours.") from exc
    if parsed < 0 or parsed > 24:
        raise argparse.ArgumentTypeError("sleep must be between 0 and 24 hours.")
    return parsed


def current_or_configured_race_date(conn) -> date:
    profile = db.get_profile(conn)
    if "race_date" not in profile:
        raise SystemExit("No race_date in profile. Run `coach init --race-date YYYY-MM-DD ...`.")
    return date.fromisoformat(profile["race_date"])


def cmd_init(args: argparse.Namespace) -> None:
    path = db.init()
    with db.connect(path) as conn:
        db.initialize_profile(
            conn,
            race_date=args.race_date,
            goal_time=args.goal_time,
            age=args.age,
        )
        rows = populate_plan(conn, race_date=args.race_date)
    print(f"Initialized database at {path}")
    print(f"Loaded {rows} plan rows anchored to race date {args.race_date.isoformat()}")


def cmd_profile_show(_: argparse.Namespace) -> None:
    db.init()
    with db.connect() as conn:
        print(json.dumps(db.get_profile(conn), indent=2, sort_keys=True))


def cmd_profile_set(args: argparse.Namespace) -> None:
    db.init()
    try:
        value: Any = json.loads(args.value)
    except json.JSONDecodeError:
        value = args.value
    with db.connect() as conn:
        db.set_profile(conn, args.key, value)
    print(f"Set profile.{args.key}")


def cmd_plan_load(args: argparse.Namespace) -> None:
    db.init()
    with db.connect() as conn:
        race_date = args.race_date or current_or_configured_race_date(conn)
        rows = populate_plan(conn, race_date=race_date, plan_name=args.plan)
    print(f"Loaded {rows} plan rows anchored to {race_date.isoformat()}")


def format_nullable(value: object, suffix: str = "") -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.1f}{suffix}"
    return f"{value}{suffix}"


def cmd_plan_show(args: argparse.Namespace) -> None:
    db.init()
    with db.connect() as conn:
        rows = db.get_plan_week(conn, args.week)
    if not rows:
        raise SystemExit(f"No plan rows found for week {args.week}. Run `coach plan load` first.")

    print("| Date | Day | Type | Distance | Duration | Zone | Notes |")
    print("|---|---:|---|---:|---:|---|---|")
    for row in rows:
        distance = format_nullable(row["prescribed_distance_km"], " km")
        duration = format_nullable(row["prescribed_duration_min"], " min")
        print(
            "| "
            f"{row['date']} | {row['day_name'].title()} | {row['day_type']} | "
            f"{distance} | {duration} | {row['prescribed_pace_zone'] or '-'} | "
            f"{row['notes'] or ''} |"
        )


def cmd_log(args: argparse.Namespace) -> None:
    db.init()
    log_date = args.date or date.today()
    with db.connect() as conn:
        db.upsert_daily_log(
            conn,
            log_date=log_date,
            rpe=args.rpe,
            sleep_hours=args.sleep,
            soreness_1_5=args.soreness,
            life_stress_1_5=args.stress,
            notes=args.notes,
        )
    print(f"Logged subjective data for {log_date.isoformat()}")


def cmd_strava_configure(args: argparse.Namespace) -> None:
    credentials = {
        "client_id": args.client_id,
        "client_secret": args.client_secret,
        "refresh_token": args.refresh_token,
    }
    if args.access_token:
        credentials["access_token"] = args.access_token
    if args.expires_at:
        credentials["expires_at"] = args.expires_at
    save_credentials(credentials)
    print(f"Saved Strava credentials to {get_paths().credentials_path}")


def cmd_sync(args: argparse.Namespace) -> None:
    if args.activity:
        activity_id = sync_activity(args.activity)
        print(f"Synced activity {activity_id}")
        return

    synced = sync_all(
        after=args.after.isoformat() if args.after else None,
        before=args.before.isoformat() if args.before else None,
        max_activities=args.max_activities,
    )
    print(f"Synced {len(synced)} activities")


def _week_report_dates(args: argparse.Namespace) -> tuple[date, date]:
    if args.week_start:
        start = args.week_start
    else:
        start = weekly.week_start(date.today())
    return start, start + timedelta(days=6)


def cmd_weekly_report(args: argparse.Namespace) -> None:
    db.init()
    start, end = _week_report_dates(args)
    with db.connect() as conn:
        weekly.persist_week_metrics(conn, start)
        plan_rows = db.get_plan_between(conn, start, end)
        volume = weekly.weekly_volume(conn, start)
        wow = weekly.wow_volume_change(conn, start)
        intensity_match = weekly.plan_intensity_match(conn, start)
        acwr = weekly.acwr(conn, start)
        week_flags = flags.evaluate_week(conn, start)
        profile = db.get_profile(conn)
        logs = conn.execute(
            """
            SELECT *
            FROM daily_log
            WHERE date BETWEEN ? AND ?
            ORDER BY date
            """,
            (start.isoformat(), end.isoformat()),
        ).fetchall()

    print(f"# Weekly Report: {start.isoformat()} to {end.isoformat()}")
    print()
    print("## Load")
    print()
    print("| Metric | Value |")
    print("|---|---:|")
    print(f"| Total distance | {volume['total_km']:.1f} km |")
    print(f"| Total time | {int(volume['total_time_s']) // 60} min |")
    print(f"| Longest run | {volume['longest_run_km']:.1f} km |")
    print(f"| Week-over-week volume | {format_nullable(wow, '%')} |")
    print(f"| Stream-detected quality completion | {format_nullable(intensity_match, '%')} |")
    print(f"| ACWR | {format_nullable(acwr)} |")
    print()
    print(
        "HR zones use estimated max HR from `220 - age`; treat HR-derived metrics as approximate "
        "(often +/-10 bpm) until max HR or LT-HR is measured."
    )
    print()

    print("## Plan")
    print()
    if plan_rows:
        print("| Date | Type | Prescription |")
        print("|---|---|---|")
        for row in plan_rows:
            if row["prescribed_distance_km"] is not None:
                prescription = f"{row['prescribed_distance_km']:.1f} km"
            elif row["prescribed_duration_min"] is not None:
                prescription = f"{row['prescribed_duration_min']} min"
            else:
                prescription = row["notes"] or "-"
            print(f"| {row['date']} | {row['day_type']} | {prescription} |")
    else:
        print("No plan rows found for this week.")
    print()

    print("## Flags")
    print()
    if week_flags:
        for flag in week_flags:
            print(f"- **{flag.level.upper()}** `{flag.code}`: {flag.message}")
    else:
        print("No deterministic safety flags.")
    print()

    print("## Subjective Log")
    print()
    if logs:
        print("| Date | RPE | Sleep | Soreness | Stress | Notes |")
        print("|---|---:|---:|---:|---:|---|")
        for row in logs:
            print(
                "| "
                f"{row['date']} | {row['rpe'] or '-'} | {row['sleep_hours'] or '-'} | "
                f"{row['soreness_1_5'] or '-'} | {row['life_stress_1_5'] or '-'} | "
                f"{row['notes'] or ''} |"
            )
    else:
        print("No subjective logs for this week.")

    if "race_date" in profile:
        race_date = datetime.fromisoformat(profile["race_date"]).date()
        print()
        print(f"Race date: {race_date.isoformat()} ({(race_date - date.today()).days} days out)")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="coach")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize database and first-run profile.")
    init_parser.add_argument("--race-date", type=parse_date, required=True)
    init_parser.add_argument("--goal-time", required=True, help="Goal time, for example 1:35:00.")
    init_parser.add_argument("--age", type=int, required=True)
    init_parser.set_defaults(func=cmd_init)

    profile_parser = subparsers.add_parser("profile", help="Profile helpers.")
    profile_sub = profile_parser.add_subparsers(dest="profile_command", required=True)
    profile_show = profile_sub.add_parser("show")
    profile_show.set_defaults(func=cmd_profile_show)
    profile_set = profile_sub.add_parser("set")
    profile_set.add_argument("key")
    profile_set.add_argument("value")
    profile_set.set_defaults(func=cmd_profile_set)

    plan_parser = subparsers.add_parser("plan", help="Plan helpers.")
    plan_sub = plan_parser.add_subparsers(dest="plan_command", required=True)
    plan_load = plan_sub.add_parser("load")
    plan_load.add_argument("--race-date", type=parse_date)
    plan_load.add_argument("--plan", default="higdon_intermediate_2")
    plan_load.set_defaults(func=cmd_plan_load)
    plan_show = plan_sub.add_parser("show")
    plan_show.add_argument("--week", type=int, required=True)
    plan_show.set_defaults(func=cmd_plan_show)

    log_parser = subparsers.add_parser("log", help="Log subjective readiness data.")
    log_parser.add_argument("--date", type=parse_date)
    log_parser.add_argument("--rpe", type=parse_bounded_int("rpe", 1, 10))
    log_parser.add_argument("--sleep", type=parse_sleep_hours)
    log_parser.add_argument("--soreness", type=parse_bounded_int("soreness", 1, 5))
    log_parser.add_argument("--stress", type=parse_bounded_int("stress", 1, 5))
    log_parser.add_argument("--notes")
    log_parser.set_defaults(func=cmd_log)

    strava_parser = subparsers.add_parser("strava", help="Strava credential helpers.")
    strava_sub = strava_parser.add_subparsers(dest="strava_command", required=True)
    strava_configure = strava_sub.add_parser("configure")
    strava_configure.add_argument("--client-id", type=int, required=True)
    strava_configure.add_argument("--client-secret", required=True)
    strava_configure.add_argument("--refresh-token", required=True)
    strava_configure.add_argument("--access-token")
    strava_configure.add_argument("--expires-at", type=int)
    strava_configure.set_defaults(func=cmd_strava_configure)

    sync_parser = subparsers.add_parser("sync", help="Sync Strava activities.")
    sync_parser.add_argument("--activity", type=int, help="Sync one Strava activity id.")
    sync_parser.add_argument("--after", type=parse_date)
    sync_parser.add_argument("--before", type=parse_date)
    sync_parser.add_argument("--max-activities", type=int)
    sync_parser.set_defaults(func=cmd_sync)

    weekly_parser = subparsers.add_parser("weekly-report", aliases=["weekly_report"])
    weekly_parser.add_argument("--week-start", type=parse_date)
    weekly_parser.set_defaults(func=cmd_weekly_report)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
