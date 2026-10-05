/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the actual TypeScript URL helpers without a test framework. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { readMapCamera, writeMapCamera } = require("../lib/map-url.ts");
const base = new URL("https://example.com/mountains?filter=easy#itinerary-cawag-hexa");
const camera = { center: [120.188123, 14.893456], zoom: 10.725, bearing: 24.5, pitch: 30 };
const link = writeMapCamera(base, camera);
assert.deepEqual(readMapCamera(new URL(link, base)), camera);
assert(link.includes("filter=easy"));
assert(link.endsWith("#itinerary-cawag-hexa"));
assert.equal(base.searchParams.has("lat"), false);
assert.equal(readMapCamera(base), undefined);
for (const query of ["lat=&lng=120&zoom=8", "lat=NaN&lng=120&zoom=8", "lat=14&lng=181&zoom=8", "lat=14&lng=120&zoom=99", "lat=14&lng=120", "lat=14&lng=120&zoom=8&pitch=90"]) {
  assert.equal(readMapCamera(new URL(`https://example.com/mountains?${query}`)), undefined);
}
assert.equal(new URL(writeMapCamera(new URL(link, base), { center: camera.center, zoom: 8 }), base).searchParams.has("bearing"), false);
console.log("Map URL checks passed: camera round trip, invalid input, unrelated parameters, and anchors.");
