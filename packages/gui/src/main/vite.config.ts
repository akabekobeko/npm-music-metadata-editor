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
    },
  },
});
