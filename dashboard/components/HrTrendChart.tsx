"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HrPoint } from "@/lib/types";
import { ClientChartFrame } from "./ClientChartFrame";
import { CHART, ChartTooltip } from "./chartTheme";

function HrTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: HrPoint }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  return (
    <ChartTooltip title={point.date || label || ""}>
      <p className="capitalize">
        {point.type} <span className="text-ink/65">·</span> avg HR{" "}
        <span className="font-semibold tabular-nums text-ink">{point.hr}</span>
      </p>
    </ChartTooltip>
  );
}

export function HrTrendChart({ points, summary }: { points: HrPoint[]; summary: string }) {
  return (
    <section className="chart-panel animate-fade-up" aria-label="Average heart rate trend chart">
      <div className="mb-4">
        <p className="eyebrow">Effort</p>
        <h2 className="panel-title">Average heart rate</h2>
        <p className="mt-2 text-sm text-ink/70">{summary}</p>
      </div>
      <div className="h-[260px]">
        <ClientChartFrame empty={points.length === 0} emptyLabel="No heart-rate data logged yet">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 260 }}>
            <AreaChart data={points} margin={{ top: 10, right: 16, bottom: 6, left: -16 }}>
              <defs>
                <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.coral} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART.coral} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={CHART.tick} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={CHART.tick}
                tickMargin={4}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip content={<HrTooltip />} cursor={{ stroke: CHART.ink, strokeOpacity: 0.15 }} />
              <Area
                dataKey="hr"
                type="monotone"
                stroke={CHART.coral}
                strokeWidth={2.5}
                fill="url(#hrFill)"
                dot={{ r: 3, fill: CHART.coral, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: CHART.coral, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientChartFrame>
      </div>
    </section>
  );
}
