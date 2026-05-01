import { readFileBuffer } from "../io/file.js";

/**
 * Result of {@link loadInput}: raw bytes plus the originating path (when any).
 */
export type LoadedInput = {
  /** Whole-file bytes ready for parsing. */
  bytes: Uint8Array;
  /** Original file path, or `undefined` when bytes were passed in directly. */
  filePath: string | undefined;
};

/**
 * Normalize the public-API input (path or bytes) into raw bytes plus an
 * optional file path.
 *
 * String inputs are read from disk; the path is preserved so downstream
 * extension-based detection still works. Buffer inputs are passed through
 * with `filePath` left as `undefined`.
 *
 * @param input - File path (`string`) to read from disk, or pre-loaded bytes.
 * @returns The bytes plus the originating path (if any).
 */
export const loadInput = async (input: string | Uint8Array): Promise<LoadedInput> => {
  if (typeof input === "string") {
    return { bytes: await readFileBuffer(input), filePath: input };
  }

  return { bytes: input, filePath: undefined };
};
