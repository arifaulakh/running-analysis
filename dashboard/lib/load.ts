import fs from "fs";
import path from "path";
import YAML from "yaml";
import type { Athlete, Block, DashboardData, MemoryClaim, Plan, Profile, Run } from "./types";

function fileExists(filePath: string) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function findDataDir() {
  const candidates = [path.resolve(process.cwd(), "..", "data"), path.resolve(process.cwd(), "data")];
  const found = candidates.find((candidate) => fileExists(path.join(candidate, "plan.yaml")));
  if (!found) {
    throw new Error(`Could not find data/plan.yaml from ${process.cwd()}`);
  }
  return found;
}

function readWithFallback(dataDir: string, relativePath: string, usedFallbacks: string[]) {
  const fullPath = path.join(dataDir, relativePath);
  if (fileExists(fullPath)) {
    return fs.readFileSync(fullPath, "utf8");
  }

  const parsed = path.parse(relativePath);
  const fallback = path.join(dataDir, parsed.dir, `${parsed.name}${parsed.ext}.example`);
  if (fileExists(fallback)) {
    usedFallbacks.push(relativePath);
    return fs.readFileSync(fallback, "utf8");
  }

  usedFallbacks.push(relativePath);
  return "";
}

// Reads a file if present, without the .example fallback bookkeeping — used
// for the split config files (block.json / athlete.json) and legacy shims.
function readIfExists(dataDir: string, relativePath: string) {
  const fullPath = path.join(dataDir, relativePath);
  return fileExists(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function dateString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value || "");
}

function isConcrete(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("<") &&
    !value.includes("YYYY") &&
    value !== "H:MM:SS" &&
    value !== "M:SS"
  );
}

function optionalConcrete(value: unknown) {
  return isConcrete(value) ? String(value) : undefined;
}

// Builds the UI's flattened Profile from the split files (block.json +
// athlete.json), falling back to a legacy profile.json blob for older data
// snapshots. The split files are the source of truth going forward.
function normalizeProfile(
  block: Partial<Block>,
  athlete: Partial<Athlete>,
  legacy: Partial<Profile>,
  plan: Plan
): Profile {
  const race: Partial<Profile["race"]> = block.race || legacy.race || {};
  const planRaceDate = dateString(plan.race_date);
  const raceDate = isConcrete(race.date) ? String(race.date) : planRaceDate;
  const raceName = isConcrete(race.name) ? String(race.name) : plan.race_name || "Race";
  const easy = athlete.easy_pace_model || {};

  const pick = (...vals: unknown[]) => vals.find((v) => isConcrete(v));

  return {
    name: String(pick(athlete.name, legacy.name) ?? "Runner"),
    race: {
      name: raceName,
      date: raceDate,
      start_time_local: optionalConcrete(race.start_time_local),
      location: optionalConcrete(race.location),
      distance: isConcrete(race.distance) ? race.distance : "half marathon",
      url: optionalConcrete(race.url)
    },
    goal_time: String(pick(block.goal_time, legacy.goal_time) ?? ""),
    goal_pace_per_km: String(pick(block.goal_pace_per_km, legacy.goal_pace_per_km) ?? "4:30"),
    goal_pace_per_mi: optionalConcrete(pick(block.goal_pace_per_mi, legacy.goal_pace_per_mi)),
    easy_pace_target_per_km: String(pick(easy.per_km, legacy.easy_pace_target_per_km) ?? "5:17").replace("+", ""),
    easy_pace_target_per_mi: String(pick(easy.per_mi, legacy.easy_pace_target_per_mi) ?? "8:30+"),
    calendar_weeks: Number(block.plan_weeks) || Number(legacy.calendar_weeks) || plan.weeks.length,
    higdon_weeks: Number(block.plan_weeks) || Number(legacy.higdon_weeks) || plan.weeks.length
  };
}

function parseRuns(text: string): Run[] {
  const runs: Run[] = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      try {
        runs.push(JSON.parse(line) as Run);
      } catch (error) {
        // A single malformed line (e.g. a run logged with raw multi-line notes)
        // should not take down the whole dashboard — skip it and keep going.
        console.warn(`Skipping unparseable run on line ${index + 1}: ${(error as Error).message}`);
      }
    });

  return runs.sort((a, b) => a.date.localeCompare(b.date));
}

function parseSemantic(text: string): MemoryClaim[] {
  const chunks = text.split(/^---\s*$/m);
  const claims: MemoryClaim[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed || !/^id:\s*/m.test(trimmed)) {
      continue;
    }

    try {
      const parsed = YAML.parse(trimmed) as Partial<MemoryClaim> | null;
      if (parsed?.id && parsed.claim) {
        claims.push({
          id: String(parsed.id),
          claim: String(parsed.claim),
          confidence: parsed.confidence || "low",
          evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
          created_at: parsed.created_at,
          reinforced_at: parsed.reinforced_at,
          superseded_by: parsed.superseded_by ?? null
        });
      }
    } catch (error) {
      // A single malformed claim block (e.g. an observer write that drops a
      // closing quote) should not take down the whole dashboard — skip it
      // and keep going. The id, if present, helps locate the bad block.
      const idMatch = /^id:\s*(.+)$/m.exec(trimmed);
      const label = idMatch ? idMatch[1].trim() : "unknown";
      console.warn(`Skipping unparseable semantic claim (${label}): ${(error as Error).message}`);
    }
  }

  return claims;
}

export function loadDashboardData(): DashboardData {
  const dataDir = findDataDir();
  const usedFallbacks: string[] = [];
  const plan = YAML.parse(fs.readFileSync(path.join(dataDir, "plan.yaml"), "utf8")) as Plan;
  const rawBlock = JSON.parse(readIfExists(dataDir, "block.json") || "{}") as Partial<Block>;
  const rawAthlete = JSON.parse(readIfExists(dataDir, "athlete.json") || "{}") as Partial<Athlete>;
  // Legacy fallback: older data snapshots may still carry a single profile.json.
  const hasSplit = Object.keys(rawBlock).length > 0 || Object.keys(rawAthlete).length > 0;
  const rawLegacy = hasSplit
    ? ({} as Partial<Profile>)
    : (JSON.parse(readWithFallback(dataDir, "profile.json", usedFallbacks) || "{}") as Partial<Profile>);

  return {
    profile: normalizeProfile(rawBlock, rawAthlete, rawLegacy, plan),
    plan,
    runs: parseRuns(readWithFallback(dataDir, "runs.jsonl", usedFallbacks)),
    claims: parseSemantic(readWithFallback(dataDir, "memory/semantic.md", usedFallbacks)),
    usedFallbacks
  };
}
