import { writeJson } from "./writeJson.js";

/**
 * Write a value to stdout in a human-readable form.
 *
 * Phase 1 keeps this as a JSON fallback so that the rest of the pipeline can
 * already depend on the function. Phase 2 replaces the body with a TUI-style
 * table renderer; callers are expected to keep using this function unchanged.
 *
 * @param value - Any value to render for human consumption.
 */
export const writePretty = (value: unknown): void => writeJson(value);
