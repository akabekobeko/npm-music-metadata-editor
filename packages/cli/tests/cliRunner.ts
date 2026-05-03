/**
 * Test-side surface for invoking the CLI in-process.
 *
 * `runCli` itself lives in `src/cli.ts` so that the bin shim can re-use the
 * exact same translation logic. This module just re-exports it under a
 * stable path so test files do not have to reach across the `src/` /
 * `tests/` boundary.
 */
export { runCli } from "../src/cli.js";
