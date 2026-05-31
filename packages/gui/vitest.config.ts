import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      // Electron 42 fetches its binary lazily on first bin launch, so importing
      // the real module from Node throws ENOENT (missing path.txt). Main-process
      // unit tests never need the real runtime — swap it for a Node-safe stub.
      electron: path.resolve(__dirname, "src/test/electron.mock.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
