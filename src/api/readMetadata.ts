import { createMmeError, isMmeError } from "../errors/mmeError.js";
import { getRegistration } from "../formats/registry.js";
import type { MetadataReadResult, ReadOptions } from "../types.js";
import { loadInput } from "./loadInput.js";
import { resolveFormat } from "./resolveFormat.js";

/**
 * Read metadata from an audio file.
 *
 * @param input - File path (`string`) or in-memory bytes (`Uint8Array`).
 * @param options - Optional reader hints (e.g. force a specific format).
 * @returns The parsed metadata, including detected format, common tag fields,
 *   pictures, chapters, and lyrics.
 * @throws {@link MmeError} (`unsupported-format`) when the format cannot be
 *   detected, or when no reader is registered for the detected format.
 *   Reader errors thrown as plain `Error` are wrapped into an `MmeError`
 *   (`invalid-tag`) with the original attached as `cause`.
 */
export const readMetadata = async (
  input: string | Uint8Array,
  options?: ReadOptions,
): Promise<MetadataReadResult> => {
  const { bytes, filePath } = await loadInput(input);
  const format = resolveFormat({ bytes, filePath, override: options?.format });
  const registration = getRegistration(format);
  if (registration?.read === undefined) {
    throw createMmeError({
      code: "unsupported-format",
      message: `no reader registered for "${format}"`,
    });
  }

  try {
    return await registration.read(bytes, options);
  } catch (error) {
    if (isMmeError(error)) {
      throw error;
    }

    throw createMmeError({
      code: "invalid-tag",
      message: `failed to read "${format}" metadata: ${(error as Error).message ?? String(error)}`,
      cause: error,
    });
  }
};
