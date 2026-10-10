import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await build({
  entryPoints: ["src/handler.ts"], outfile: "dist/handler.mjs",
  platform: "node", target: "node22", format: "esm", bundle: true,
  // Some bundled CommonJS dependencies use require for Node built-ins.
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  minify: true, sourcemap: false, metafile: true,
}).then(result => writeFile("dist/meta.json", JSON.stringify(result.metafile)));
console.log("Built dist/handler.mjs for Lambda. No environment files are bundled.");
