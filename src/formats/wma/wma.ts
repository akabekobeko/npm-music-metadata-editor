import { registerFormat } from "../registry.js";
import { detectWmaSignature } from "./detectWma.js";
import { readWma } from "./readWma/readWma.js";
import { writeWma } from "./writeWma/writeWma.js";

/**
 * Register the WMA / ASF (`.wma`, `.asf`) format with the global registry.
 *
 * Idempotent: calling it twice replaces the existing registration with the
 * same record, so importing this module from multiple locations is safe.
 */
export const registerWmaFormat = (): void =>
  registerFormat({
    format: "wma",
    extensions: [".wma", ".asf"],
    detectSignature: detectWmaSignature,
    read: readWma,
    write: writeWma,
  });
