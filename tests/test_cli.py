from __future__ import annotations

import pytest

from coach.cli import main


def test_cli_init_and_plan_show(tmp_path, monkeypatch, capsys) -> None:
    monkeypatch.setenv("COACH_CONFIG_DIR", str(tmp_path))

    main(["init", "--race-date", "2026-07-26", "--goal-time", "1:35:00", "--age", "35"])
    main(["plan", "show", "--week", "1"])

    output = capsys.readouterr().out
    assert "Loaded 84 plan rows" in output
    assert "2026-05-04" in output
    assert "5 x 400" in output


@pytest.mark.parametrize(
    "args,error",
    [
        (["log", "--rpe", "11"], "rpe must be between 1 and 10"),
        (["log", "--soreness", "0"], "soreness must be between 1 and 5"),
        (["log", "--stress", "6"], "stress must be between 1 and 5"),
        (["log", "--sleep", "-1"], "sleep must be between 0 and 24 hours"),
        (["log", "--sleep", "25"], "sleep must be between 0 and 24 hours"),
    ],
)
def test_cli_log_validates_readiness_values(args, error, tmp_path, monkeypatch, capsys) -> None:
    monkeypatch.setenv("COACH_CONFIG_DIR", str(tmp_path))

    with pytest.raises(SystemExit):
        main(args)

    assert error in capsys.readouterr().err
