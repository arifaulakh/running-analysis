import type {
  Activity,
  PlanDay,
  ProceduralMemory,
  SemanticMemory,
  TraceEvent,
  ToolCall
} from "@/lib/db/schema";

export const seedProfile = {
  race_date: "2026-07-26",
  race_name: "SF Marathon Second Half",
  race_start: "2026-07-26T08:30:00-07:00",
  race_location: "Crissy Field",
  plan_start_date: "2026-04-20",
  plan_anchor_note: "Started the 12-week block two weeks early; 2026-05-04 is week 3.",
  goal_time: "1:35:00",
  goal_pace_mi: "7:15",
  goal_pace_km: "4:30",
  current_plan: "higdon_intermediate_2"
} as const;

export const seedPlanDays: PlanDay[] = [
  {
    date: "2026-05-04",
    weekNum: 1,
    phase: "base",
    dayType: "cross",
    prescribedDistanceKm: null,
    prescribedDurationMin: 30,
    prescribedPace: null,
    notes: "Cross training"
  },
  {
    date: "2026-05-05",
    weekNum: 1,
    phase: "base",
    dayType: "easy",
    prescribedDistanceKm: 4.8,
    prescribedDurationMin: null,
    prescribedPace: "easy",
    notes: "Run"
  },
  {
    date: "2026-05-06",
    weekNum: 1,
    phase: "base",
    dayType: "intervals",
    prescribedDistanceKm: null,
    prescribedDurationMin: null,
    prescribedPace: "5K",
    notes: "5 x 400 at 5K pace"
  },
  {
    date: "2026-05-07",
    weekNum: 1,
    phase: "base",
    dayType: "easy",
    prescribedDistanceKm: 4.8,
    prescribedDurationMin: null,
    prescribedPace: "easy",
    notes: "Run"
  },
  {
    date: "2026-05-08",
    weekNum: 1,
    phase: "base",
    dayType: "rest",
    prescribedDistanceKm: null,
    prescribedDurationMin: null,
    prescribedPace: null,
    notes: "Rest"
  },
  {
    date: "2026-05-09",
    weekNum: 1,
    phase: "base",
    dayType: "easy",
    prescribedDistanceKm: 4.8,
    prescribedDurationMin: null,
    prescribedPace: "easy",
    notes: "Run"
  },
  {
    date: "2026-05-10",
    weekNum: 1,
    phase: "base",
    dayType: "long",
    prescribedDistanceKm: 8.1,
    prescribedDurationMin: null,
    prescribedPace: "easy",
    notes: "Long run"
  }
];

export const seedActivities: Activity[] = [
  {
    id: "seed-pace-001",
    startTime: new Date("2026-05-02T07:12:00-07:00"),
    type: "Run",
    distanceM: 8078,
    movingTimeS: 2181,
    totalElevationGainM: 24,
    averageHr: 154,
    maxHr: 169,
    averageCadence: null,
    averageSpeedMps: 3.7,
    name: "Saturday pace run",
    mapPolyline: null,
    splitsJsonb: [
      { mile: 1, pace: "7:30" },
      { mile: 2, pace: "7:08" },
      { mile: 3, pace: "7:07" },
      { mile: 4, pace: "7:18" },
      { mile: 5, pace: "7:11" }
    ],
    rawJsonb: {},
    fetchedAt: new Date("2026-05-02T08:00:00-07:00")
  }
];

export const seedSemanticMemory: SemanticMemory[] = [
  {
    id: "sem-001",
    claimText:
      "Easy runs tend to drift faster than prescribed; keep the next easy day clearly above 8:30/mi.",
    evidenceRefsJsonb: ["seed-pace-001"],
    confidence: "med",
    promotedFromEpisodicIds: ["epi-001"],
    createdAt: new Date("2026-05-02T08:05:00-07:00"),
    lastReinforcedAt: null,
    supersededById: null,
    retiredAt: null
  }
];

export const seedProceduralMemory: ProceduralMemory[] = [
  {
    id: "rule-001",
    ruleText: "Be direct when easy days are too fast.",
    source: "system",
    createdAt: new Date("2026-05-02T08:06:00-07:00"),
    retiredAt: null
  }
];

export const seedTraces: TraceEvent[] = [
  {
    id: "trace-seed-post-run",
    triggerEventId: null,
    agent: "coach",
    startedAt: new Date("2026-05-02T08:01:00-07:00"),
    endedAt: new Date("2026-05-02T08:01:09-07:00"),
    tokensIn: 1820,
    tokensOut: 142,
    cacheReadTokens: 650,
    cacheCreationTokens: 210,
    costUsd: "0.012400",
    model: "claude-sonnet-4",
    status: "done",
    outputText:
      "Solid. 5.02mi at 7:12/mi avg. First mile was restrained, the middle miles were right on goal rhythm, and mile 4 softened a bit. Tomorrow is easy; keep it above 8:30."
  }
];

export const seedToolCalls: ToolCall[] = [
  {
    id: "tool-seed-plan",
    traceId: "trace-seed-post-run",
    name: "read_plan",
    argsJsonb: { date: "2026-05-03" },
    resultJsonb: { dayType: "rest", notes: "Rest" },
    startedAt: new Date("2026-05-02T08:01:01-07:00"),
    endedAt: new Date("2026-05-02T08:01:01.080-07:00"),
    error: null
  },
  {
    id: "tool-seed-recent",
    traceId: "trace-seed-post-run",
    name: "get_recent_runs",
    argsJsonb: { limit: 5 },
    resultJsonb: { count: 1 },
    startedAt: new Date("2026-05-02T08:01:02-07:00"),
    endedAt: new Date("2026-05-02T08:01:02.120-07:00"),
    error: null
  }
];
