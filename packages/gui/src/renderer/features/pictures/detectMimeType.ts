/**
 * Map of leading magic-number bytes to MIME type.
 *
 * Order matters only when prefixes overlap; the entries below are mutually
 * exclusive on the first 12 bytes so a linear scan is enough.
 */
const SIGNATURES: readonly {
  readonly mime: string;
  readonly bytes: readonly (number | null)[];
}[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  {
    mime: "image/webp",
    // RIFF....WEBP — bytes 4..7 are the file size (variable) and ignored via `null`.
    bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
];

/**
 * Map of file-name extensions to a fallback MIME type.
 *
 * Used when {@link sniffMimeType} returns `undefined` (no recognized magic
 * number) so the picture still gets a sensible MIME instead of an empty
 * string.
 */
const EXTENSION_FALLBACK: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Probe the leading bytes of a buffer for a known image signature.
 *
 * Returns `undefined` when no signature matches — callers can then fall back
 * to extension-based heuristics or `application/octet-stream`.
 *
 * @param bytes - Raw picture bytes (only the first dozen are inspected).
 * @returns The detected MIME type, or `undefined`.
 */
export const sniffMimeType = (bytes: Uint8Array): string | undefined => {
  for (const { mime, bytes: signature } of SIGNATURES) {
    if (bytes.length < signature.length) {
      continue;
    }

    let matched = true;
    for (let i = 0; i < signature.length; i++) {
      const expected = signature[i];
      if (expected === null) {
        continue;
      }

      if (bytes[i] !== expected) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return mime;
    }
  }

  return undefined;
};

/**
 * Pull the lower-cased extension from a file name.
 *
 * Returns `undefined` when the name has no `.` or ends in one (no extension).
 *
 * @param fileName - File name (typically from a `File` instance).
 * @returns The extension without the leading dot, or `undefined`.
 */
const extensionOf = (fileName: string): string | undefined => {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) {
    return undefined;
  }

  return fileName.slice(dot + 1).toLowerCase();
};

type Args = {
  /** File name used for the extension fallback. */
  readonly fileName: string;
  /** Raw bytes inspected for a magic-number match. */
  readonly bytes: Uint8Array;
};

/**
 * Decide the MIME type for a picture using magic-number sniffing first and
 * the file extension as a last resort.
 *
 * Magic-number wins over the extension: a `.png` file whose bytes are
 * actually JPEG returns `"image/jpeg"`. When neither source produces a
 * verdict the function returns `"application/octet-stream"` so downstream
 * consumers always receive a non-empty MIME string.
 *
 * @returns A MIME type string.
 */
export const detectMimeType = ({ fileName, bytes }: Args): string => {
  const sniffed = sniffMimeType(bytes);
  if (sniffed !== undefined) {
    return sniffed;
  }

  const ext = extensionOf(fileName);
  if (ext !== undefined) {
    const fallback = EXTENSION_FALLBACK[ext];
    if (fallback !== undefined) {
      return fallback;
    }
  }

  return "application/octet-stream";
};
