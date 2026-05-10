/**
 * Eval runner. Loads each fixture, stages its data snapshot into data/,
 * invokes `claude -p` (which picks up .claude/skills/running-coach/SKILL.md
 * from the workspace), captures the output, scores it with an LLM-as-judge
 * rubric, and compares to baseline.
 *
 * Usage:
 *   pnpm tsx evals/runner.ts coach     # run all coach.eval.ts fixtures
 *   pnpm tsx evals/runner.ts observer  # run all observer.eval.ts fixtures
 *   pnpm tsx evals/runner.ts all       # run everything
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

export type Fixture = {
  id: string;
  description: string;
  /** Path to a folder under evals/golden/ that mirrors data/. Staged into data/ before invocation. */
  dataSnapshot: string;
  /** What we'd type at the Coach. */
  prompt: string;
  /** Optional: which agent we're evaluating (defaults to "coach"). */
  target?: "coach" | "observer" | "planner";
};

export type Score = {
  criterion: string;
  score: 1 | 2 | 3 | 4 | 5;
  rationale: string;
};

export type FixtureResult = {
  fixture: Fixture;
  output: string;
  scores: Score[];
  durationMs: number;
  costUsd?: number;
};

const REPO_ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(REPO_ROOT, "data");
const DATA_BACKUP = resolve(REPO_ROOT, ".data.backup");

/** Stage a fixture's data snapshot as data/, preserving the real data/. */
function stageFixture(snapshot: string) {
  if (existsSync(DATA_BACKUP)) rmSync(DATA_BACKUP, { recursive: true });
  if (existsSync(DATA_DIR)) cpSync(DATA_DIR, DATA_BACKUP, { recursive: true });
  rmSync(DATA_DIR, { recursive: true, force: true });
  cpSync(snapshot, DATA_DIR, { recursive: true });
}

/** Restore the real data/ after a fixture run. */
function restoreData() {
  if (!existsSync(DATA_BACKUP)) return;
  rmSync(DATA_DIR, { recursive: true, force: true });
  cpSync(DATA_BACKUP, DATA_DIR, { recursive: true });
  rmSync(DATA_BACKUP, { recursive: true });
}

/** Invoke `claude -p` headless. */
function invokeClaude(prompt: string): string {
  const escaped = prompt.replace(/"/g, '\\"');
  return execSync(`claude -p "${escaped}"`, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

/** Score the output against the rubric using LLM-as-judge. */
async function scoreOutput(rubricPath: string, prompt: string, output: string): Promise<Score[]> {
  const rubric = readFileSync(rubricPath, "utf8");
  const anthropic = new Anthropic();

  const judgement = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are scoring a running coach's response against a rubric.

# Rubric
${rubric}

# User prompt to coach
${prompt}

# Coach response
${output}

Return JSON only, with this shape:

{
  "scores": [
    {"criterion": "<name>", "score": <1-5>, "rationale": "<one sentence>"}
  ]
}

One entry per rubric criterion. No prose outside the JSON.`,
      },
    ],
  });

  const text = judgement.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Judge did not return JSON");
  return JSON.parse(match[0]).scores;
}

/** Run a single fixture end-to-end. */
export async function runFixture(f: Fixture): Promise<FixtureResult> {
  const target = f.target ?? "coach";
  const rubricPath = resolve(REPO_ROOT, "evals/rubrics", `${target}.md`);
  const start = Date.now();

  stageFixture(resolve(REPO_ROOT, f.dataSnapshot));
  try {
    const output = invokeClaude(f.prompt);
    const scores = await scoreOutput(rubricPath, f.prompt, output);
    return { fixture: f, output, scores, durationMs: Date.now() - start };
  } finally {
    restoreData();
  }
}

/** Aggregate scores; compare to baseline; fail if any criterion regresses by >0.5. */
export function regressionCheck(results: FixtureResult[], baselinePath: string) {
  const baseline = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8"))
    : null;

  const summary: Record<string, { mean: number; n: number }> = {};
  for (const r of results) {
    for (const s of r.scores) {
      summary[s.criterion] ??= { mean: 0, n: 0 };
      summary[s.criterion].mean =
        (summary[s.criterion].mean * summary[s.criterion].n + s.score) /
        (summary[s.criterion].n + 1);
      summary[s.criterion].n += 1;
    }
  }

  const regressions: Array<{ criterion: string; before: number; after: number }> = [];
  if (baseline) {
    for (const [criterion, { mean }] of Object.entries(summary)) {
      const prev = baseline[criterion]?.mean ?? mean;
      if (prev - mean > 0.5) regressions.push({ criterion, before: prev, after: mean });
    }
  }

  if (!existsSync(baselinePath)) {
    writeFileSync(baselinePath, JSON.stringify(summary, null, 2));
  }

  return { summary, regressions };
}

/** CLI entry. Discovers and runs fixtures from coach.eval.ts / observer.eval.ts. */
async function main() {
  const target = process.argv[2] ?? "all";
  const fixtures: Fixture[] = [];

  if (target === "coach" || target === "all") {
    const { coachFixtures } = await import("./coach.eval");
    fixtures.push(...coachFixtures);
  }
  if (target === "observer" || target === "all") {
    const { observerFixtures } = await import("./observer.eval");
    fixtures.push(...observerFixtures);
  }

  const results: FixtureResult[] = [];
  for (const f of fixtures) {
    console.log(`\n▸ ${f.id}: ${f.description}`);
    const r = await runFixture(f);
    results.push(r);
    for (const s of r.scores) {
      console.log(`    ${s.criterion}: ${s.score} — ${s.rationale}`);
    }
  }

  const { summary, regressions } = regressionCheck(
    results,
    resolve(REPO_ROOT, "evals/.baseline.json"),
  );
  console.log("\nSummary:", summary);
  if (regressions.length > 0) {
    console.error("\nREGRESSIONS:", regressions);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
