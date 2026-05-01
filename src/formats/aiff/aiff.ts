import { registerFormat } from "../registry.js";
import { detectAiffSignature } from "./detectAiff.js";
import { readAiff } from "./readAiff/readAiff.js";
import { writeAiff } from "./writeAiff/writeAiff.js";

/**
 * Register the AIFF (`.aiff`, `.aif`, `.aifc`) format with the global
 * registry.
 *
 * Idempotent: calling it twice replaces the existing registration with the
 * same record, so importing this module from multiple locations is safe.
 */
export const registerAiffFormat = (): void =>
  registerFormat({
    format: "aiff",
    extensions: [".aiff", ".aif", ".aifc"],
    detectSignature: detectAiffSignature,
    read: readAiff,
    write: writeAiff,
  });
