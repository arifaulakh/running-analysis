export function parsePace(pace: string | null | undefined) {
  if (!pace) {
    return 0;
  }

  const clean = pace.replace("+", "").trim();
  const parts = clean.split(":").map((part) => Number(part));
  if (parts.some(Number.isNaN)) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return parts[0] * 60 + (parts[1] || 0);
}

export function formatPace(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "n/a";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
