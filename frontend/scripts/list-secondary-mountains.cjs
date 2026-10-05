/* eslint-disable @typescript-eslint/no-require-imports -- Load the same TypeScript layer policy used by the map. */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  module._compile(compiled.outputText, filename);
};
const { primaryMapMountains, secondaryMapMountains } = require("../data/mountain-map-layers.ts");
const escape = (text) => text.replaceAll("|", "\\|").replaceAll("\n", " ");
const contents = [
  "# Secondary map layer mountains", "",
  `${primaryMapMountains.length} mountains are in the primary layer; ${secondaryMapMountains.length} are in the secondary layer. All remain available in the directory.`, "",
  "Priority is based on published route evidence, then inclusion in the curated Philippine mountains dataset, then stable alphabetical slug order. The 800 primary entries are not a verified popularity ranking or a guarantee of hiking access.", "",
  "Secondary mountains are hidden by default. Selecting one reveals only that peak; selecting another hides the previous secondary peak. Reveal All Mountains displays the entire secondary layer. A revealed peak keeps its secondary classification.", "",
  "Regenerate with `node scripts/list-secondary-mountains.cjs` from frontend whenever the catalogue or layer policy changes.", "",
  "| # | Mountain | Location | Catalogue ID |",
  "| --- | --- | --- | --- |",
  ...secondaryMapMountains.map((mountain, index) => `| ${index + 1} | ${escape(mountain.name)} | ${escape(mountain.location)} | ${mountain.slug} |`), "",
].join("\n");
fs.writeFileSync(path.resolve(__dirname, "../docs/secondary-map-mountains.md"), contents);
console.log(`Listed ${secondaryMapMountains.length} secondary mountains.`);
