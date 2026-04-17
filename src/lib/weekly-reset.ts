/**
 * Returns the Unix timestamp (ms) of the most recent weekly reset for the given region.
 * EU/KR/TW reset: Wednesday 07:00 UTC
 * US reset:       Tuesday  15:00 UTC
 */
export function getWeeklyResetTimestamp(region: string): number {
  const now = Date.now();
  const isUS = region === "us";
  const resetDay = isUS ? 2 : 3; // 0=Sun … 6=Sat; Tue=2, Wed=3
  const resetHour = isUS ? 15 : 7;

  const d = new Date(now);
  d.setUTCHours(resetHour, 0, 0, 0);
  const diff = (d.getUTCDay() - resetDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  // If we landed in the future, step back one week
  if (d.getTime() > now) d.setUTCDate(d.getUTCDate() - 7);
  return d.getTime();
}

/**
 * Normalise a Blizzard timestamp to milliseconds.
 * The encounters/raids endpoint returns timestamps in seconds.
 * Heuristic: timestamps < 5 × 10^9 are in seconds.
 */
export function toMs(ts: number): number {
  return ts < 5e9 ? ts * 1000 : ts;
}
