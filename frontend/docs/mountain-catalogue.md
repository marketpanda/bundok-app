# Nationwide mountain catalogue

The nationwide catalogue populates only the interactive map and its results column.
`data/mountains.ts` remains the independent collection of prominent mountain cards.

## Coverage and provenance

Imported on 5 October 2026 from:

- [GeoNames Philippines country extract](https://download.geonames.org/export/dump/PH.zip): features classified as mountains (`MT`), peaks (`PK`) and named peaks (`PKS`). Province labels come from the same extract's administrative records. GeoNames is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [j4ckofalltrades/phl-mountains](https://github.com/j4ckofalltrades/phl-mountains): 497 source records with coordinates, province labels, elevations and aliases. MIT license; a copy is in `data/licenses/phl-mountains.txt`.
- Existing map coordinates and individually sourced additions in `data/map-mountain-overrides.json`.

These are named geographic records, not a guarantee of every locally named summit
or of available hiking access. Coordinates locate peaks or approximate mountain
areas, not trailheads. GeoNames modeled terrain elevations are deliberately not
used as surveyed summit elevations. Same-name mountains in different locations
remain separate records with unique slugs.

`data/mountain-route-ratings.json` contains factual published route specifications,
with a source URL per route. Most ratings come from Pinoy Mountaineer. Bakun's
individual day hikes retain the source's explicit provisional label. Ratings apply
to the named route, not every possible climb on that mountain. Published durations
retain the source's days / hours-to-summit convention; they are not round-trip times.
Historical ratings and guide articles do not establish current access or permits.

The minimum published route rating supports catalogue sorting. The results column
shows the range across published routes and filters by overlapping route ratings.
Unrated entries remain searchable under All; no elevation-based ratings are inferred.

## Updating

Maintain route facts and coordinate overrides in their separate JSON files. Regenerate:

```powershell
python scripts/import-mountain-catalogue.py
node scripts/check-mountain-catalogue.cjs
```

The importer downloads public source data into a temporary cache by default.
`--cache PATH` can reuse downloaded data. It matches normalized names/aliases and
nearby coordinates, preserves location-separated names, and reports unmatched
route records for review. A route without a resolvable peak stays in the source
file rather than receiving an invented coordinate.

The map uses a clustered GeoJSON source; only itinerary and area controls are DOM
markers. The results column initially renders 60 map-only records, with Show more
to reveal the rest. Search covers the complete catalogue and a selected map peak
is rendered even if it is beyond the current results batch.
