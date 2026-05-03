import type { Track } from "@akabeko/music-metadata-editor";
import { getField } from "./getField.js";
import { sanitizePictures } from "./sanitizePictures.js";

/** Result of {@link formatField}, discriminated on outcome. */
export type FormatFieldResult =
  | { readonly kind: "value"; readonly text: string }
  | { readonly kind: "missing"; readonly path: string };

/** Arguments accepted by {@link formatField}. */
type Args = {
  /** Source `Track`. */
  readonly track: Track;
  /** Raw `--field` value. */
  readonly path: string;
};

/**
 * Render the value at `path` for `--field` mode.
 *
 * Scalars become plain strings (no JSON quoting) so the value can be piped
 * straight into another tool. Arrays and objects fall back to JSON because
 * stripping the structure loses information; the same applies to the
 * `pictures` field, whose `data` is replaced with `byteLength` before JSON
 * encoding.
 *
 * @returns A discriminated result. `kind: "missing"` carries the original
 *   path so the caller can format the error message uniformly.
 */
export const formatField = ({ track, path }: Args): FormatFieldResult => {
  const lookup = getField(track, path);
  if (!lookup.found) {
    return { kind: "missing", path };
  }

  const value = sanitizeForFieldOutput(lookup.value);
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return { kind: "value", text: `${JSON.stringify(value, null, 2)}\n` };
  }

  return { kind: "value", text: `${String(value)}\n` };
};

/**
 * Replace `pictures[].data` with `byteLength` before rendering, regardless of
 * whether the user asked for the whole `pictures` array or a nested entry.
 *
 * @param value - Raw value pulled from the `Track`.
 * @returns The same value, with picture binaries scrubbed out.
 */
const sanitizeForFieldOutput = (value: unknown): unknown => {
  if (Array.isArray(value) && value.every((entry) => isPictureLike(entry))) {
    return sanitizePictures(value as never);
  }

  if (isPictureLike(value)) {
    return sanitizePictures([value as never])[0];
  }

  return value;
};

/**
 * Lightweight structural check for `PictureInfo`-shaped values.
 *
 * Used to detect picture entries when the user requests them via `--field`
 * so we can scrub the binary `data` before rendering. We stop short of
 * importing core's `PictureInfo` runtime helper because there is none — the
 * shape is what we need to recognise.
 *
 * @param value - Arbitrary value pulled from a `Track`.
 * @returns `true` when `value` is shaped like a `PictureInfo`.
 */
const isPictureLike = (value: unknown): value is { readonly data: Uint8Array } => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const candidate = value as { mimeType?: unknown; kind?: unknown; data?: unknown };
  return (
    typeof candidate.mimeType === "string" &&
    typeof candidate.kind === "number" &&
    candidate.data instanceof Uint8Array
  );
};
