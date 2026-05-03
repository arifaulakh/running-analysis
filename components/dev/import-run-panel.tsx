"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const sample = JSON.stringify(
  {
    name: "Dev sample pace run",
    startTime: "2026-05-09T07:15:00.000-07:00",
    distanceMi: 5.02,
    movingTime: "0:36:09",
    averageHr: 156,
    maxHr: 171,
    splits: [
      { mile: 1, pace: "7:29" },
      { mile: 2, pace: "7:08" },
      { mile: 3, pace: "7:07" },
      { mile: 4, pace: "7:20" },
      { mile: 5, pace: "7:10" }
    ]
  },
  null,
  2
);

export function ImportRunPanel() {
  const router = useRouter();
  const [value, setValue] = useState(sample);
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function importRun(payload: unknown) {
    setStatus("importing");
    setMessage("");

    const response = await fetch("/api/dev/import-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as { message?: string; error?: unknown };

    if (!response.ok) {
      setStatus("error");
      setMessage(JSON.stringify(body.error ?? body));
      return;
    }

    setStatus("done");
    setMessage(body.message ?? "Imported.");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await importRun(JSON.parse(value));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  return (
    <section className="panel panel-pad">
      <div className="row">
        <h2 className="section-title">Dev Import</h2>
        <button className="button" type="button" onClick={() => importRun({ sample: true })}>
          Import Sample
        </button>
      </div>
      <form className="grid" onSubmit={submit}>
        <textarea
          aria-label="Run JSON"
          className="memory-editor code-editor"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="row">
          <span className={status === "error" ? "status-warn" : "muted"}>
            {status === "importing" ? "Importing..." : message}
          </span>
          <button className="button" disabled={status === "importing"} type="submit">
            Import JSON
          </button>
        </div>
      </form>
    </section>
  );
}
