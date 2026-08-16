import { WEEKDAY_NAMES, type MadridClock } from "@/metro/madridClock";

export type ScheduleStop = { name: string; offset: number };
export type ScheduleWindow = { start: number; end: number; headway: number };
export type SchedulePattern = { stops: ScheduleStop[]; windows: ScheduleWindow[] };

export type Schedule = {
  dayPatterns: Record<string, string>;
  // line number -> direction ("0" | "1") -> service pattern -> schedule
  lines: Record<string, Record<string, Record<string, SchedulePattern>>>;
};

export type ActiveTrain = {
  id: string;
  line: string;
  stops: ScheduleStop[];
  departureSec: number;
};

function activeTrainsInDirection(
  line: string,
  direction: string,
  pattern: SchedulePattern,
  secondsOfDay: number,
): ActiveTrain[] {
  const { stops, windows } = pattern;
  if (stops.length < 2) return [];
  const tripDuration = stops[stops.length - 1].offset;
  const window = windows.find(
    (w) => secondsOfDay >= w.start && secondsOfDay < w.end,
  );
  if (!window || window.headway <= 0) return [];

  const trains: ActiveTrain[] = [];
  const latestDepartureIndex = Math.floor(
    (secondsOfDay - window.start) / window.headway,
  );
  for (let k = latestDepartureIndex; k >= 0; k--) {
    const departureSec = window.start + k * window.headway;
    const elapsed = secondsOfDay - departureSec;
    if (elapsed > tripDuration) break;
    trains.push({ id: `${line}-${direction}-${departureSec}`, line, stops, departureSec });
  }
  return trains;
}

export function computeActiveTrains(
  schedule: Schedule,
  clock: MadridClock,
): ActiveTrain[] {
  const pattern = schedule.dayPatterns[WEEKDAY_NAMES[clock.weekday]];
  const trains: ActiveTrain[] = [];
  for (const [line, directions] of Object.entries(schedule.lines)) {
    for (const [direction, patterns] of Object.entries(directions)) {
      const data = patterns[pattern];
      if (!data) continue;
      trains.push(
        ...activeTrainsInDirection(line, direction, data, clock.secondsOfDay),
      );
    }
  }
  return trains;
}
