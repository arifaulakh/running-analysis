import { ChatPanel } from "@/components/chat-panel";
import { ImportRunPanel } from "@/components/dev/import-run-panel";
import { daysUntil, formatKm, formatMiles, pacePerMile } from "@/lib/dates";
import type { PlanDay } from "@/lib/db/schema";
import { getHomeContext } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await getHomeContext();
  const raceDate = context.profile.race_date;
  const daysToRace = raceDate ? daysUntil(new Date(), raceDate) : null;
  const latestCoachMessage =
    context.latestTrace?.outputText ??
    "Today: keep the effort controlled and let the plan do the work. The next easy run should feel deliberately easy.";

  return (
    <div className="grid home-grid">
      <div className="grid">
        <section className="panel panel-pad">
          <p className="kicker">{context.profile.race_name}</p>
          <h1 className="headline">
            {daysToRace !== null ? `${daysToRace} days` : "Race block"} to SF Half
          </h1>
          <p className="subhead">
            Goal {context.profile.goal_time} at {context.profile.goal_pace_mi}/mi. Current
            phase: {context.today?.phase ?? "base"}, week {context.today?.weekNum ?? 1} of 12.
          </p>
          <div className="metric-row">
            <div className="metric">
              <strong>{context.today?.dayType ?? "Plan"}</strong>
              <span>{context.today?.notes ?? "No plan row"}</span>
            </div>
            <div className="metric">
              <strong>
                {context.today?.prescribedDistanceKm
                  ? formatKm(context.today.prescribedDistanceKm)
                  : context.today?.prescribedDurationMin
                    ? `${context.today.prescribedDurationMin}min`
                    : "Open"}
              </strong>
              <span>{context.today?.prescribedPace ?? "No pace target"}</span>
            </div>
            <div className="metric">
              <strong className={context.databaseConnected ? "status-ok" : "status-warn"}>
                {context.databaseConnected ? "Live DB" : "Seeded"}
              </strong>
              <span>Data source</span>
            </div>
          </div>
        </section>

        <section className="panel panel-pad">
          <h2 className="section-title">Latest Observation</h2>
          <p>{latestCoachMessage}</p>
        </section>

        <section className="panel panel-pad">
          <h2 className="section-title">Plan Window</h2>
          <ul className="list">
            {context.planWindow.map((day: PlanDay) => (
              <li key={day.date}>
                <div className="row">
                  <strong>{day.date}</strong>
                  <span className="pill">{day.phase}</span>
                </div>
                <span>
                  {day.prescribedDistanceKm ? `${formatKm(day.prescribedDistanceKm)} ` : ""}
                  {day.dayType}
                  {day.prescribedPace ? ` @ ${day.prescribedPace}` : ""}
                </span>
                <span className="muted">{day.notes}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel panel-pad">
          <h2 className="section-title">Latest Run</h2>
          {context.latestActivity ? (
            <p>
              {context.latestActivity.name}: {formatMiles(context.latestActivity.distanceM)} at{" "}
              {pacePerMile(context.latestActivity.distanceM, context.latestActivity.movingTimeS)}
              /mi avg.
            </p>
          ) : (
            <p>No synced run yet.</p>
          )}
        </section>

        <ImportRunPanel />
      </div>

      <ChatPanel initialMessage={latestCoachMessage} />
    </div>
  );
}
