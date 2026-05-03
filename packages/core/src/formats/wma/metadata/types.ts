import type { ASF_DESCRIPTOR_TYPE } from "../constants.js";

/**
 * The five fixed fields carried by the Content Description Object.
 *
 * Each value is plain text that, on disk, is stored as a null-terminated
 * UTF-16LE string preceded by its length in bytes.
 */
export type ContentDescription = {
  /** `WM/TITLE`. */
  title: string;
  /** `WM/AUTHOR`. */
  author: string;
  /** `WM/COPYRIGHT`. */
  copyright: string;
  /** `WM/DESCRIPTION`. */
  description: string;
  /** `WM/RATING`. */
  rating: string;
};

/** Numeric value drawn from {@link ASF_DESCRIPTOR_TYPE}. */
export type AsfDescriptorType = (typeof ASF_DESCRIPTOR_TYPE)[keyof typeof ASF_DESCRIPTOR_TYPE];

/**
 * One entry in the Extended Content Description Object.
 *
 * The reader keeps `value` in a typed shape so the writer can re-emit the
 * original bytes verbatim — including descriptors we don't surface on
 * {@link TagData}, which round-trip via {@link rawValue}.
 */
export type ExtendedDescriptor = {
  /** Descriptor name (`WM/AlbumTitle`, `WM/Genre`, etc.). */
  name: string;
  /** ASF type code. */
  type: AsfDescriptorType;
  /**
   * Decoded value, normalised by `type`:
   * - `UnicodeString` → trimmed string (terminator removed)
   * - `Bool` → boolean
   * - `Dword` / `Word` → number
   * - `Qword` → bigint
   * - `Guid` → canonical GUID string
   * - `ByteArray` → `Uint8Array`
   */
  value: string | number | bigint | boolean | Uint8Array;
  /**
   * Raw bytes of the value as they appeared on disk (after the descriptor
   * header). Preserved so the writer can round-trip values it doesn't
   * understand without losing fidelity.
   */
  rawValue: Uint8Array;
};
