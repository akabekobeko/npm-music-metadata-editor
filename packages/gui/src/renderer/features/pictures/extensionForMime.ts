/**
 * Map of well-known image MIME types to the file-name extension shown in the
 * save dialog's "default name" field.
 */
const EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Pick a sensible export extension for a picture MIME type.
 *
 * Falls back to `"bin"` when the MIME type is unknown so the save dialog
 * never produces a name without an extension.
 *
 * @param mimeType - MIME type of the picture being exported.
 * @returns The extension (no leading dot).
 */
export const extensionForMime = (mimeType: string): string => EXTENSIONS[mimeType] ?? "bin";
