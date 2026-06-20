"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PacePoint } from "@/lib/types";
import { formatPace } from "@/lib/pace";
import { ClientChartFrame } from "./ClientChartFrame";
import { CHART, ChartTooltip, TYPE_COLORS } from "./chartTheme";

function PaceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PacePoint }> }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  return (
    <div className="max-w-[260px]">
      <ChartTooltip title={point.date}>
        <p className="flex items-center gap-2 capitalize">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[point.type] || TYPE_COLORS.other }} />
          {point.type}
          <span className="text-ink/65">·</span> {point.km} km
          <span className="text-ink/65">·</span>
          <span className="font-semibold tabular-nums text-ink">{formatPace(point.paceSec)}/km</span>
        </p>
        {point.hr ? <p className="tabular-nums text-ink/65">Avg HR {point.hr}</p> : null}
        {point.notes ? <p className="mt-2 text-xs leading-5 text-ink/65">{point.notes}</p> : null}
      </ChartTooltip>
    </div>
  );
}

export function PaceProgressChart({
  points,
  goalPaceSec,
  easyTargetSec,
  summary
}: {
  points: PacePoint[];
  goalPaceSec: number;
  easyTargetSec: number;
  summary: string;
}) {
  const types = useMemo(() => Array.from(new Set(points.map((point) => point.type))).sort(), [points]);
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const visibleTypes = types.filter((type) => !hiddenTypes.includes(type));

  function toggleType(type: string) {
    setHiddenTypes((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  }

  return (
    <section className="chart-panel animate-fade-up lg:col-span-2" aria-label="Pace over time chart with goal and easy pace reference lines">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Progress</p>
          <h2 className="panel-title">Pace over time</h2>
          <p className="mt-2 text-sm text-ink/70">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((type) => {
            const active = !hiddenTypes.includes(type);
            const color = TYPE_COLORS[type] || TYPE_COLORS.other;
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                aria-pressed={active}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  active
                    ? "border-ink/15 bg-paper text-ink shadow-sm"
                    : "border-line bg-field text-ink/65 hover:text-ink"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full transition-opacity"
                  style={{ backgroundColor: color, opacity: active ? 1 : 0.4 }}
                />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[360px]">
        <ClientChartFrame empty={points.length === 0} emptyLabel="No paced runs recorded yet">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 360 }}>
            <ScatterChart margin={{ top: 12, right: 24, bottom: 10, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="label"
                type="category"
                allowDuplicatedCategory={false}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                tick={CHART.tick}
                tickMargin={8}
              />
              <YAxis
                dataKey="paceSec"
                reversed
                tickFormatter={formatPace}
                tickLine={false}
                axisLine={false}
                tick={CHART.tick}
                tickMargin={4}
                width={52}
                domain={["dataMin - 20", "dataMax + 20"]}
              />
              <Tooltip content={<PaceTooltip />} cursor={{ stroke: CHART.ink, strokeOpacity: 0.15 }} />
              <ReferenceLine
                y={goalPaceSec}
                stroke={CHART.coral}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "goal", fill: CHART.coral, fontSize: 11, fontWeight: 600, position: "insideTopRight" }}
              />
              <ReferenceLine
                y={easyTargetSec}
                stroke={CHART.moss}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "easy", fill: CHART.moss, fontSize: 11, fontWeight: 600, position: "insideBottomRight" }}
              />
              {visibleTypes.map((type) => (
                <Scatter
                  key={type}
                  data={points.filter((point) => point.type === type)}
                  fill={TYPE_COLORS[type] || TYPE_COLORS.other}
                  line={{ stroke: TYPE_COLORS[type] || TYPE_COLORS.other, strokeWidth: 2, strokeOpacity: 0.3 }}
                  lineType="joint"
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ClientChartFrame>
      </div>
    </section>
  );
}
