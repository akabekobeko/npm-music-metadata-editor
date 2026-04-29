import type { AudioFormat, MetadataReadResult, ReadOptions, WriteOptions } from "../types.js";

/**
 * Read implementation for a given format.
 *
 * Implementations consume the entire input buffer and return the parsed metadata.
 */
export type FormatReader = (
  input: Uint8Array,
  options?: ReadOptions,
) => Promise<MetadataReadResult>;

/**
 * Write implementation for a given format.
 *
 * Implementations rebuild the file with `options.tag` merged in and return the result.
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
   */
  detectSignature: (header: Uint8Array) => boolean;
  /** Reader implementation, when available. */
  read?: FormatReader;
  /** Writer implementation, when available. */
  write?: FormatWriter;
};

const registrations = new Map<AudioFormat, FormatRegistration>();

/**
 * Register (or replace) a format implementation.
 *
 * Subsequent phases call this from format-specific entry points (e.g. `formats/mp3/mp3.ts`)
 * so that {@link getRegistration} / {@link getAllRegistrations} can locate them.
 */
export const registerFormat = (registration: FormatRegistration): void => {
  registrations.set(registration.format, registration);
};

/**
 * Return the registration for a format, or `undefined` if none is registered.
 */
export const getRegistration = (format: AudioFormat): FormatRegistration | undefined =>
  registrations.get(format);

/**
 * Return all currently registered formats.
 */
export const getAllRegistrations = (): readonly FormatRegistration[] =>
  Array.from(registrations.values());

/**
 * Remove every registration. Intended for tests; production code should not call this.
 */
export const clearRegistrations = (): void => {
  registrations.clear();
};
