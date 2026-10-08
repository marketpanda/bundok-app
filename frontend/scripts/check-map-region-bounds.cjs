/* eslint-disable @typescript-eslint/no-require-imports -- Check the actual map bounds helper without a test framework. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const { getRegionBounds } = require("../lib/map-region-bounds.ts");
const { mountainAreas } = require("../data/mountain-areas.ts");
const geometry = JSON.parse(fs.readFileSync(require("node:path").join(__dirname, "../public/map-data/climbing-areas.geojson"), "utf8"));
const bounds = getRegionBounds(geometry);
const coloredAreaIds = new Set(geometry.features.map((feature) => feature.properties.areaId));
assert.equal(Object.keys(bounds).length, coloredAreaIds.size);
for (const area of mountainAreas) {
  if (!coloredAreaIds.has(area.id)) continue;
  const vertices = geometry.features.filter((feature) => feature.properties.areaId === area.id)
    .flatMap((feature) => feature.geometry.coordinates.flat(feature.geometry.type === "Polygon" ? 1 : 2));
  assert(vertices.length > 0, area.id);
  // Compare to all source polygon vertices, including disconnected islands.
  assert.deepEqual(bounds[area.id], [
    [Math.min(...vertices.map((point) => point[0])), Math.min(...vertices.map((point) => point[1]))],
    [Math.max(...vertices.map((point) => point[0])), Math.max(...vertices.map((point) => point[1]))],
  ], area.id);
}
assert.deepEqual(getRegionBounds({ type: "FeatureCollection", features: [] }), {});
const { mapMountains } = require("../data/map-mountains.ts");
const { getMountainArea } = require("../data/mountain-areas.ts");
const fallback = [
  ...mountainAreas.map((area) => ({ areaId: area.id, coordinates: area.coordinates })),
  ...mapMountains.flatMap((entry) => {
    const areaId = getMountainArea(entry);
    return areaId ? [{ areaId, coordinates: entry.coordinates }] : [];
  }),
];
const allBounds = getRegionBounds(geometry, fallback);
assert.equal(Object.keys(allBounds).length, mountainAreas.length);
for (const areaId of coloredAreaIds) assert.deepEqual(allBounds[areaId], bounds[areaId], "Fallback cannot enlarge colored boundaries");
for (const point of fallback.filter((point) => !coloredAreaIds.has(point.areaId))) {
  const [[west, south], [east, north]] = allBounds[point.areaId];
  assert(point.coordinates[0] >= west && point.coordinates[0] <= east && point.coordinates[1] >= south && point.coordinates[1] <= north);
}
assert.deepEqual(getRegionBounds({ type: "FeatureCollection", features: [
  { type: "Feature", properties: { areaId: "cebu" }, geometry: { type: "Polygon", coordinates: [[[123, 9], [124, 9], [124, 10], [123, 9]]] } },
  { type: "Feature", properties: { areaId: "cebu" }, geometry: { type: "MultiPolygon", coordinates: [[[[125, 11], [126, 11], [126, 12], [125, 11]]]] } },
] }), { cebu: [[123, 9], [126, 12]] });
console.log("Region bounds checks passed: all colored regions, islands, and Polygon/MultiPolygon merging.");
