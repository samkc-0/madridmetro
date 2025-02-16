import { test, expect } from "vitest";
import { coordinates } from "./data/stations.json";
import { lines } from "./data/lines.json";

const allStations = Object.values(lines).flatMap((line) => line.stations);
const uniqueStations = [...new Set(allStations)];

test("no duplicate stations in `coordintes`", () => {
  expect(Object.keys(coordinates).length).toBe(uniqueStations.length);
});
