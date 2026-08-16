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

// Darkens a "#rrggbb" color by `amount` (0-1), for a barely-there outline
// that's the same hue as the fill but a touch darker.
export function darken(hex: string, amount: number): string {
  const factor = 1 - amount;
  const channel = (offset: number) =>
    Math.round(parseInt(hex.slice(offset, offset + 2), 16) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
