import { extname } from "node:path";
import type { AudioFormat } from "../types.js";
import { getAllRegistrations, getRegistration } from "./registry.js";

/**
 * Number of leading bytes to inspect when matching a format signature.
 *
 * 64 bytes is generous: even ID3v2 (10-byte header) + ftyp atom (8-byte size + `ftyp`
 * marker + 8-byte brand) fit comfortably.
 */
export const SIGNATURE_PROBE_BYTES = 64;

/**
 * Detect the format from a file path's extension.
 *
 * @returns The matching format, or `undefined` when the extension is unknown or
 *   when no registered format claims it.
 */
export const detectFormatByExtension = (filePath: string): AudioFormat | undefined => {
  const ext = extname(filePath).toLowerCase();
  if (ext === "") {
    return undefined;
  }
  for (const reg of getAllRegistrations()) {
    if (reg.extensions.includes(ext)) {
      return reg.format;
    }
  }
  return undefined;
};

/**
 * Detect the format by examining the leading bytes of the file.
 *
 * The first registered format whose `detectSignature` returns `true` wins. Registration
 * order therefore matters when two formats could both match — the first phase to
 * register a format claims its signature.
 */
export const detectFormatBySignature = (header: Uint8Array): AudioFormat | undefined => {
  const probe = header.subarray(0, Math.min(header.length, SIGNATURE_PROBE_BYTES));
  for (const reg of getAllRegistrations()) {
    if (reg.detectSignature(probe)) {
      return reg.format;
    }
  }
  return undefined;
};

/**
 * Input accepted by {@link detectFormat}.
 *
 * Either pass a file path along with the leading bytes (preferred — both extension and
 * signature checks run), or pass only the bytes (signature-only detection).
 */
export type DetectFormatInput = {
  /** Optional file path — used to consult extension-based detection. */
  filePath?: string;
  /** Leading bytes of the file. At least `SIGNATURE_PROBE_BYTES` are recommended. */
  header: Uint8Array;
};

/**
 * Resolve the audio format using both the file extension (when available) and the
 * leading bytes of the file.
 *
 * Signature matches take precedence over extension matches: the extension is only
 * trusted when no registered signature matches. This protects against renamed files.
 */
export const detectFormat = (input: DetectFormatInput): AudioFormat | undefined => {
  const bySignature = detectFormatBySignature(input.header);
  if (bySignature !== undefined) {
    return bySignature;
  }
  if (input.filePath !== undefined) {
    const byExt = detectFormatByExtension(input.filePath);
    // Only accept the extension hint when the format is actually registered.
    if (byExt !== undefined && getRegistration(byExt) !== undefined) {
      return byExt;
    }
  }
  return undefined;
};
