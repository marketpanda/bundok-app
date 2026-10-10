# Nationwide mountain catalogue

The nationwide catalogue populates only the interactive map and its results column.
`data/mountains.ts` remains the independent collection of prominent mountain cards.

## Coverage and provenance

Imported on 5 October 2026 from:

- [GeoNames Philippines country extract](https://download.geonames.org/export/dump/PH.zip): features classified as mountains (`MT`), peaks (`PK`) and named peaks (`PKS`). Province labels come from the same extract's administrative records. GeoNames is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [j4ckofalltrades/phl-mountains](https://github.com/j4ckofalltrades/phl-mountains): 497 source records with coordinates, province labels, elevations and aliases. MIT license; a copy is in `data/licenses/phl-mountains.txt`.
- Existing map coordinates and individually sourced additions in `data/map-mountain-overrides.json`. Mt. Naulaw was added on 9 October 2026 at [120.1436, 14.8325] from [Mapcarta’s OpenStreetMap record](https://mapcarta.com/N5277218421), identifying [OpenStreetMap node 5277218421](https://www.openstreetmap.org/node/5277218421). OpenStreetMap data is licensed under [ODbL](https://www.openstreetmap.org/copyright).

Mt. Tugew was added on 9 October 2026 at [120.841, 16.2637] from
[Mapcarta’s OpenStreetMap record](https://mapcarta.com/N5262944928),
identifying [OpenStreetMap node 5262944928](https://www.openstreetmap.org/node/5262944928).
Mt. Cabo [120.8425525, 16.2543999], Mt. Kabuan [120.8411651, 16.2495897],
and Mt. Sadjatan [120.8387007, 16.2421883] were added from user-supplied Google Maps place links on 9 October 2026.
Their coordinates come from the place latitude/longitude fields (`!3d`/`!4d`),
rather than the map camera position. The source links are retained in both
the catalogue and coordinate overrides. All four Kayapa Quad Peak children
now have individual map locations and highlight in their listed order.

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

Arayat Quad Peak highlights four named points on one mountain. Their separate
coordinates live in `data/hike-itineraries.ts`, sourced from OpenStreetMap nodes
[TKO Summit](https://www.openstreetmap.org/node/5421817021),
[Pinnacle Peak](https://www.openstreetmap.org/node/6512272489),
[South Peak](https://www.openstreetmap.org/node/319588221), and
[North Peak](https://www.openstreetmap.org/node/332019471).
Selecting the itinerary fits these points and labels them in the checklist order;
each pulses separately. These are destination markers, not a drawn hiking route.
