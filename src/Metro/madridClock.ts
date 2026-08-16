const MADRID_TZ = "Europe/Madrid";
const OFFSET_REFRESH_MS = 5 * 60_000;

// 0 = Sunday, matching Date.getUTCDay().
export const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type MadridClock = { secondsOfDay: number; weekday: number };

function computeUtcOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = offset.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) * 60 : 60;
}

// Avoids calling the (relatively expensive) Intl formatter on every render
// frame: the UTC offset only changes twice a year (DST), so it's cached and
// only recomputed periodically, while reading the current time each frame
// is just cheap arithmetic on top of the cached offset.
export class MadridClockTracker {
  private offsetMinutes: number;
  private offsetComputedAt: number;

  constructor(now: Date = new Date()) {
    this.offsetMinutes = computeUtcOffsetMinutes(now);
    this.offsetComputedAt = now.getTime();
  }

  read(now: Date = new Date()): MadridClock {
    const clock = { secondsOfDay: 0, weekday: 0 };
    this.readInto(clock, now);
    return clock;
  }

  // Mutates `clock` in place instead of allocating, for callers (the
  // per-frame render loop) that read this every frame.
  readInto(clock: MadridClock, now: Date = new Date()): void {
    if (now.getTime() - this.offsetComputedAt > OFFSET_REFRESH_MS) {
      this.offsetMinutes = computeUtcOffsetMinutes(now);
      this.offsetComputedAt = now.getTime();
    }
    const shifted = new Date(now.getTime() + this.offsetMinutes * 60_000);
    clock.secondsOfDay =
      shifted.getUTCHours() * 3600 +
      shifted.getUTCMinutes() * 60 +
      shifted.getUTCSeconds() +
      shifted.getUTCMilliseconds() / 1000;
    clock.weekday = shifted.getUTCDay();
  }
}
