import type { Track, Warning } from "@akabeko/music-metadata-editor";
import type { TrackSection } from "../types.js";

/** Picture entry as it appears in the JSON / pretty output (data is dropped). */
export type SanitizedPicture = {
  /** MIME type of the picture (`"image/jpeg"`, `"image/png"`, ...). */
  readonly mimeType: string;
  /** Picture role / kind (numeric, mirrors `PictureKind`). */
  readonly kind: number;
  /** Free-form description (often empty). */
  readonly description?: string;
  /** Byte length of the picture body. */
  readonly byteLength: number;
};

/**
 * `Track` reshaped for serialization: `pictures[].data` replaced with
 * `byteLength`. Callers that need the raw bytes use `mme picture extract`.
 */
export type SerializableTrack = {
  readonly audioFormat: Track["audioFormat"];
  readonly durationMs?: number;
  readonly tag: Track["tag"];
  readonly pictures: readonly SanitizedPicture[];
  readonly chapters: Track["chapters"];
  readonly lyrics?: Track["lyrics"];
  readonly additionalFields: Track["additionalFields"];
  readonly warnings: readonly Warning[];
};

/**
 * Result of {@link formatTrack}, discriminated on output mode.
 *
 * `kind === "json"` carries a Plain Object the caller serializes with
 * `JSON.stringify`. `kind === "pretty"` carries the final text. `kind ===
 * "field"` carries either the stringified scalar value or, for array fields,
 * the JSON form (so the caller can still write it raw without quoting).
 */
export type FormatTrackResult =
  | { readonly kind: "json"; readonly payload: SerializableTrack }
  | { readonly kind: "pretty"; readonly text: string }
  | { readonly kind: "field"; readonly value: string };

/** Selection mask resolved from `--include` / `--exclude` / `--no-warnings`. */
export type SectionMask = ReadonlySet<TrackSection>;
