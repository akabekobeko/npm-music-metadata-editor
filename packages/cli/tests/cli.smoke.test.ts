import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(here, "../dist/bin/mme.js");
const binAvailable = existsSync(binPath);

describe("bin shim smoke test", () => {
  // The compiled bin is only present after `pnpm build`. CI runs `pnpm build`
  // before `pnpm test`; locally, this case is skipped until the user has built
  // the package at least once. Logic-level coverage of the same code paths is
  // already exercised by `runCli` in `src/cli.test.ts`, so skipping here does
  // not lose validation — it just defers the shebang-execution sanity check.
  it.skipIf(!binAvailable)("emits the version when invoked through dist/bin/mme.js", () => {
    const result = spawnSync(process.execPath, [binPath, "--version"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(result.stderr).toBe("");
  });
});
