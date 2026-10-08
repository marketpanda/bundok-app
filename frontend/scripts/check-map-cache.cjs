/* eslint-disable @typescript-eslint/no-require-imports -- Exercise map resource sharing and browser storage without a test framework. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const geometry = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/map-data/climbing-areas.geojson"), "utf8"));
let downloads = 0, workerWarmups = 0;
const originalLoad = Module._load;
Module._load = function(request, ...args) {
  if (request === "maplibre-gl") return {
    setWorkerUrl: (url) => assert.equal(url, "/maplibre/maplibre-gl-worker.js"),
    prewarm: () => { workerWarmups++; },
  };
  return originalLoad.call(this, request, ...args);
};
const cachePath = require.resolve("../lib/map-resources.ts");
const sessionPath = require.resolve("../lib/map-session.ts");
function freshCache() { delete require.cache[cachePath]; return require(cachePath); }
function freshSession() { delete require.cache[sessionPath]; return require(sessionPath); }
(async () => {
  global.fetch = async () => { downloads++; return { ok: true, json: async () => geometry }; };
  let cache = freshCache();
  const first = cache.loadClimbingAreas(), concurrent = cache.loadClimbingAreas();
  assert.equal(first, concurrent);
  const parsed = await first;
  assert.equal(await cache.loadClimbingAreas(), parsed);
  assert.equal(downloads, 1, "Returning to a route must not fetch or parse boundaries again");
  assert.equal(Object.keys(parsed.bounds).length, 24);
  const engine = cache.loadMapEngine();
  assert.equal(engine, cache.loadMapEngine());
  await engine;
  await cache.loadMapEngine();
  assert.equal(workerWarmups, 1);

  cache = freshCache();
  global.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(cache.loadClimbingAreas(), /offline/);
  global.fetch = async () => ({ ok: true, json: async () => geometry });
  assert.equal((await cache.loadClimbingAreas()).geometry, geometry, "Retry must recover from a failed fetch");
  cache = freshCache();
  global.fetch = async () => ({ ok: false });
  await assert.rejects(cache.loadClimbingAreas(), /Could not load/);

  const storage = new Map();
  global.window = {
    location: { href: "https://example.com/mountains/", origin: "https://example.com" },
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  };
  let session = freshSession();
  assert.equal(session.readRememberedMapCamera(), undefined);
  const camera = { center: [120.8, 16.7], zoom: 9, bearing: 0, pitch: 0 };
  session.rememberMapCamera(camera);
  assert.equal(session.readRememberedMapCamera(), camera);
  session = freshSession();
  assert.deepEqual(session.readRememberedMapCamera(), camera, "A reload in the same tab must restore the last view");
  storage.set("ambangeg:map-camera:v1", "/mountains/?lat=99&lng=120&zoom=50");
  assert.equal(freshSession().readRememberedMapCamera(), undefined);
  window.sessionStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  session = freshSession();
  assert.equal(session.readRememberedMapCamera(), undefined);
  session.rememberMapCamera(camera);
  assert.equal(session.readRememberedMapCamera(), camera, "Memory cache works even when storage is blocked");
  console.log("Map cache checks passed: one boundary download, shared workers, failed-request retry, and camera restoration.");
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
