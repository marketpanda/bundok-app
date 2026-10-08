import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { MountainAreaId } from "@/data/mountain-areas";

export type RegionBounds = [[number, number], [number, number]];

/** Include every province and island assigned to a colored climbing region. */
export function getRegionBounds(collection: FeatureCollection<Polygon | MultiPolygon>, fallbackPoints: { areaId: MountainAreaId; coordinates: readonly [number, number] }[] = []): Partial<Record<MountainAreaId, RegionBounds>> {
  const regions: Partial<Record<MountainAreaId, RegionBounds>> = {};
  for (const feature of collection.features) {
    const areaId = feature.properties?.areaId as MountainAreaId | undefined;
    if (!areaId) continue;
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) for (const [lng, lat] of ring) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const bounds = regions[areaId] ??= [[lng, lat], [lng, lat]];
      bounds[0][0] = Math.min(bounds[0][0], lng);
      bounds[0][1] = Math.min(bounds[0][1], lat);
      bounds[1][0] = Math.max(bounds[1][0], lng);
      bounds[1][1] = Math.max(bounds[1][1], lat);
    }
  }
  // Some catalogue climbing areas have markers but no colored boundaries.
  const polygonAreas = new Set(Object.keys(regions));
  for (const { areaId, coordinates: [lng, lat] } of fallbackPoints) {
    if (polygonAreas.has(areaId) || !Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const bounds = regions[areaId] ??= [[lng, lat], [lng, lat]];
    bounds[0][0] = Math.min(bounds[0][0], lng);
    bounds[0][1] = Math.min(bounds[0][1], lat);
    bounds[1][0] = Math.max(bounds[1][0], lng);
    bounds[1][1] = Math.max(bounds[1][1], lat);
  }
  return regions;
}
