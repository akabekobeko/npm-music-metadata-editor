import { registerFormat } from "../registry.js";
import { detectApeSignature } from "./detectApe.js";
import { readApe } from "./readApe/readApe.js";
import { writeApe } from "./writeApe/writeApe.js";

/**
 * Register the Monkey's Audio (`.ape`) format with the global registry.
 *
 * Idempotent: calling it twice replaces the existing registration with the
 * same record, so importing this module from multiple locations is safe.
 */
export const registerApeFormat = (): void =>
  registerFormat({
    format: "ape",
    extensions: [".ape"],
    detectSignature: detectApeSignature,
    read: readApe,
    write: writeApe,
  });
