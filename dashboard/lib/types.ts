export type RunType = string;

export type Profile = {
  name: string;
  race: {
    name: string;
    date: string;
    start_time_local?: string;
    location?: string;
    distance?: string;
    url?: string;
  };
  goal_time: string;
  goal_pace_per_km: string;
  goal_pace_per_mi?: string;
  easy_pace_target_per_km: string;
  easy_pace_target_per_mi?: string;
  calendar_weeks: number;
  higdon_weeks: number;
};

export type PlanDay = {
  date?: string | Date;
  type: RunType;
  distance_km?: number | null;
  duration_min?: number | null;
  intervals?: string;
  race_distance?: string;
  notes?: string;
};

export type PlanWeek = {
  week: number;
  start_date: string | Date;
  end_date: string | Date;
  phase: string;
  higdon_week?: number | null;
  notes?: string;
  days: Record<string, PlanDay>;
};

export type Plan = {
  race_date: string | Date;
  race_name: string;
  plan: string;
  phases?: Record<string, number[]>;
  weeks: PlanWeek[];
};

export type Run = {
  id: string;
  strava_activity_id?: number | null;
  date: string;
  distance_km?: number | null;
  distance_mi?: number | null;
  moving_time_s?: number | null;
  avg_pace_per_km?: string | null;
  avg_pace_per_mi?: string | null;
  avg_hr?: number | null;
  max_hr?: number | null;
  type_inferred?: RunType | null;
  notes?: string | null;
  raw_input?: string | null;
  logged_at?: string | null;
};

export type MemoryClaim = {
  id: string;
  claim: string;
  confidence: string;
  evidence: string[];
  created_at?: string;
  reinforced_at?: string;
  superseded_by?: string | null;
};

export type Watchpoint = {
  id: string;
  title: string;
  body: string;
  confidence: string;
  evidenceCount: number;
  recommendation: string;
};

export type DashboardData = {
  profile: Profile;
  plan: Plan;
  runs: Run[];
  claims: MemoryClaim[];
  usedFallbacks: string[];
};

export type WeeklyVolume = {
  label: string;
  week: number;
  phase: string;
  prescribedKm: number;
  completedKm: number;
};

export type WeekSession = {
  date: string;
  type: string;
  label: string;
  done: boolean;
};

export type WeekSessions = {
  completed: number;
  planned: number;
  next: WeekSession | null;
};

export type PacePoint = {
  date: string;
  label: string;
  type: string;
  paceSec: number;
  hr: number | null;
  km: number;
  notes: string;
};

export type LongRunPoint = {
  label: string;
  week: number;
  longestKm: number;
};

export type HrPoint = {
  date: string;
  label: string;
  hr: number;
  type: string;
};

export type RecentRun = {
  id: string;
  date: string;
  type: string;
  distanceKm: number | null;
  pace: string | null;
  hr: number | null;
  notes: string;
};

export type DashboardMetrics = {
  today: string;
  raceName: string;
  raceDate: string;
  daysToRace: number;
  higdonWeek: number | null;
  calendarWeek: number | null;
  phase: string;
  goalTime: string;
  goalPaceSec: number;
  easyTargetSec: number;
  currentWeekVolume: WeeklyVolume | null;
  currentWeekSessions: WeekSessions | null;
  bestLongRunKm: number;
  longRunGapKm: number;
  insights: {
    volume: string;
    pace: string;
    longRun: string;
    hr: string;
  };
  weeklyVolume: WeeklyVolume[];
  paceSeries: PacePoint[];
  longRuns: LongRunPoint[];
  hrSeries: HrPoint[];
  watchpoints: Watchpoint[];
  recentRuns: RecentRun[];
};
