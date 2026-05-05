"use client";

import { Upload } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold tracking-tight">Dev Import</CardTitle>
          <CardDescription>Paste a Strava-shaped run payload to ingest it.</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => importRun({ sample: true })}
          disabled={status === "importing"}
        >
          <Upload className="h-4 w-4" />
          Sample
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Textarea
            aria-label="Run JSON"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-[220px] resize-vertical font-mono text-xs leading-relaxed"
          />
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "text-sm",
                status === "error"
                  ? "text-destructive"
                  : status === "done"
                    ? "text-emerald-600"
                    : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {status === "importing" ? "Importing…" : message}
            </span>
            <Button type="submit" disabled={status === "importing"}>
              Import JSON
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
