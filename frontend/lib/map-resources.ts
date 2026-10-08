import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { getMountainArea, mountainAreas } from "../data/mountain-areas";
import { mapMountains } from "../data/map-mountains";
import { hikeItineraries } from "../data/hike-itineraries";
import { getRegionBounds } from "./map-region-bounds";

type ClimbingAreas = { geometry: FeatureCollection<Polygon | MultiPolygon>; bounds: ReturnType<typeof getRegionBounds> };
let areasPromise: Promise<ClimbingAreas> | undefined;
let enginePromise: Promise<typeof import("maplibre-gl")> | undefined;

/** Share one download and parsed geometry across route changes and concurrent mounts. */
export function loadClimbingAreas(): Promise<ClimbingAreas> {
  areasPromise ??= fetch("/map-data/climbing-areas.geojson").then(async (response) => {
    if (!response.ok) throw new Error("Could not load climbing regions");
    const geometry = await response.json() as FeatureCollection<Polygon | MultiPolygon>;
    const bounds = getRegionBounds(geometry, [
      ...mountainAreas.map((area) => ({ areaId: area.id, coordinates: area.coordinates })),
      ...[...mapMountains, ...hikeItineraries].flatMap((entry) => {
        const areaId = getMountainArea(entry);
        return areaId ? [{ areaId, coordinates: entry.coordinates }] : [];
      }),
    ]);
    return { geometry, bounds };
  }).catch((error) => {
    // A failed request must not prevent the Retry button from trying again.
    areasPromise = undefined;
    throw error;
  });
  return areasPromise;
}

export function loadMapEngine(): Promise<typeof import("maplibre-gl")> {
  enginePromise ??= import("maplibre-gl").then((engine) => {
    engine.setWorkerUrl("/maplibre/maplibre-gl-worker.js");
    // Workers survive map.remove(), so the next route visit can reuse them.
    engine.prewarm();
    return engine;
  }).catch((error) => {
    enginePromise = undefined;
    throw error;
  });
  return enginePromise;
}
