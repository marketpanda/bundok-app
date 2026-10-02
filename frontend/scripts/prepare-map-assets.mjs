import { copyFile, mkdir } from "node:fs/promises";

const source = new URL("../node_modules/maplibre-gl/", import.meta.url);
const destination = new URL("../public/maplibre/", import.meta.url);
await mkdir(destination, { recursive: true });
await Promise.all([
  ["dist/maplibre-gl-worker.mjs", "maplibre-gl-worker.mjs"],
  ["dist/maplibre-gl-shared.mjs", "maplibre-gl-shared.mjs"],
  ["LICENSE.txt", "LICENSE.txt"],
].map(([from, to]) => copyFile(new URL(from, source), new URL(to, destination))));
