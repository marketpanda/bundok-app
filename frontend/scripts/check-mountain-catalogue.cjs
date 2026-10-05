/* eslint-disable @typescript-eslint/no-require-imports -- This CommonJS script loads TypeScript through a require hook. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Load the actual catalogue helpers without introducing a test framework.
require.extensions[".ts"] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  module._compile(compiled.outputText, filename);
};
const root = path.resolve(__dirname, "..");
const { mapMountains, mountainDifficultyLabel } = require(path.join(root, "data/map-mountains.ts"));
const { getMountainArea } = require(path.join(root, "data/mountain-areas.ts"));
const { mountains } = require(path.join(root, "data/mountains.ts"));
const overrides = require(path.join(root, "data/map-mountain-overrides.json"));

assert(mapMountains.length > 1800, "National import must retain nationwide coverage");
assert.equal(new Set(mapMountains.map((entry) => entry.slug)).size, mapMountains.length, "Every peak needs a distinct selection ID");
for (const mountain of mapMountains) {
  const [longitude, latitude] = mountain.coordinates;
  assert(Number.isFinite(longitude) && Number.isFinite(latitude), `${mountain.slug}: invalid coordinate`);
  assert(longitude > 116 && longitude < 128 && latitude > 4 && latitude < 22, `${mountain.slug}: outside Philippine bounds`);
  assert(getMountainArea(mountain), `${mountain.slug}: missing climbing area`);
  assert(mountain.sources.length > 0, `${mountain.slug}: missing location provenance`);
  for (const trail of mountain.trails ?? []) {
    assert(Number.isInteger(trail.difficulty) && trail.difficulty >= 1 && trail.difficulty <= 9, `${mountain.slug}: invalid published rating`);
    assert(trail.source.url.startsWith("https://"), `${mountain.slug}: missing route provenance`);
    if (trail.difficultyMax) assert(trail.difficultyMax >= trail.difficulty && trail.difficultyMax <= 9);
  }
}
for (const mountain of overrides) {
  assert(mapMountains.some((entry) => entry.name === mountain.name && entry.location === mountain.location), `Lost existing entry: ${mountain.name}`);
}
for (const profile of mountains) {
  assert(mapMountains.some((entry) => entry.slug === profile.slug), `Profile cannot be selected on map: ${profile.slug}`);
}
// These same-name peaks belong to different provinces and must stay distinct.
assert(mapMountains.filter((entry) => entry.name === "Mount Apo").length >= 2);
const makiling = mapMountains.find((entry) => entry.slug === "mount-makiling");
assert(makiling.trails.some((trail) => trail.difficulty === 4));
assert(makiling.trails.some((trail) => trail.difficulty === 5));
assert.match(mountainDifficultyLabel(makiling), /4.*6\/9/);
const baco = mapMountains.find((entry) => entry.name === "Mount Baco");
assert.equal(baco.difficulty, undefined, "Do not manufacture a rating from elevation or a nearby mountain");
assert.match(mountainDifficultyLabel(baco), /No published route rating/);
console.log(`Catalogue checks passed: ${mapMountains.length} peaks, ${mapMountains.filter((entry) => entry.difficulty).length} rated destinations, all areas and profile selections resolved.`);
