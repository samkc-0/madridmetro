import { lines } from "@/metro/data/lines.json";

export const lineNumbers = Object.keys(lines);

export const lineColors: Record<string, string> = Object.fromEntries(
  Object.entries(lines).map(([number, data]) => [number, data.color]),
);

// station name -> every line number that stops there
export const stationLines: Record<string, string[]> = {};
for (const [number, data] of Object.entries(lines)) {
  for (const station of data.stations) {
    (stationLines[station] ??= []).push(number);
  }
}
