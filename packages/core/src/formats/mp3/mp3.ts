import { registerFormat } from "../registry.js";
import { detectMp3Signature } from "./detectMp3.js";
import { readMp3 } from "./readMp3/readMp3.js";
import { writeMp3 } from "./writeMp3/writeMp3.js";

/**
 * Register the MP3 format with the global registry.
 *
 * Idempotent: calling it twice replaces the existing registration with the same
 * record, so importing this module from multiple locations is safe.
 */
export const registerMp3Format = (): void =>
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: detectMp3Signature,
    read: readMp3,
    write: writeMp3,
  });
