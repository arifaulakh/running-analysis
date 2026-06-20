import type { DashboardMetrics, WeeklyVolume } from "@/lib/types";

const phaseStyles: Record<string, string> = {
  base: "bg-moss/75",
  build: "bg-marine/80",
  peak: "bg-coral/85",
  taper: "bg-sun/85",
  race_week: "bg-ink"
};

export function PhaseTimeline({ weeks, metrics }: { weeks: WeeklyVolume[]; metrics: DashboardMetrics }) {
  const currentIndex = weeks.findIndex((week) => week.week === metrics.calendarWeek);
  const todayPercent = currentIndex < 0 ? 0 : ((currentIndex + 0.65) / weeks.length) * 100;

  return (
    <section className="chart-panel animate-fade-up xl:h-full">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Race arc</p>
          <h2 className="panel-title">Phase timeline</h2>
        </div>
        <p className="text-sm tabular-nums text-ink/65">{metrics.today}</p>
      </div>

      <div className="relative pt-7">
        <div
          className="grid h-4 overflow-hidden rounded-full ring-1 ring-inset ring-ink/5"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}
        >
          {weeks.map((week, index) => {
            const isCurrent = index === currentIndex;
            return (
              <div
                key={week.week}
                className={`${phaseStyles[week.phase] || "bg-line"} relative transition-opacity ${
                  currentIndex >= 0 && !isCurrent ? "opacity-80" : ""
                }`}
                title={`Week ${week.week}: ${week.phase.replace("_", " ")}`}
              >
                {isCurrent ? <span className="absolute inset-0 bg-white/25" /> : null}
              </div>
            );
          })}
        </div>

        {currentIndex >= 0 ? (
          <div className="pointer-events-none absolute top-0 z-10" style={{ left: `${todayPercent}%` }}>
            <div className="-ml-px h-[2.35rem] w-0.5 rounded-full bg-ink" />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-paper">
              today
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex justify-between px-0.5 text-[0.65rem] font-medium tabular-nums text-ink/65">
        <span>{weeks[0]?.label}</span>
        <span>{weeks[Math.floor(weeks.length / 2)]?.label}</span>
        <span>{weeks[weeks.length - 1]?.label}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line/70 pt-4 text-xs text-ink/65">
        {Object.keys(phaseStyles).map((phase) => (
          <span key={phase} className="inline-flex items-center gap-2 capitalize">
            <span className={`h-2.5 w-2.5 rounded-full ${phaseStyles[phase]}`} />
            {phase.replace("_", " ")}
          </span>
        ))}
      </div>
    </section>
  );
}
