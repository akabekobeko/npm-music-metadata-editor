import { detectFormat, SIGNATURE_PROBE_BYTES } from "./formats/detect.js";
import { registerFlacFormat } from "./formats/flac/flac.js";
import { registerMp3Format } from "./formats/mp3/mp3.js";
import { registerMp4Format } from "./formats/mp4/mp4.js";
import { getRegistration } from "./formats/registry.js";
import { readFileBuffer } from "./io/file.js";
import type { AudioFormat, MetadataReadResult, ReadOptions, WriteOptions } from "./types.js";

// Register all built-in formats on module load. Subsequent phases append more.
registerMp3Format();
registerFlacFormat();
registerMp4Format();

export type {
  AudioFormat,
  ChapterInfo,
  LyricsInfo,
  MetadataReadResult,
  PictureInfo,
  PictureKindValue,
  ReadOptions,
  SynchronizedLyric,
  TagData,
  WriteOptions,
} from "./types.js";
export { PictureKind } from "./types.js";

/**
 * Read metadata from an audio file.
 *
 * @param input - File path (`string`) or in-memory bytes (`Uint8Array`).
 * @param options - Optional reader hints (e.g. force a specific format).
 * @returns The parsed metadata, including detected format, common tag fields,
 *   pictures, chapters, and lyrics.
 * @throws when the format cannot be detected, or when no reader is registered for
 *   the detected format (the latter applies until subsequent phases land their
 *   format implementations).
 */
export const readMetadata = async (
  input: string | Uint8Array,
  options?: ReadOptions,
): Promise<MetadataReadResult> => {
  const { bytes, filePath } = await loadInput(input);
  const format = resolveFormat({ bytes, filePath, override: options?.format });
  const registration = getRegistration(format);
  if (registration?.read === undefined) {
    throw new Error(`unsupported format: no reader registered for "${format}"`);
  }

  return registration.read(bytes, options);
};

/**
 * Write metadata back to an audio file.
 *
 * @param input - File path (`string`) or in-memory bytes (`Uint8Array`).
 * @param options - Tag fields to write plus optional writer hints (e.g. force a
 *   specific format). The `tag` property is required.
 * @returns The rebuilt file bytes. Callers are responsible for persisting them.
 * @throws when the format cannot be detected, or when no writer is registered for
 *   the detected format.
 */
export const writeMetadata = async (
  input: string | Uint8Array,
  options: WriteOptions,
): Promise<Uint8Array> => {
  const { bytes, filePath } = await loadInput(input);
  const format = resolveFormat({ bytes, filePath, override: options.format });
  const registration = getRegistration(format);
  if (registration?.write === undefined) {
    throw new Error(`unsupported format: no writer registered for "${format}"`);
  }

  return registration.write(bytes, options);
};

/**
 * Normalize the public-API input into raw bytes plus an optional file path.
 *
 * String inputs are read from disk (the path is preserved so that downstream
 * extension-based detection still works); buffer inputs are passed through
 * with `filePath` left as `undefined`.
 *
 * @param input - File path (`string`) to read from disk, or pre-loaded bytes.
 * @returns The bytes ready for parsing, plus the originating path (if any).
 */
const loadInput = async (
  input: string | Uint8Array,
): Promise<{ bytes: Uint8Array; filePath: string | undefined }> => {
  if (typeof input === "string") {
    return { bytes: await readFileBuffer(input), filePath: input };
  }

  return { bytes: input, filePath: undefined };
};

/** Arguments for {@link resolveFormat}. */
type Args = {
  /** Raw bytes of the input. Only the first {@link SIGNATURE_PROBE_BYTES} are inspected. */
  bytes: Uint8Array;
  /** Original file path, when the caller passed one. Used for extension-based fallback. */
  filePath: string | undefined;
  /** Explicit format override from {@link ReadOptions} / {@link WriteOptions}. */
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
 * @throws when the format cannot be determined and no override was supplied.
 */
const resolveFormat = ({ bytes, filePath, override }: Args): AudioFormat => {
  if (override !== undefined) {
    return override;
  }

  const header = bytes.subarray(0, Math.min(bytes.length, SIGNATURE_PROBE_BYTES));
  const detected = detectFormat({ header, filePath });
  if (detected === undefined) {
    throw new Error("unsupported format: could not detect format from input");
  }

  return detected;
};
