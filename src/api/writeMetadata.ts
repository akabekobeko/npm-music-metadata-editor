import { createMmeError, isMmeError } from "../errors/mmeError.js";
import { getRegistration } from "../formats/registry.js";
import type { WriteOptions } from "../types.js";
import { loadInput } from "./loadInput.js";
import { resolveFormat } from "./resolveFormat.js";

/**
 * Write metadata back to an audio file.
 *
 * @param input - File path (`string`) or in-memory bytes (`Uint8Array`).
 * @param options - Tag fields to write plus optional writer hints (e.g. force a
 *   specific format). The `tag` property is required.
 * @returns The rebuilt file bytes. Callers are responsible for persisting them.
 * @throws {@link MmeError} (`unsupported-format`) when the format cannot be
 *   detected, or when no writer is registered for the detected format.
 *   Writer errors thrown as plain `Error` are wrapped into an `MmeError`
 *   (`invalid-tag`) with the original attached as `cause`.
 */
export const writeMetadata = async (
  input: string | Uint8Array,
  options: WriteOptions,
): Promise<Uint8Array> => {
  const { bytes, filePath } = await loadInput(input);
  const format = resolveFormat({ bytes, filePath, override: options.format });
  const registration = getRegistration(format);
  if (registration?.write === undefined) {
    throw createMmeError({
      code: "unsupported-format",
      message: `no writer registered for "${format}"`,
    });
  }

  try {
    return await registration.write(bytes, options);
  } catch (error) {
    if (isMmeError(error)) {
      throw error;
    }

    throw createMmeError({
      code: "invalid-tag",
      message: `failed to write "${format}" metadata: ${(error as Error).message ?? String(error)}`,
      cause: error,
    });
  }
};
