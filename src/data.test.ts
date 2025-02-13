import { test, expect } from "vitest";
import { coordinates } from "./madrid_station_coordinates.json";
import { lines } from "./metro_lines.json";

const allStations = Object.values(lines).flatMap((line) => line.stations);
const uniqueStations = [...new Set(allStations)];

test("no duplicate stations in `coordintes`", () => {
  expect(Object.keys(coordinates).length).toBe(uniqueStations.length);
});
