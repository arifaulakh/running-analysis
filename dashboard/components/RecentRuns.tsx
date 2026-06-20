import type { RecentRun } from "@/lib/types";
import { TYPE_COLORS } from "./chartTheme";

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.other;
  return (
    <span className="inline-flex items-center gap-1.5 text-ink/75">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="capitalize">{type}</span>
    </span>
  );
}

export function RecentRuns({ runs }: { runs: RecentRun[] }) {
  return (
    <section className="chart-panel animate-fade-up">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Run log</p>
          <h2 className="panel-title">Recent runs</h2>
        </div>
        <p className="text-xs tabular-nums text-ink/65">{runs.length} most recent</p>
      </div>
      {runs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-field/30 px-4 py-8 text-center text-sm text-ink/65">
          No runs logged yet.
        </p>
      ) : (
        <>
          <div className="grid max-h-[42rem] gap-3 overflow-y-auto pr-1 md:hidden">
            {runs.map((run) => (
              <article key={run.id} className="rounded-lg border border-line/70 bg-field/35 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium tabular-nums text-ink">{run.date}</p>
                  <TypeBadge type={run.type} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink/70">
                  <span>
                    <strong className="block text-[0.65rem] uppercase text-ink/65">Distance</strong>
                    {run.distanceKm === null ? "n/a" : `${run.distanceKm} km`}
                  </span>
                  <span>
                    <strong className="block text-[0.65rem] uppercase text-ink/65">Pace</strong>
                    {run.pace ? `${run.pace}/km` : "n/a"}
                  </span>
                  <span>
                    <strong className="block text-[0.65rem] uppercase text-ink/65">HR</strong>
                    {run.hr ?? "n/a"}
                  </span>
                </div>
                {run.notes ? <p className="mt-3 text-sm leading-5 text-ink/75">{run.notes}</p> : null}
              </article>
            ))}
          </div>

          <div className="hidden max-h-[38rem] overflow-auto md:block">
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[0.7rem] uppercase text-ink/65">
                  <th className="sticky top-0 z-10 border-b border-line bg-paper px-3 py-2.5 font-semibold">Date</th>
                  <th className="sticky top-0 z-10 border-b border-line bg-paper px-3 py-2.5 font-semibold">Type</th>
                  <th className="sticky top-0 z-10 border-b border-line bg-paper px-3 py-2.5 text-right font-semibold">Distance</th>
                  <th className="sticky top-0 z-10 border-b border-line bg-paper px-3 py-2.5 text-right font-semibold">Pace</th>
                  <th className="sticky top-0 z-10 border-b border-line bg-paper px-3 py-2.5 text-right font-semibold">HR</th>
                  <th className="sticky top-0 z-10 border-b border-line bg-paper px-3 py-2.5 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="transition-colors hover:bg-field/65 [&>td]:border-b [&>td]:border-line/60 last:[&>td]:border-b-0"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums text-ink/85">{run.date}</td>
                    <td className="px-3 py-3">
                      <TypeBadge type={run.type} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink/75">
                      {run.distanceKm === null ? "n/a" : `${run.distanceKm} km`}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink/75">{run.pace ? `${run.pace}/km` : "n/a"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink/75">{run.hr ?? "n/a"}</td>
                    <td className="max-w-[360px] truncate px-3 py-3 text-ink/65">{run.notes || "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
