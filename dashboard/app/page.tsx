import { CoachWatching } from "@/components/CoachWatching";
import { HrTrendChart } from "@/components/HrTrendChart";
import { LongRunProgressChart } from "@/components/LongRunProgressChart";
import { PaceProgressChart } from "@/components/PaceProgressChart";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { RaceArcHeader } from "@/components/RaceArcHeader";
import { RecentRuns } from "@/components/RecentRuns";
import { WeeklyVolumeChart } from "@/components/WeeklyVolumeChart";
import { loadDashboardData } from "@/lib/load";
import { computeMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const data = loadDashboardData();
  const metrics = computeMetrics(data);

  return (
    <main className="mx-auto flex w-full max-w-[82rem] flex-col gap-6 px-4 pb-12 sm:gap-7 sm:px-6 sm:pb-16 lg:px-8">
      <RaceArcHeader metrics={metrics} data={data} />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.38fr] xl:items-stretch">
        <PhaseTimeline weeks={metrics.weeklyVolume} metrics={metrics} />
        <CoachWatching watchpoints={metrics.watchpoints} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PaceProgressChart
          points={metrics.paceSeries}
          goalPaceSec={metrics.goalPaceSec}
          easyTargetSec={metrics.easyTargetSec}
          summary={metrics.insights.pace}
        />
        <WeeklyVolumeChart weeks={metrics.weeklyVolume} summary={metrics.insights.volume} />
        <LongRunProgressChart points={metrics.longRuns} summary={metrics.insights.longRun} />
        <HrTrendChart points={metrics.hrSeries} summary={metrics.insights.hr} />
      </div>

      <RecentRuns runs={metrics.recentRuns} />

      <footer className="mt-3 flex items-center justify-between border-t border-line/70 pt-6 text-xs text-ink/65">
        <span className="font-medium text-ink/75">{metrics.raceName}</span>
        <span>Updated {metrics.today}</span>
      </footer>
    </main>
  );
}
