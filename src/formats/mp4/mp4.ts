import { registerFormat } from "../registry.js";
import { detectMp4Signature } from "./detectMp4.js";
import { readMp4 } from "./readMp4.js";
import { writeMp4 } from "./writeMp4.js";

/**
 * Register the MP4 / M4A format with the global registry.
 *
 * The same registration covers `.mp4`, `.m4a`, `.m4b` and `.m4v`: format
 * resolution at read time inspects the `ftyp` brand list to decide whether
 * the public `audioFormat` is `"m4a"` or `"mp4"`.
 *
 * Idempotent: calling it twice replaces the existing registration with the
 * same record.
 */
export const registerMp4Format = (): void => {
  registerFormat({
    format: "mp4",
    extensions: [".mp4", ".m4v"],
    detectSignature: detectMp4Signature,
    read: readMp4,
    write: writeMp4,
  });
  registerFormat({
    format: "m4a",
    extensions: [".m4a", ".m4b"],
    detectSignature: detectMp4Signature,
    read: readMp4,
    write: writeMp4,
  });
};
