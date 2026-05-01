import { createMmeError } from "../errors/mmeError.js";
import { detectFormat, SIGNATURE_PROBE_BYTES } from "../formats/detect.js";
import type { AudioFormat } from "../types.js";

/** Arguments for {@link resolveFormat}. */
type Args = {
  /** Raw bytes of the input. Only the first {@link SIGNATURE_PROBE_BYTES} are inspected. */
  bytes: Uint8Array;
  /** Original file path, when the caller passed one. Used for extension-based fallback. */
  filePath: string | undefined;
  /** Explicit format override from `ReadOptions` / `WriteOptions`. */
  override: AudioFormat | undefined;
};

/**
 * Decide which {@link AudioFormat} to use for the current operation.
 *
 * The explicit `override` short-circuits detection. Otherwise the leading bytes
 * are run through {@link detectFormat}, which combines signature and extension
 * checks (signature wins on conflict).
 *
 * @returns The resolved {@link AudioFormat}.
 * @throws {@link MmeError} (`unsupported-format`) when the format cannot be
 *   determined and no override was supplied.
 */
export const resolveFormat = ({ bytes, filePath, override }: Args): AudioFormat => {
  if (override !== undefined) {
    return override;
  }

  const header = bytes.subarray(0, Math.min(bytes.length, SIGNATURE_PROBE_BYTES));
  const detected = detectFormat({ header, filePath });
  if (detected === undefined) {
    throw createMmeError({
      code: "unsupported-format",
      message: "could not detect format from input",
    });
  }

  return detected;
};
