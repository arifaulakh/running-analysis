"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyVolume } from "@/lib/types";
import { ClientChartFrame } from "./ClientChartFrame";
import { CHART, ChartTooltip, LegendDot } from "./chartTheme";

const SERIES = [
  { key: "completedKm", label: "Completed", color: CHART.marine },
  { key: "prescribedKm", label: "Prescribed", color: CHART.sun }
] as const;

function VolumeTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <ChartTooltip title={label || ""}>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2 capitalize">
          <LegendDot color={item.color} />
          {item.name}
          <span className="ml-auto font-semibold tabular-nums text-ink">{item.value} km</span>
        </p>
      ))}
    </ChartTooltip>
  );
}

export function WeeklyVolumeChart({ weeks, summary }: { weeks: WeeklyVolume[]; summary: string }) {
  return (
    <section className="chart-panel animate-fade-up" aria-label="Weekly volume chart comparing completed and prescribed kilometers">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Adherence</p>
          <h2 className="panel-title">Weekly volume</h2>
          <p className="mt-2 text-sm text-ink/70">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-ink/65">
          {SERIES.map((series) => (
            <span key={series.key} className="inline-flex items-center gap-1.5">
              <LegendDot color={series.color} />
              {series.label}
            </span>
          ))}
        </div>
      </div>
      <div className="h-[300px]">
        <ClientChartFrame empty={weeks.length === 0} emptyLabel="No weekly volume yet">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 300 }}>
            <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 6, left: -16 }} barGap={3}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={CHART.tick} tickMargin={8} />
              <YAxis unit=" km" tickLine={false} axisLine={false} tick={CHART.tick} tickMargin={4} />
              <Tooltip content={<VolumeTooltip />} cursor={{ fill: CHART.ink, fillOpacity: 0.04 }} />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={series.color}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={26}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ClientChartFrame>
      </div>
    </section>
  );
}
