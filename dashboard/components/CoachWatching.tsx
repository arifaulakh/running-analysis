import type { Watchpoint } from "@/lib/types";

function confidenceClass(confidence: string) {
  if (confidence === "high") {
    return "border-moss/30 bg-moss/10 text-moss";
  }
  if (confidence === "med") {
    return "border-marine/30 bg-marine/10 text-marine";
  }
  return "border-sun/40 bg-sun/10 text-ink";
}

function confidenceLabel(confidence: string) {
  if (confidence === "high") return "High confidence";
  if (confidence === "med") return "Medium confidence";
  if (confidence === "low") return "Low confidence";
  return confidence;
}

export function CoachWatching({ watchpoints }: { watchpoints: Watchpoint[] }) {
  return (
    <section className="chart-panel animate-fade-up">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow">Coach memory</p>
          <h2 className="panel-title">What the coach is watching</h2>
        </div>
        <p className="text-xs tabular-nums text-ink/65">
          {watchpoints.length} active {watchpoints.length === 1 ? "watchpoint" : "watchpoints"}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {watchpoints.length > 0 ? (
          watchpoints.map((watchpoint) => (
            <article key={watchpoint.id} className="rounded-lg border border-line/80 bg-field/35 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${confidenceClass(watchpoint.confidence)}`}
                >
                  {confidenceLabel(watchpoint.confidence)}
                </span>
                <span className="text-xs text-ink/65">
                  {watchpoint.evidenceCount} {watchpoint.evidenceCount === 1 ? "data point" : "data points"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-ink">{watchpoint.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/80">{watchpoint.body}</p>
              <p className="mt-3 border-t border-line/70 pt-3 text-sm font-medium text-ink">
                {watchpoint.recommendation}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-line bg-field/30 px-4 py-6 text-center text-sm text-ink/65 md:col-span-2">
            No active semantic claims yet.
          </p>
        )}
      </div>
    </section>
  );
}
