import type { DashboardData, DashboardMetrics } from "@/lib/types";
import { formatPace } from "@/lib/pace";

function phaseLabel(phase: string) {
  return phase.replace("_", " ");
}

export function RaceArcHeader({ metrics, data }: { metrics: DashboardMetrics; data: DashboardData }) {
  const showingExample = data.usedFallbacks.length > 0;
  const topWatchpoint = metrics.watchpoints[0]?.title ?? "No active watchpoints";

  return (
    <header className="relative mt-4 grid animate-fade-up overflow-hidden rounded-[1.5rem] bg-ink px-5 py-7 text-paper shadow-lift sm:mt-6 sm:px-8 sm:py-9 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-10 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border-[52px] border-paper/[0.035]" />
      <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-moss/15 blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <p className="eyebrow flex items-center gap-2 text-paper/65">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral ring-4 ring-coral/15" />
            Running coach
          </p>
          {showingExample ? (
            <span className="rounded-full border border-paper/15 bg-paper/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-paper/70">
              Sample data
            </span>
          ) : null}
        </div>
        <h1 className="mt-5 max-w-3xl break-words font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-paper text-balance sm:text-6xl lg:text-[4.25rem]">
          {metrics.raceName}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-paper/60">
          <span className="font-semibold text-paper/90">{metrics.raceDate}</span>
          <span className="h-1 w-1 rounded-full bg-paper/30" />
          <span className="capitalize">{data.profile.race.distance || "half marathon"}</span>
          {data.profile.race.location ? (
            <>
              <span className="h-1 w-1 rounded-full bg-paper/30" />
              <span>{data.profile.race.location}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 mt-8 rounded-[1.15rem] border border-paper/10 bg-paper/[0.075] p-3 backdrop-blur-sm lg:mt-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-paper p-4 shadow-soft">
            <p className="eyebrow text-ink/55">Days to race</p>
            <p className="mt-2 stat-num text-5xl font-semibold leading-none">{metrics.daysToRace}</p>
          </div>
          <div className="rounded-xl bg-paper p-4 shadow-soft">
            <p className="eyebrow text-ink/55">Training week</p>
            <p className="mt-2 stat-num text-3xl font-semibold leading-none">
              {metrics.higdonWeek ? `Week ${metrics.higdonWeek}` : "Race arc"}
            </p>
            <p className="mt-2 text-xs text-ink/65">
              Cal. week {metrics.calendarWeek ?? "n/a"}
              <span className="mx-1.5 text-ink/25">·</span>
              <span className="capitalize">{phaseLabel(metrics.phase)}</span>
            </p>
          </div>
          <div className="rounded-xl bg-paper/95 p-4">
            <p className="eyebrow text-ink/55">This week</p>
            {metrics.currentWeekSessions ? (
              <>
                <p className="mt-2 stat-num text-xl font-semibold leading-none">
                  {metrics.currentWeekSessions.completed}
                  <span className="text-ink/40">/{metrics.currentWeekSessions.planned}</span> sessions
                </p>
                <p className="mt-2 line-clamp-1 text-xs text-ink/65">
                  {metrics.currentWeekSessions.next
                    ? `Next: ${metrics.currentWeekSessions.next.label}`
                    : "All sessions done"}
                </p>
              </>
            ) : (
              <p className="mt-2 stat-num text-xl font-semibold leading-none">n/a</p>
            )}
          </div>
          <div className="rounded-xl bg-paper/95 p-4">
            <p className="eyebrow text-ink/55">Long run gap</p>
            <p className="mt-2 stat-num text-xl font-semibold leading-none">{metrics.longRunGapKm} km</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 rounded-xl border border-paper/10 bg-ink/25 px-4 py-3 text-sm text-paper/70 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-paper">Goal:</span> {metrics.goalTime} at {formatPace(metrics.goalPaceSec)}/km
          </p>
          <p>
            <span className="font-semibold text-paper">Watch:</span> {topWatchpoint}
          </p>
        </div>
      </div>
    </header>
  );
}
