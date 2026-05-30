import type { DashboardData, DashboardMetrics } from "@/lib/types";
import { formatPace } from "@/lib/pace";

function phaseLabel(phase: string) {
  return phase.replace("_", " ");
}

export function RaceArcHeader({ metrics, data }: { metrics: DashboardMetrics; data: DashboardData }) {
  const showingExample = data.usedFallbacks.length > 0;
  const topWatchpoint = metrics.watchpoints[0]?.title ?? "No active watchpoints";

  return (
    <header className="grid animate-fade-up gap-6 py-8 sm:py-10 lg:grid-cols-[1.45fr_1fr] lg:items-end lg:gap-10">
      <div>
        <div className="flex items-center gap-3">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" />
            Running coach
          </p>
          {showingExample ? (
            <span className="rounded-full border border-line bg-paper/70 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase text-ink/65">
              Sample data
            </span>
          ) : null}
        </div>
        <h1 className="mt-4 max-w-4xl break-words text-4xl font-semibold leading-[1.04] text-ink text-balance sm:text-6xl">
          {metrics.raceName}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink/65">
          <span className="font-medium text-ink/80">{metrics.raceDate}</span>
          <span className="h-1 w-1 rounded-full bg-ink/25" />
          <span className="capitalize">{data.profile.race.distance || "half marathon"}</span>
          {data.profile.race.location ? (
            <>
              <span className="h-1 w-1 rounded-full bg-ink/25" />
              <span>{data.profile.race.location}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-paper/95 p-5 shadow-soft">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
          <div className="bg-paper p-4">
            <p className="eyebrow text-ink/65">Days to race</p>
            <p className="mt-2 stat-num text-5xl font-semibold leading-none">{metrics.daysToRace}</p>
          </div>
          <div className="bg-paper p-4">
            <p className="eyebrow text-ink/65">Training week</p>
            <p className="mt-2 stat-num text-3xl font-semibold leading-none">
              {metrics.higdonWeek ? `Week ${metrics.higdonWeek}` : "Race arc"}
            </p>
            <p className="mt-2 text-xs text-ink/65">
              Cal. week {metrics.calendarWeek ?? "n/a"}
              <span className="mx-1.5 text-ink/25">·</span>
              <span className="capitalize">{phaseLabel(metrics.phase)}</span>
            </p>
          </div>
          <div className="bg-paper p-4">
            <p className="eyebrow text-ink/65">This week</p>
            <p className="mt-2 stat-num text-xl font-semibold leading-none">
              {metrics.currentWeekVolume
                ? `${metrics.currentWeekVolume.completedKm}/${metrics.currentWeekVolume.prescribedKm} km`
                : "n/a"}
            </p>
          </div>
          <div className="bg-paper p-4">
            <p className="eyebrow text-ink/65">Long run gap</p>
            <p className="mt-2 stat-num text-xl font-semibold leading-none">{metrics.longRunGapKm} km</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-ink/75 sm:grid-cols-2">
          <p>
            <span className="font-medium text-ink">Goal:</span> {metrics.goalTime} at {formatPace(metrics.goalPaceSec)}/km
          </p>
          <p>
            <span className="font-medium text-ink">Watch:</span> {topWatchpoint}
          </p>
        </div>
      </div>
    </header>
  );
}
