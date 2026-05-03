const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysUntil(from: Date, toIsoDate: string): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const [year, month, day] = toIsoDate.split("-").map(Number);
  const end = Date.UTC(year, month - 1, day);
  return Math.ceil((end - start) / MS_PER_DAY);
}

export function milesFromMeters(distanceM: number): number {
  return distanceM / 1609.344;
}

export function pacePerMile(distanceM: number, movingTimeS: number): string {
  const miles = milesFromMeters(distanceM);
  if (miles <= 0) return "--";

  const secondsPerMile = Math.round(movingTimeS / miles);
  const minutes = Math.floor(secondsPerMile / 60);
  const seconds = secondsPerMile % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatMiles(distanceM: number): string {
  return `${milesFromMeters(distanceM).toFixed(2)}mi`;
}

export function formatKm(distanceKm: number): string {
  const miles = distanceKm * 0.621371;
  return `${miles.toFixed(1)}mi`;
}
