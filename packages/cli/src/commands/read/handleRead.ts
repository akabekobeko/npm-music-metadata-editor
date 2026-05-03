import { loadTrack, readMetadata, type Track } from "@akabeko/music-metadata-editor";
import type { CliContext } from "../../types.js";
import { collectStdin } from "./collectStdin.js";
import { formatTrack } from "./formatTrack/formatTrack.js";
import type { ReadCommandOptions } from "./types.js";

/** Arguments accepted by {@link handleRead}. */
type Args = {
  /** Validated read-command options (see `parseReadOptions`). */
  readonly options: ReadCommandOptions;
  /** Side-channel context (currently the stdin iterable). */
  readonly context: CliContext;
};

/** Outcome of running `handleRead`. */
export type HandleReadResult = {
  /** Stdout payload (may be empty). */
  readonly stdout: string;
  /** Stderr payload (warning notifications, never errors). */
  readonly stderr: string;
};

/**
 * Mutually-soft-exclusive flag applied at the same time as `--field`.
 *
 * `--field` wins (the user already narrowed to a single value); the
 * suppressed flags surface as a stderr `[warn] ...` line. This is a
 * notification, not an error — the rendered value still goes to stdout.
 */
const FIELD_INCOMPATIBLE_FLAGS: readonly { flag: string; key: keyof ReadCommandOptions }[] = [
  { flag: "--include", key: "include" },
  { flag: "--exclude", key: "exclude" },
];

/**
 * Run the `mme read` subcommand.
 *
 * Workflow:
 *
 * 1. Acquire the source `Track` (file → `loadTrack`, stdin → drain +
 *    `readMetadata` + lift into the same shape).
 * 2. Hand off to `formatTrack` for the chosen output mode. A missing
 *    `--field` path raises a tagged error here that the bin / runCli
 *    layer translates into exit code `1` via `formatMmeError`.
 * 3. Marshal the rendered payload + any `warnings` notifications into
 *    stdout / stderr buffers.
 *
 * The function returns buffers instead of writing directly so the caller
 * can map the result to `process.stdout` / `process.stderr`. Tests can
 * assert on the buffers without touching the process streams.
 *
 * @returns Buffered stdout / stderr.
 * @throws `Error` when `--field` does not resolve (handled by the bin /
 *   runCli `catch` to surface as exit code `1`).
 */
export const handleRead = async ({ options, context }: Args): Promise<HandleReadResult> => {
  const track = await loadTrackFromOptions({ options, context });
  const stderrLines: string[] = [];

  if (options.outputMode === "field") {
    FIELD_INCOMPATIBLE_FLAGS.forEach(({ flag, key }) => {
      if (options[key] !== undefined) {
        stderrLines.push(`[warn] ${flag} is ignored when --field is set`);
      }
    });

    if (!options.noWarnings) {
      track.warnings.forEach((warning) => {
        stderrLines.push(`[warn] ${warning.message}`);
      });
    }
  }

  const result = formatTrack({ track, options });
  if (result.kind === "json") {
    return {
      stdout: `${JSON.stringify(result.payload, null, 2)}\n`,
      stderr: joinLines(stderrLines),
    };
  }

  if (result.kind === "pretty") {
    return { stdout: result.text, stderr: joinLines(stderrLines) };
  }

  return { stdout: result.value, stderr: joinLines(stderrLines) };
};

/**
 * Resolve the `Track` for the requested source.
 *
 * @param args - Same args object as the parent {@link handleRead}.
 * @returns The loaded `Track`.
 */
const loadTrackFromOptions = async ({ options, context }: Args): Promise<Track> => {
  if (options.source.kind === "file") {
    return loadTrack(options.source.path);
  }

  const bytes = await collectStdin(context.stdin);
  const result = await readMetadata(bytes, { format: options.source.format });
  return {
    audioFormat: result.audioFormat,
    ...(result.durationMs === undefined ? {} : { durationMs: result.durationMs }),
    tag: result.tag,
    pictures: result.pictures,
    chapters: result.chapters,
    ...(result.lyrics === undefined ? {} : { lyrics: result.lyrics }),
    additionalFields: result.additionalFields ?? {},
    warnings: result.warnings ?? [],
  };
};

/**
 * Join collected stderr lines, appending a trailing newline only when there
 * is at least one line so empty buffers stay empty.
 *
 * @param lines - Lines without their terminating newline.
 * @returns A single string suitable for direct `process.stderr.write`.
 */
const joinLines = (lines: readonly string[]): string =>
  lines.length === 0 ? "" : `${lines.join("\n")}\n`;
