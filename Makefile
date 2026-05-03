PYTHON := .venv/bin/python
PIP := .venv/bin/pip
RUFF := .venv/bin/ruff

.PHONY: setup test lint format check coach clean

setup:
	python -m venv .venv
	$(PIP) install -e ".[dev]"

test:
	$(PYTHON) -m pytest

lint:
	$(RUFF) check .

format:
	$(RUFF) format .
	$(RUFF) check . --fix

check: lint test

coach:
	$(PYTHON) -m coach.cli $(ARGS)

clean:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache *.egg-info
