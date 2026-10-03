import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const source = new URL("../node_modules/maplibre-gl/", import.meta.url);
const destination = new URL("../public/maplibre/", import.meta.url);
await mkdir(destination, { recursive: true });
// S3 upload tools can infer text/plain for .mjs. Module workers and their
// imports require a JavaScript MIME type, so publish them with .js extensions.
const worker = await readFile(new URL("dist/maplibre-gl-worker.mjs", source), "utf8");
if (!worker.includes("./maplibre-gl-shared.mjs")) {
  throw new Error("MapLibre worker's shared-module import changed; review asset preparation.");
}
await Promise.all([
  writeFile(new URL("maplibre-gl-worker.js", destination), worker.replaceAll("./maplibre-gl-shared.mjs", "./maplibre-gl-shared.js")),
  ...[
  ["dist/maplibre-gl-shared.mjs", "maplibre-gl-shared.js"],
  ["LICENSE.txt", "LICENSE.txt"],
  ].map(([from, to]) => copyFile(new URL(from, source), new URL(to, destination))),
  ...["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"].map((name) => rm(new URL(name, destination), { force: true })),
]);
