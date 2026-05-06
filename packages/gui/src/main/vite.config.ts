import { builtinModules } from "node:module";
import path from "node:path";
import { defineConfig } from "vite";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  root: __dirname,
  build: {
    target: "node24",
    outDir: "../../dist/main",
    lib: {
      entry: "main.ts",
      formats: ["es"],
      fileName: () => "main.js",
    },
    minify: false,
    emptyOutDir: true,
    rolldownOptions: {
      external: ["electron", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
      output: {
        // Bundled CJS deps (e.g. electron-log) call `require("electron")` at
        // runtime. Since the bundle is ESM and `electron` is external, those
        // requires would otherwise fail with "require is not defined". Inject
        // a banner that synthesises `require` from `import.meta.url` so the
        // CJS interop keeps working under ESM.
        banner:
          'import { createRequire as __mmeCreateRequire } from "node:module"; const require = __mmeCreateRequire(import.meta.url);',
      },
    },
  },
});
