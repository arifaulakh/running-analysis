import type { ReactNode } from "react";

export const CHART = {
  grid: "#d8ded8",
  axis: "#9ea8a1",
  tick: { fill: "#66736c", fontSize: 12 },
  moss: "#3f7a5a",
  coral: "#b85c42",
  marine: "#1f5e7a",
  sun: "#8b6b2d",
  plum: "#785d7d",
  ink: "#17211f"
} as const;

export const TYPE_COLORS: Record<string, string> = {
  easy: CHART.moss,
  long: CHART.marine,
  pace: CHART.coral,
  tempo: CHART.plum,
  interval: CHART.sun,
  race: CHART.ink,
  cross: "#6f7a72",
  other: "#68736d"
};

export function ChartTooltip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line/80 bg-paper/95 px-3.5 py-2.5 text-sm shadow-lift backdrop-blur-sm">
      <p className="font-semibold text-ink">{title}</p>
      <div className="mt-1 space-y-0.5 text-ink/70">{children}</div>
    </div>
  );
}

export function LegendDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-paper"
      style={{ backgroundColor: color }}
    />
  );
}

export function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line bg-field/40 text-sm text-ink/65">
      {label}
    </div>
  );
}
