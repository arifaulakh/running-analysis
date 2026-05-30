"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LongRunPoint } from "@/lib/types";
import { ClientChartFrame } from "./ClientChartFrame";
import { CHART, ChartTooltip } from "./chartTheme";

function LongRunTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <ChartTooltip title={label || ""}>
      <p className="flex items-center gap-2">
        Longest run
        <span className="ml-auto font-semibold tabular-nums text-ink">{payload[0].value} km</span>
      </p>
    </ChartTooltip>
  );
}

export function LongRunProgressChart({ points, summary }: { points: LongRunPoint[]; summary: string }) {
  return (
    <section className="chart-panel animate-fade-up" aria-label="Long run progression chart">
      <div className="mb-4">
        <p className="eyebrow">Endurance</p>
        <h2 className="panel-title">Long-run progression</h2>
        <p className="mt-2 text-sm text-ink/70">{summary}</p>
      </div>
      <div className="h-[300px]">
        <ClientChartFrame empty={points.length === 0} emptyLabel="No long runs recorded yet">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={points} margin={{ top: 14, right: 16, bottom: 6, left: -16 }}>
              <defs>
                <linearGradient id="longRunFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.moss} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART.moss} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={CHART.tick} tickMargin={8} />
              <YAxis unit=" km" tickLine={false} axisLine={false} tick={CHART.tick} tickMargin={4} domain={[0, 22]} />
              <Tooltip content={<LongRunTooltip />} cursor={{ stroke: CHART.ink, strokeOpacity: 0.15 }} />
              <ReferenceLine
                y={21.1}
                stroke={CHART.coral}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "race 21.1 km", fill: CHART.coral, fontSize: 11, fontWeight: 600, position: "insideTopRight" }}
              />
              <Area
                dataKey="longestKm"
                type="monotone"
                stroke={CHART.moss}
                strokeWidth={2.75}
                fill="url(#longRunFill)"
                dot={{ r: 3.5, fill: CHART.moss, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: CHART.moss, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientChartFrame>
      </div>
    </section>
  );
}
