import { daysUntil, formatKm, formatMiles, isoDate, pacePerMile } from "@/lib/dates";
import { getHomeContext } from "@/lib/repository";

export async function buildCoachContext(now = new Date()) {
  const context = await getHomeContext();
  const raceDate = context.profile.race_date;
  const today = context.today;
  const latest = context.latestActivity;
  const semantic = context.memory.semantic.map((item) => item.claimText);
  const procedural = context.memory.procedural.map((item) => item.ruleText);

  return {
    ...context,
    nowIsoDate: isoDate(now),
    daysToRace: raceDate ? daysUntil(now, raceDate) : null,
    todaySummary: today
      ? `${today.date}: ${today.prescribedDistanceKm ? `${formatKm(today.prescribedDistanceKm)} ` : ""}${today.dayType}${today.prescribedPace ? ` @ ${today.prescribedPace}` : ""}`
      : "No plan row for today.",
    latestActivitySummary: latest
      ? `${latest.name}: ${formatMiles(latest.distanceM)} at ${pacePerMile(
          latest.distanceM,
          latest.movingTimeS
        )}/mi`
      : "No synced activity yet.",
    semanticClaims: semantic,
    proceduralRules: procedural
  };
}
