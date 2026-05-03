import type { AudioFormat } from "@akabeko/music-metadata-editor";

/**
 * Top-level sections of a `Track` that {@link ReadCommandOptions.include} /
 * {@link ReadCommandOptions.exclude} can target.
 *
 * `lyrics` is included even though it is optional on `Track`; selecting it
 * when absent is a no-op (the renderer simply skips it).
 */
export const TRACK_SECTIONS = [
  "audioFormat",
  "durationMs",
  "tag",
  "pictures",
  "chapters",
  "lyrics",
  "additionalFields",
  "warnings",
] as const;

/** A single allowed value for `--include` / `--exclude`. */
export type TrackSection = (typeof TRACK_SECTIONS)[number];

/**
 * Where the bytes / file path being read come from.
 */
export type ReadSource =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "stdin"; readonly format: AudioFormat };

/** How the resolved {@link Track} should be rendered. */
export type ReadOutputMode = "json" | "pretty" | "field";

/**
 * Parsed argv for the `read` command.
 *
 * Built by `parseReadOptions` from commander's raw output and consumed by
 * `handleRead` + `formatTrack`. Mutually exclusive combinations are rejected
 * during parsing; this type assumes a valid combination.
 */
export type ReadCommandOptions = {
  /** Source: file path, or stdin with a forced audio format. */
  readonly source: ReadSource;
  /** How to render the result. */
  readonly outputMode: ReadOutputMode;
  /** Field path (only when `outputMode === "field"`). */
  readonly field?: string;
  /** Sections to include in the JSON output. Mutually exclusive with `exclude`. */
  readonly include?: readonly TrackSection[];
  /** Sections to drop from the JSON output. Mutually exclusive with `include`. */
  readonly exclude?: readonly TrackSection[];
  /** When `true`, drop `warnings` from the structured output. */
  readonly noWarnings: boolean;
};
