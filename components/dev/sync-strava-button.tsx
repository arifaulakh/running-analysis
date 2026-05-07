"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SyncStravaButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function syncStrava() {
    setStatus("syncing");
    setMessage("");

    const response = await fetch("/api/dev/sync-strava", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 5 })
    });
    const body = (await response.json()) as {
      synced?: number;
      skipped?: number;
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Strava sync failed.");
      return;
    }

    setStatus("done");
    setMessage(
      body.message
        ? `Synced ${body.synced ?? 0} run(s). ${body.message}`
        : `Synced ${body.synced ?? 0} run(s).`
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold tracking-tight">Strava Sync</CardTitle>
          <CardDescription>Fetch recent real runs using your local Strava token.</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={syncStrava}
          disabled={status === "syncing"}
        >
          <RefreshCw className={cn("h-4 w-4", status === "syncing" && "animate-spin")} />
          Sync
        </Button>
      </CardHeader>
      <CardContent>
        <p
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
          {status === "syncing" ? "Syncing Strava…" : message || "Requires STRAVA_* env vars."}
        </p>
      </CardContent>
    </Card>
  );
}
