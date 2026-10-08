import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Preserve source geometry; remove shared province edges instead of drawing
// artificial curves or simplifying the region into large straight segments.
const sourceRoot = "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2011/geojson/provinces/";
const cache = process.argv.indexOf("--cache");
async function source(name) {
  if (cache !== -1) return JSON.parse(await readFile(path.join(process.argv[cache + 1], name + ".json"), "utf8"));
  const response = await fetch(sourceRoot + "provinces-region-" + name + ".json");
  if (!response.ok) throw new Error("Boundary download failed: " + response.status);
  return response.json();
}
const [cordillera, cagayan] = await Promise.all([
  source("cordilleraadministrativeregioncar"), source("cagayanvalleyregionii"),
]);
const provinces = [...cordillera.features, cagayan.features.find((feature) => feature.properties.PROVINCE === "Nueva Vizcaya")];
assert.equal(provinces.length, 7);
assert(provinces.every(Boolean));
const points = new Map();
const edges = new Map();
const pointKey = (point) => point.slice(0, 2).map((value) => value.toFixed(7)).join(",");
for (const feature of provinces) {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) {
    assert.equal(pointKey(ring[0]), pointKey(ring.at(-1)), "Source ring must be closed");
    for (let index = 0; index < ring.length - 1; index++) {
      const a = pointKey(ring[index]), b = pointKey(ring[index + 1]);
      if (a === b) continue;
      points.set(a, ring[index].slice(0, 2));
      points.set(b, ring[index + 1].slice(0, 2));
      const key = [a, b].sort().join("|");
      const edge = edges.get(key);
      if (edge) edge.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  }
}
assert([...edges.values()].every((edge) => edge.count <= 2), "Province edges must not overlap");
const neighbors = new Map();
for (const { a, b, count } of edges.values()) {
  if (count !== 1) continue;
  for (const [point, next] of [[a, b], [b, a]]) {
    if (!neighbors.has(point)) neighbors.set(point, []);
    neighbors.get(point).push(next);
  }
}
assert([...neighbors.values()].every((adjacent) => adjacent.length === 2), "Outer boundary must join cleanly");
const start = neighbors.keys().next().value;
const ring = [], visited = new Set();
let point = start, previous;
do {
  assert(!visited.has(point), "Boundary must not cross itself");
  visited.add(point);
  ring.push(points.get(point));
  const next = neighbors.get(point).find((candidate) => candidate !== previous);
  previous = point;
  point = next;
} while (point !== start);
assert.equal(visited.size, neighbors.size, "Expected one continuous Cordillera outline");
ring.push(ring[0]);
const signedArea = ring.slice(0, -1).reduce((area, [x, y], index) => area + x * ring[index + 1][1] - ring[index + 1][0] * y, 0);
if (signedArea < 0) ring.reverse();
const output = new URL("../public/map-data/climbing-areas.geojson", import.meta.url);
const collection = JSON.parse(await readFile(output, "utf8"));
const blue = collection.features.filter((feature) => feature.properties.areaId === "cordillera");
assert(blue.length > 0);
const refined = {
  type: "Feature", id: blue[0].id,
  properties: { areaId: "cordillera", name: "Cordillera", provinces: provinces.map((feature) => feature.properties.PROVINCE) },
  geometry: { type: "Polygon", coordinates: [ring] },
};
collection.features = collection.features.flatMap((feature) => feature === blue[0] ? [refined] : feature.properties.areaId === "cordillera" ? [] : [feature]);
assert.equal(new Set(collection.features.map((feature) => feature.id)).size, collection.features.length);
await writeFile(output, JSON.stringify(collection) + "\n");
console.log("Refined Cordillera: " + ring.length + " boundary vertices, one region, no internal province seams.");
