#!/usr/bin/env python3
"""
Regenerate the station coordinates in src/Metro/data/stations.json from the
official GTFS feed (src/data/stops.txt), keeping the existing station names
(used throughout src/Metro/data/lines.json) as the canonical keys.

GTFS stop_name values are upper-case and unaccented (e.g. "ALONSO MARTINEZ"),
and major interchanges only have a location_type=1 "station" row under a
different name (e.g. "Intercambiador de Plaza de Castilla" for our
"Plaza de Castilla"), so names are matched case/accent/punctuation-insensitively,
preferring an exact match, falling back to a substring match, then to a
location_type=0 (platform) row when no location_type=1 row exists at all.

Longitude and latitude degrees aren't equal distances at Madrid's latitude
(1 degree of longitude is ~24% shorter than 1 degree of latitude here), so
longitude is scaled by cos(mean latitude) before writing out, making the x/y
units comparable and the resulting map proportionally to scale.
"""

import csv
import json
import math
import re
import sys
import unicodedata

STOPS_PATH = sys.argv[1] if len(sys.argv) > 1 else "src/data/stops.txt"
STATIONS_PATH = (
    sys.argv[2] if len(sys.argv) > 2 else "src/Metro/data/stations.json"
)

# Names that don't normalize-match any GTFS stop_name (checked by hand).
ALIASES = {
    "Parque de Lisboa": "PARQUE LISBOA",
}


def normalize(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    unaccented = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"[^A-Za-z0-9]", "", unaccented).upper()


def load_gtfs_coords(path: str) -> tuple[dict, dict]:
    by_type1: dict[str, tuple[float, float]] = {}
    by_type0: dict[str, tuple[float, float]] = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            lat, lon = row.get("stop_lat", "").strip(), row.get("stop_lon", "").strip()
            if not lat or not lon:
                continue
            key = normalize(row["stop_name"])
            coord = (float(lat), float(lon))
            location_type = row.get("location_type", "").strip()
            if location_type == "1":
                by_type1.setdefault(key, coord)
            elif location_type == "0":
                by_type0.setdefault(key, coord)
    return by_type1, by_type0


def find_coord(
    name: str, by_type1: dict, by_type0: dict
) -> tuple[float, float] | None:
    key = normalize(ALIASES.get(name, name))
    if key in by_type1:
        return by_type1[key]
    for gtfs_key, coord in by_type1.items():
        if key in gtfs_key or gtfs_key in key:
            return coord
    if key in by_type0:
        return by_type0[key]
    return None


def main() -> None:
    with open(STATIONS_PATH, encoding="utf-8") as f:
        current_names = list(json.load(f)["coordinates"].keys())

    by_type1, by_type0 = load_gtfs_coords(STOPS_PATH)

    latlon: dict[str, tuple[float, float]] = {}
    missing = []
    for name in current_names:
        coord = find_coord(name, by_type1, by_type0)
        if coord is None:
            missing.append(name)
        else:
            latlon[name] = coord

    if missing:
        sys.exit(
            f"error: no GTFS coordinates found for {len(missing)} station(s): "
            f"{missing}\nAdd an entry to ALIASES for each."
        )

    mean_lat = sum(lat for lat, _ in latlon.values()) / len(latlon)
    lon_scale = math.cos(math.radians(mean_lat))

    coordinates = {
        name: {"x": lon * lon_scale, "y": lat} for name, (lat, lon) in latlon.items()
    }

    with open(STATIONS_PATH, "w", encoding="utf-8") as f:
        json.dump({"coordinates": coordinates}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"wrote {len(coordinates)} station coordinates to {STATIONS_PATH}")


if __name__ == "__main__":
    main()
