#!/usr/bin/env python3
"""
Generate src/Metro/data/schedule.json from the official GTFS feed, for
driving real-time train positions in the app.

Madrid Metro's GTFS feed is frequency-based: each (route, direction,
weekday-type) has one representative trip in trips.txt, whose stop_times.txt
rows give cumulative *offsets* from a virtual trip start (not real times),
and frequencies.txt gives the headway windows a train actually departs in
throughout the day. There is no fixed timetable of individual real trains --
the app computes those at runtime from these offsets + headways.

There are only 4 service_ids (src/data/calendar.txt), each covering one
weekday pattern: Saturday, Sunday, Monday-Thursday, Friday. This script
keeps the day-of-week columns from calendar.txt and drops start_date/
end_date and calendar_dates.txt exceptions entirely -- the feed's validity
window is a fixed snapshot that will eventually be "expired" by the time
someone runs the app, but the weekday service pattern itself doesn't change,
so matching on weekday alone stays correct indefinitely.

Stop names in stop_times.txt are plain platform names (e.g. "SOL"), matched
against the existing canonical station names in stations.json the same way
stops_to_json.py matches station coordinates.

Lines 7, 9 and 10 have branches, so their (route, direction, service) has
*two* trip_ids in trips.txt -- e.g. line 9's "A" leg (Paco de Lucia ->
Puerta de Arganda) and "B" leg (Puerta de Arganda -> Arganda del Rey),
matching stations.json's line topology, which models each line as one
linear chain covering the full branch rather than a fork. The two legs are
chained end-to-end (whichever order has a matching boundary stop) into one
continuous trip, using the first leg's frequency windows, since that's when
a train actually leaves the route's true origin. Also: stop_times.txt
arrival_time values are each trip's *own* literal clock times, not
zero-based offsets -- some legs happen to start at 00:00:00 (making this
easy to miss), others don't (e.g. line 9's "B" leg starts at 06:05:00), so
every leg's times must be normalized against its own first stop, not
assumed to already start at zero.
"""

import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict

DATA_DIR = sys.argv[1] if len(sys.argv) > 1 else "src/data"
STATIONS_PATH = (
    sys.argv[2] if len(sys.argv) > 2 else "src/Metro/data/stations.json"
)
LINES_PATH = sys.argv[3] if len(sys.argv) > 3 else "src/Metro/data/lines.json"
OUT_PATH = sys.argv[4] if len(sys.argv) > 4 else "src/Metro/data/schedule.json"

# Stop names in stop_times.txt that don't normalize-match any canonical
# station name (checked by hand).
STOP_NAME_ALIASES = {
    "PARQUE LISBOA": "Parque de Lisboa",
}

DAY_PATTERNS = {
    "monday": "I14",
    "tuesday": "I14",
    "wednesday": "I14",
    "thursday": "I14",
    "friday": "I15",
    "saturday": "I12",
    "sunday": "I13",
}


def normalize(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    unaccented = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"[^A-Za-z0-9]", "", unaccented).upper()


def to_seconds(hms: str) -> int:
    h, m, s = (int(part) for part in hms.split(":"))
    return h * 3600 + m * 60 + s


def read_csv(name: str) -> list[dict]:
    with open(f"{DATA_DIR}/{name}", newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def order_legs(trip_ids: list[str], stop_times_by_trip: dict) -> list[str]:
    """Order 1-2 trip legs into one continuous end-to-end sequence."""
    if len(trip_ids) == 1:
        return trip_ids
    a, b = trip_ids
    rows_a, rows_b = stop_times_by_trip[a], stop_times_by_trip[b]
    if rows_a[-1]["stop_id"] == rows_b[0]["stop_id"]:
        return [a, b]
    if rows_b[-1]["stop_id"] == rows_a[0]["stop_id"]:
        return [b, a]
    sys.exit(
        f"error: trip legs {trip_ids} don't share a boundary stop, can't chain them"
    )


def chained_stop_times(
    trip_ids: list[str], stop_times_by_trip: dict
) -> list[tuple[dict, int]]:
    """Concatenate ordered legs into one (row, offsetSeconds) sequence,
    normalizing each leg's own literal times against its own first stop
    and continuing the cumulative offset from the previous leg."""
    combined: list[tuple[dict, int]] = []
    base = 0
    for i, trip_id in enumerate(order_legs(trip_ids, stop_times_by_trip)):
        rows = stop_times_by_trip[trip_id]
        leg_start = to_seconds(rows[0]["arrival_time"])
        # Skip the first row of every leg after the first: it's the same
        # physical stop as the previous leg's last row.
        for row in rows[1:] if i > 0 else rows:
            offset = to_seconds(row["arrival_time"]) - leg_start + base
            combined.append((row, offset))
        base = combined[-1][1]
    return combined


def main() -> None:
    with open(STATIONS_PATH, encoding="utf-8") as f:
        canonical_names = list(json.load(f)["coordinates"].keys())
    canonical_by_key = {normalize(name): name for name in canonical_names}

    with open(LINES_PATH, encoding="utf-8") as f:
        line_numbers = list(json.load(f)["lines"].keys())

    routes = {r["route_id"]: r["route_short_name"] for r in read_csv("routes.txt")}
    stops_by_id = {r["stop_id"]: r["stop_name"] for r in read_csv("stops.txt")}
    trips = read_csv("trips.txt")

    stop_times_by_trip: dict[str, list[dict]] = defaultdict(list)
    for row in read_csv("stop_times.txt"):
        stop_times_by_trip[row["trip_id"]].append(row)
    for rows in stop_times_by_trip.values():
        rows.sort(key=lambda r: int(r["stop_sequence"]))

    frequencies_by_trip: dict[str, list[dict]] = defaultdict(list)
    for row in read_csv("frequencies.txt"):
        frequencies_by_trip[row["trip_id"]].append(row)

    unmatched_stops: set[str] = set()
    lines: dict[str, dict] = {}
    skipped_lines = []

    for line_number in line_numbers:
        route_id = next(
            (rid for rid, short in routes.items() if short == line_number), None
        )
        line_trips = [t for t in trips if t["route_id"] == route_id]
        if not line_trips:
            skipped_lines.append(line_number)
            continue

        trip_ids_by_group: dict[tuple[str, str], list[str]] = defaultdict(list)
        for trip in line_trips:
            group = (trip["direction_id"], trip["service_id"].removeprefix("4_"))
            trip_ids_by_group[group].append(trip["trip_id"])

        directions: dict[str, dict] = {}
        for (direction, pattern), trip_ids in trip_ids_by_group.items():
            trip_ids = [t for t in trip_ids if stop_times_by_trip.get(t)]
            if not trip_ids:
                continue

            stops = []
            for row, offset in chained_stop_times(trip_ids, stop_times_by_trip):
                raw_name = stops_by_id.get(row["stop_id"], "")
                key = normalize(STOP_NAME_ALIASES.get(raw_name, raw_name))
                canonical = canonical_by_key.get(key)
                if canonical is None:
                    unmatched_stops.add(raw_name)
                    continue
                stops.append({"name": canonical, "offset": offset})

            # Trains depart from the route's true origin, so the combined
            # trip's departure headway follows the first leg's frequencies.
            frequency_rows = frequencies_by_trip.get(
                order_legs(trip_ids, stop_times_by_trip)[0]
            )
            if not stops or not frequency_rows:
                continue

            windows = [
                {
                    "start": to_seconds(row["start_time"]),
                    "end": to_seconds(row["end_time"]),
                    "headway": int(row["headway_secs"]),
                }
                for row in sorted(frequency_rows, key=lambda r: r["start_time"])
            ]

            directions.setdefault(direction, {})[pattern] = {
                "stops": stops,
                "windows": windows,
            }

        lines[line_number] = directions

    if unmatched_stops:
        sys.exit(
            f"error: {len(unmatched_stops)} stop name(s) in stop_times.txt did not "
            f"match any canonical station: {sorted(unmatched_stops)}"
        )

    out = {"dayPatterns": DAY_PATTERNS, "lines": lines}
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"wrote schedule for {len(lines)} line(s) to {OUT_PATH}")
    if skipped_lines:
        print(
            f"note: no GTFS trips found for line(s) {skipped_lines}; "
            "they will show no live trains",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
