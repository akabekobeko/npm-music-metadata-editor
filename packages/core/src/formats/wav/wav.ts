import { registerFormat } from "../registry.js";
import { detectWavSignature } from "./detectWav.js";
import { readWav } from "./readWav/readWav.js";
import { writeWav } from "./writeWav/writeWav.js";

/**
 * Register the RIFF/WAV (`.wav`) format with the global registry.
 *
 * Idempotent: calling it twice replaces the existing registration with the
 * same record, so importing this module from multiple locations is safe.
 */
export const registerWavFormat = (): void =>
  registerFormat({
    format: "wav",
    extensions: [".wav", ".wave"],
    detectSignature: detectWavSignature,
    read: readWav,
    write: writeWav,
  });
