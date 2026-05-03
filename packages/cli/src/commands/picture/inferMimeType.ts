import { EXTENSION_BY_MIME, MIME_BY_EXTENSION } from "./constants.js";

/**
 * Infer the MIME type of a picture from its filename extension.
 *
 * Used by `mme picture set` when `--mime` is omitted. Returns `undefined`
 * when the extension is missing or unrecognised so the caller can raise a
 * usage error pointing at `--mime`.
 *
 * @param path - Filesystem path or filename whose extension is inspected.
 * @returns The MIME type, or `undefined` when no mapping applies.
 */
export const inferMimeType = (path: string): string | undefined => {
  const dot = path.lastIndexOf(".");
  if (dot < 0) {
    return undefined;
  }

  return MIME_BY_EXTENSION[path.slice(dot).toLowerCase()];
};

/**
 * Look up the canonical filename extension for a known image MIME type.
 *
 * Used by `mme picture extract --auto-extension` to derive the suffix
 * appended onto the user's output path. Returns `undefined` for MIMEs the
 * CLI does not have a stable extension mapping for (the caller leaves the
 * path unchanged in that case).
 *
 * @param mime - MIME type (e.g. `image/jpeg`).
 * @returns The leading-dot extension (e.g. `.jpg`), or `undefined`.
 */
export const extensionForMime = (mime: string): string | undefined => EXTENSION_BY_MIME[mime];
