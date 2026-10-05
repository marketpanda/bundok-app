import { mapMountains, type MapMountain } from "./map-mountains";
import { getMountainArea, mountainAreas, mountainAreaColors } from "./mountain-areas";

export type MountainMapLayer = "primary" | "secondary";
export const primaryMountainLimit = 800;

// Route evidence takes priority, followed by the curated Philippine dataset.
// This is a display priority, not a claim of popularity or verified access.
function priority(mountain: MapMountain) {
  if (mountain.trails?.length) return 0;
  if (mountain.sources.some((source) => source.label === "Philippine mountains dataset")) return 1;
  return 2;
}

export const primaryMapMountains = [...mapMountains]
  .sort((a, b) => priority(a) - priority(b) || a.slug.localeCompare(b.slug, "en"))
  .slice(0, primaryMountainLimit);
const primarySlugs = new Set(primaryMapMountains.map((mountain) => mountain.slug));
export function getMountainMapLayer(slug: string): MountainMapLayer {
  return primarySlugs.has(slug) ? "primary" : "secondary";
}
export const secondaryMapMountains = mapMountains.filter((mountain) => !primarySlugs.has(mountain.slug));

export function getVisibleSecondaryMountains(revealAll: boolean, selectedSlug?: string) {
  return revealAll ? secondaryMapMountains : secondaryMapMountains.filter((mountain) => mountain.slug === selectedSlug);
}

export function mountainMapFeatures(mountains: MapMountain[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: mountains.map((mountain) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: mountain.coordinates },
      properties: { slug: mountain.slug, name: mountain.name, rated: mountain.difficulty !== undefined, mapLayer: getMountainMapLayer(mountain.slug), color: mountainAreaColors[getMountainArea(mountain)!], regionIndex: mountainAreas.findIndex((area) => area.id === getMountainArea(mountain)) },
    })),
  };
}
