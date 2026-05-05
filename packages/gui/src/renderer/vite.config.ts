import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
  build: {
    target: "chrome146",
    outDir: "../../dist/renderer",
    emptyOutDir: true,
  },
});
