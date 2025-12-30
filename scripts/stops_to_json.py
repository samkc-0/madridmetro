#!/usr/bin/env python3
import csv, json, sys

infile = sys.argv[1] if len(sys.argv) > 1 else "stops.txt"

coords = {}

with open(infile, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Only stations
        if row.get("location_type", "").strip() != "1":
            continue

        name = row["stop_name"].strip()
        lat = row.get("stop_lat", "").strip()
        lon = row.get("stop_lon", "").strip()

        if not name or not lat or not lon:
            continue

        coords[name] = {"x": float(lon), "y": float(lat)}

out = {"coordinates": coords}
print(json.dumps(out, ensure_ascii=False, indent=2))
