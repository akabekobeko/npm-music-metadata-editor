import type { AudioFormat, MetadataReadResult, ReadOptions, WriteOptions } from "../types.js";

/**
 * Read implementation for a given format.
 *
 * Implementations consume the entire input buffer and return the parsed metadata.
 *
 * @param input - Whole-file bytes to parse.
 * @param options - Optional reader hints forwarded from {@link readMetadata}.
 * @returns A promise resolving to the parsed metadata.
 */
export type FormatReader = (
  input: Uint8Array,
  options?: ReadOptions,
) => Promise<MetadataReadResult>;

/**
 * Write implementation for a given format.
 *
 * Implementations rebuild the file with `options.tag` merged in and return the result.
 *
 * @param input - Original file bytes; must not be mutated.
 * @param options - Tag fields to write plus optional writer hints.
 * @returns A promise resolving to the rebuilt file bytes.
 */
export type FormatWriter = (input: Uint8Array, options: WriteOptions) => Promise<Uint8Array>;

/**
 * Per-format registration record.
 *
 * Phase 1 only populates `extensions` / `detectSignature`; Phase 2 and later add the
 * `read` and `write` callbacks once the corresponding format is implemented.
 */
export type FormatRegistration = {
  /** Canonical format identifier. */
  format: AudioFormat;
  /** Extensions associated with the format, lowercase, including the leading dot (`".mp3"`). */
  extensions: readonly string[];
  /**
   * Inspect the leading bytes of a file and report whether they match this format's
   * signature. Implementations may peek up to 64 bytes.
   *
   * @param header - Leading bytes of the file to inspect.
   * @returns `true` when `header` matches this format's signature.
   */
  detectSignature: (header: Uint8Array) => boolean;
  /** Reader implementation, when available. */
  read?: FormatReader;
  /** Writer implementation, when available. */
  write?: FormatWriter;
};

/**
 * Module-level registry mapping each {@link AudioFormat} to its implementation.
 *
 * Insertion order is preserved by `Map`, which {@link getAllRegistrations} relies
 * on so that earlier-registered formats win on signature ties.
 */
const registrations = new Map<AudioFormat, FormatRegistration>();

/**
 * Register (or replace) a format implementation.
 *
 * Subsequent phases call this from format-specific entry points (e.g. `formats/mp3/mp3.ts`)
 * so that {@link getRegistration} / {@link getAllRegistrations} can locate them.
 *
 * @param registration - The format record to insert; replaces any existing entry with the same `format`.
 */
export const registerFormat = (registration: FormatRegistration): void => {
  registrations.set(registration.format, registration);
};

/**
 * Return the registration for a format, or `undefined` if none is registered.
 *
 * @param format - Format identifier to look up.
 * @returns The matching registration, or `undefined` when nothing is registered for `format`.
 */
export const getRegistration = (format: AudioFormat): FormatRegistration | undefined =>
  registrations.get(format);

/**
 * Return all currently registered formats.
 *
 * @returns Registrations in insertion order (the order earlier callers registered them).
 */
export const getAllRegistrations = (): readonly FormatRegistration[] =>
  Array.from(registrations.values());

/**
 * Remove every registration. Intended for tests; production code should not call this.
 */
export const clearRegistrations = (): void => {
  registrations.clear();
};
