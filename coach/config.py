from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

APP_DIR_NAME = "coach"


@dataclass(frozen=True)
class CoachPaths:
    config_dir: Path
    db_path: Path
    credentials_path: Path

    def ensure_dirs(self) -> None:
        self.config_dir.mkdir(parents=True, exist_ok=True)


def get_paths() -> CoachPaths:
    """Return filesystem paths, overridable for tests with COACH_CONFIG_DIR."""
    config_root = os.environ.get("COACH_CONFIG_DIR")
    if config_root:
        config_dir = Path(config_root).expanduser()
    else:
        config_dir = Path.home() / ".config" / APP_DIR_NAME

    return CoachPaths(
        config_dir=config_dir,
        db_path=config_dir / "coach.sqlite3",
        credentials_path=config_dir / "credentials.json",
    )


def default_db_path() -> Path:
    return get_paths().db_path
