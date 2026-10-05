"""Build the nationwide map catalogue from GeoNames and phl-mountains.

Run from any directory. --cache allows reusing previously downloaded source data.
Published hiking ratings are maintained separately in mountain-route-ratings.json.
Neither source guarantees every locally named summit; no ratings are inferred.
"""
import argparse
import io
import json
import math
import re
import tempfile
import unicodedata
import urllib.request
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


@lru_cache(maxsize=None)
def key(name):
    try:
        if "Ã" in name or "â" in name:
            name = name.encode("cp1252").decode("utf-8")
    except UnicodeError:
        pass
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    name = re.sub(r"^(?:mount|mt\.?)\s+", "", name)
    name = re.sub(r"\s+peak$", "", name)
    name = re.sub(r"[^a-z0-9]", "", name)
    return {"asog": "iriga", "tabayok": "tabayoc", "osmena": "osmena", "lubo": "lobo", "malipunyo": "malarayat", "singakalsa": "timbak", "santotomas": "stotomas", "binicayan": "binacayan"}.get(name, name)


def slug(name):
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"^mt\.\s*", "mount ", name)).strip("-")


def distance(a, b):
    return math.hypot((a[0] - b[0]) * math.cos(math.radians(a[1])), a[1] - b[1]) * 111


def build(cache):
    def fetch(name, url):
        path = cache / name
        if not path.exists():
            request = urllib.request.Request(url, headers={"User-Agent": "Bundok mountain catalogue importer/1.0"})
            path.write_bytes(urllib.request.urlopen(request, timeout=45).read())
        return path.read_bytes()

    raw = fetch("geonames-ph.zip", "https://download.geonames.org/export/dump/PH.zip")
    rows = [line.split("\t") for line in zipfile.ZipFile(io.BytesIO(raw)).read("PH.txt").decode().splitlines()]
    regions = {row[10]: row[1] for row in rows if row[7] == "ADM1"}
    provinces = {(row[10], row[11]): row[1].removeprefix("Province of ") for row in rows if row[7] == "ADM2"}
    features = json.loads(fetch("phl-mountains.geojson", "https://raw.githubusercontent.com/j4ckofalltrades/phl-mountains/main/data/geojson/_index.geojson"))["features"]
    entries = []

    def find(name, coords=None, province_names=None):
        candidates = [entry for entry in entries if key(name) in {key(entry["name"]), *(key(alias) for alias in entry["aliases"])}]
        if coords:
            candidates.sort(key=lambda entry: distance(coords, entry["coordinates"]))
            return candidates[0] if candidates and distance(coords, candidates[0]["coordinates"]) < 12 else None
        if province_names:
            local = [entry for entry in candidates if any(province.lower() in entry["location"].lower() for province in province_names)]
            if len(local) == 1:
                return local[0]
        return candidates[0] if len(candidates) == 1 else None

    for feature in features:
        props = feature["properties"]
        coords = feature["geometry"]["coordinates"]
        if not (len(coords) == 2 and 116 < coords[0] < 128 and 4 < coords[1] < 22):
            continue
        name = props["name"]
        if not re.search(r"\b(?:mount|peak|volcano|needle|pico)\b", name, re.I):
            name = "Mount " + name
        entry = {"slug": slug(name), "name": name, "location": " / ".join(props["prov"]), "coordinates": coords, "aliases": props.get("alt_names", []), "sources": [{"label": "Philippine mountains dataset", "url": "https://github.com/j4ckofalltrades/phl-mountains"}]}
        if props.get("elev", 0) > 0:
            entry["elevationMeters"] = props["elev"]
        existing = find(name, coords)
        if existing:
            existing["aliases"] = sorted(set(existing["aliases"] + [name] + entry["aliases"]))
        else:
            entries.append(entry)

    for row in rows:
        if row[6] != "T" or row[7] not in ("MT", "PK", "PKS"):
            continue
        coords = [float(row[5]), float(row[4])]
        aliases = [alias for alias in row[3].split(",") if alias]
        entry = find(row[1], coords)
        if not entry:
            entry = next((match for alias in aliases if (match := find(alias, coords))), None)
        source = {"label": "GeoNames", "url": f"https://www.geonames.org/{row[0]}/"}
        if entry:
            entry["aliases"] = sorted(set(entry["aliases"] + aliases + [row[1]]))
            entry["sources"].append(source)
        else:
            entry = {"slug": slug(row[1]), "name": row[1], "location": provinces.get((row[10], row[11]), regions.get(row[10], "Philippines")), "coordinates": coords, "aliases": aliases, "sources": [source]}
            if row[15] and int(row[15]) > 0:
                entry["elevationMeters"] = int(row[15])
            entries.append(entry)

    for override in json.loads((DATA / "map-mountain-overrides.json").read_text(encoding="utf-8")):
        entry = find(override["name"], override["coordinates"])
        if not entry:
            entries.append({**override, "slug": slug(override["name"]), "aliases": override.get("aliases", []), "sources": override.get("sources", [{"label": "Existing mountain location reference", "url": "https://en.wikipedia.org/wiki/List_of_mountains_in_the_Philippines"}])})
        else:
            entry["aliases"] = sorted(set(entry["aliases"] + [override["name"]]))
            entry["name"] = override["name"]
            entry["location"] = override["location"]
            entry["sources"].extend(override.get("sources", []))

    unmatched = []
    for route in json.loads((DATA / "mountain-route-ratings.json").read_text(encoding="utf-8")):
        entry = find(route["mountainName"], route.get("coordinates"), route.get("provinces"))
        if not entry:
            # Some older guide coordinates are inaccurate: require an unambiguous
            # name and province before falling back to the gazetteer's coordinate.
            entry = find(route["mountainName"], province_names=route.get("provinces"))
        if not entry and route.get("coordinates") and route.get("provinces"):
            entry = {"slug": slug(route["mountainName"]), "name": route["mountainName"].replace("Mt. ", "Mount "), "location": " / ".join(route["provinces"]), "coordinates": route["coordinates"], "aliases": [], "sources": [route["source"]]}
            entries.append(entry)
        if not entry:
            unmatched.append(route["mountainName"])
            continue
        trail = {field: route[field] for field in ("name", "difficulty", "difficultyMax", "duration", "source") if field in route}
        entry.setdefault("trails", []).append(trail)

    used = set()
    for entry in entries:
        base = entry["slug"]
        count = 2
        while entry["slug"] in used:
            entry["slug"] = f"{base}-{count}"
            count += 1
        used.add(entry["slug"])
        entry["aliases"] = sorted(set(alias for alias in entry["aliases"] if alias != entry["name"]))
        if entry.get("trails"):
            entry["difficulty"] = min(trail["difficulty"] for trail in entry["trails"])
    entries.sort(key=lambda entry: (not bool(entry.get("trails")), entry["name"].casefold(), entry["location"]))
    (DATA / "national-mountains.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(entries)} mountains and peaks; {sum('difficulty' in e for e in entries)} with published ratings")
    print("Unmatched route names:", sorted(set(unmatched)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path)
    args = parser.parse_args()
    if args.cache:
        args.cache.mkdir(parents=True, exist_ok=True)
        build(args.cache)
    else:
        with tempfile.TemporaryDirectory(prefix="bundok-catalogue-") as directory:
            build(Path(directory))
