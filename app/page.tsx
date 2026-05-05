import { Activity, Calendar, Database, Target } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { ImportRunPanel } from "@/components/dev/import-run-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { daysUntil, formatKm, formatMiles, pacePerMile } from "@/lib/dates";
import type { PlanDay } from "@/lib/db/schema";
import { getHomeContext } from "@/lib/repository";

export const dynamic = "force-dynamic";

function phaseVariant(phase: string): "secondary" | "outline" {
  return phase === "race" || phase === "peak" ? "secondary" : "outline";
}

export default async function HomePage() {
  const context = await getHomeContext();
  const raceDate = context.profile.race_date;
  const daysToRace = raceDate ? daysUntil(new Date(), raceDate) : null;
  const latestCoachMessage =
    context.latestTrace?.outputText ??
    "Today: keep the effort controlled and let the plan do the work. The next easy run should feel deliberately easy.";

  const prescribed = context.today?.prescribedDistanceKm
    ? formatKm(context.today.prescribedDistanceKm)
    : context.today?.prescribedDurationMin
      ? `${context.today.prescribedDurationMin} min`
      : "Open";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {context.profile.race_name}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {daysToRace !== null ? `${daysToRace} days` : "Race block"} to SF Half
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              Goal {context.profile.goal_time} at {context.profile.goal_pace_mi}/mi. Currently in
              the <span className="text-foreground">{context.today?.phase ?? "base"}</span>{" "}
              phase, week {context.today?.weekNum ?? 1} of 12.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Today
                </CardDescription>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                  {context.today?.dayType ?? "Plan"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {context.today?.notes ?? "No plan row"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Prescription
                </CardDescription>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{prescribed}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {context.today?.prescribedPace ?? "No pace target"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Data source
                </CardDescription>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      context.databaseConnected
                        ? "h-2 w-2 rounded-full bg-emerald-500"
                        : "h-2 w-2 rounded-full bg-amber-500"
                    }
                    aria-hidden
                  />
                  <span className="text-2xl font-semibold tracking-tight">
                    {context.databaseConnected ? "Live DB" : "Seeded"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {context.databaseConnected
                    ? "Connected to Postgres"
                    : "Using seed fixtures"}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">
              Latest Observation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {latestCoachMessage}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">
              Plan Window
            </CardTitle>
            <CardDescription>The next seven days at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {context.planWindow.map((day: PlanDay) => (
                <li
                  key={day.date}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-foreground">
                        {day.date}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {day.dayType}
                      </span>
                    </div>
                    <Badge variant={phaseVariant(day.phase)}>{day.phase}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
                    {day.prescribedDistanceKm ? (
                      <span className="text-foreground">
                        {formatKm(day.prescribedDistanceKm)}
                      </span>
                    ) : null}
                    {day.prescribedPace ? <span>@ {day.prescribedPace}</span> : null}
                    {day.notes ? <span>· {day.notes}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Latest Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            {context.latestActivity ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  {context.latestActivity.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatMiles(context.latestActivity.distanceM)} at{" "}
                  {pacePerMile(
                    context.latestActivity.distanceM,
                    context.latestActivity.movingTimeS
                  )}
                  /mi avg
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No synced run yet.</p>
            )}
          </CardContent>
        </Card>

        <ImportRunPanel />
      </div>

      <ChatPanel initialMessage={latestCoachMessage} />
    </div>
  );
}
