import { writeJson } from "./writeJson.js";

/**
 * Write a value to stdout in a human-readable form.
 *
 * Per-command formatters (e.g. `commands/read/formatTrack/formatPretty.ts`)
 * own the actual `--pretty` rendering. This helper is kept as a generic
 * fallback that simply delegates to the JSON writer.
 *
 * @param value - Any value to render for human consumption.
 */
export const writePretty = (value: unknown): void => writeJson(value);
