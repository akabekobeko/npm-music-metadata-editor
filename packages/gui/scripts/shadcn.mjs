import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const env = { ...process.env, TS_NODE_PROJECT: "tsconfig.web.json" };

const shadcn = spawnSync("shadcn", args, {
  stdio: "inherit",
  env,
  shell: true,
});
if (shadcn.status !== 0) {
  process.exit(shadcn.status ?? 1);
}

const biome = spawnSync("biome", ["check", "--write", "--no-errors-on-unmatched", "src/renderer"], {
  stdio: "inherit",
  shell: true,
});
process.exit(biome.status ?? 0);
