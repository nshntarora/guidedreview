import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "src/bin.ts")],
  outfile: path.join(root, "dist/bin.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "bundle",
  external: [],
  // CJS deps (express → debug) call require("tty"). ESM bundles have no
  // require; createRequire restores it for Node builtins and remaining CJS.
  banner: {
    js: `import { createRequire as __guidedReviewCreateRequire } from "node:module";
const require = __guidedReviewCreateRequire(import.meta.url);`,
  },
});
