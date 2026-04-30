import { registerFormat } from "../registry.js";
import { detectFlacSignature } from "./detectFlac.js";
import { readFlac } from "./readFlac.js";
import { writeFlac } from "./writeFlac.js";

/**
 * Register the FLAC format with the global registry.
 *
 * Idempotent: calling it twice replaces the existing registration with the same
 * record, so importing this module from multiple locations is safe.
 */
export const registerFlacFormat = (): void => {
  registerFormat({
    format: "flac",
    extensions: [".flac"],
    detectSignature: detectFlacSignature,
    read: readFlac,
    write: writeFlac,
  });
};
