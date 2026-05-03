import { writeFile } from "node:fs/promises";
import {
  loadTrack,
  type Track,
  type WriteOptions,
  writeMetadata,
} from "@akabeko/music-metadata-editor";
import type { CliContext } from "../../types.js";
import { collectStdin } from "../read/collectStdin.js";
import { formatJson } from "../read/formatTrack/formatJson.js";
import { TRACK_SECTIONS, type TrackSection } from "../read/types.js";
import { applyOverrides } from "./applyOverrides.js";
import { loadTagFile } from "./loadTagFile.js";
import { parseTagOverrides } from "./parseTagOverrides.js";
import type { WriteCliRawOptions, WriteCommandOptions } from "./types.js";
import { writeAtomic } from "./writeAtomic.js";

/** Arguments accepted by {@link handleWrite}. */
type Args = {
  /** Validated mode-level options from `parseWriteOptions`. */
  readonly options: WriteCommandOptions;
  /** Raw commander options bag — needed for the tag-mutation parse. */
  readonly raw: WriteCliRawOptions;
  /** Side-channel context (currently the stdin iterable). */
  readonly context: CliContext;
};

/** Outcome of running `handleWrite`. */
export type HandleWriteResult = {
  /** Stdout payload as a string (used for `--dry-run` JSON / pretty). */
  readonly stdout: string;
  /** Stdout payload as raw bytes (used for `--stdin --output -`). */
  readonly stdoutBytes?: Uint8Array;
  /** Stderr payload (status / warning lines). */
  readonly stderr: string;
};

/** Section mask covering every `Track` section, used by the `--dry-run` JSON renderer. */
const FULL_TRACK_MASK: ReadonlySet<TrackSection> = new Set<TrackSection>(TRACK_SECTIONS);

/**
 * Run the `mme write` subcommand.
 *
 * Workflow (file mode):
 *
 * 1. `loadTrack(filePath)` to materialise the current `Track`.
 * 2. Resolve `--tag-file` content (file or stdin).
 * 3. Build a {@link TagOverrides} via `parseTagOverrides`.
 * 4. Compose the next `Track` via `applyOverrides`.
 * 5. `--dry-run` → JSON-render the next `Track` to stdout. Otherwise rebuild
 *    the bytes via `writeMetadata` and persist them — atomic by default
 *    (`tmp + rename`), in-place when `--no-atomic` is set.
 *
 * Workflow (stream mode): drain stdin, hand the bytes + assignments straight
 * to `writeMetadata`, and route the result to `--output <path>` or stdout.
 *
 * @returns Buffered stdout / stderr (and optional raw stdout bytes).
 */
export const handleWrite = async ({ options, raw, context }: Args): Promise<HandleWriteResult> => {
  if (options.source.kind === "stdin") {
    return runStreamMode({ options, raw, context });
  }

  return runFileMode({ options, raw, context });
};

/** Arguments shared by the file / stream sub-handlers. */
type RunArgs = Args;

/**
 * Execute the file branch of {@link handleWrite}.
 *
 * @param args - Parent {@link Args}.
 * @returns Buffered output payload.
 */
const runFileMode = async ({ options, raw, context }: RunArgs): Promise<HandleWriteResult> => {
  if (options.source.kind !== "file") {
    throw new Error("runFileMode: expected file source");
  }

  const sourcePath = options.source.path;
  const track = await loadTrack(sourcePath);
  const tagFile = await loadTagFile({ path: raw.tagFile, stdin: context.stdin });
  const overrides = parseTagOverrides({ opts: raw, tagFile });
  const nextTag = applyOverrides({ current: track.tag, overrides });
  const nextTrack: Track = { ...track, tag: nextTag };

  if (options.dryRun) {
    const payload = formatJson({ track: nextTrack, mask: FULL_TRACK_MASK });
    return {
      stdout: `${JSON.stringify(payload, null, 2)}\n`,
      stderr: "",
    };
  }

  const targetPath = options.output.kind === "path" ? options.output.path : sourcePath;
  const bytes = await writeMetadata(sourcePath, projectWriteOptions(nextTrack));
  if (options.atomic) {
    await writeAtomic(targetPath, bytes);
  } else {
    await writeFile(targetPath, bytes);
  }

  return { stdout: "", stderr: `[mme] wrote: ${targetPath}\n` };
};

/**
 * Execute the stream branch of {@link handleWrite}.
 *
 * @param args - Parent {@link Args}.
 * @returns Buffered output payload.
 */
const runStreamMode = async ({ options, raw, context }: RunArgs): Promise<HandleWriteResult> => {
  if (options.source.kind !== "stdin") {
    throw new Error("runStreamMode: expected stdin source");
  }

  const tagFile = await loadTagFile({
    path: raw.tagFile === "-" ? undefined : raw.tagFile,
    stdin: context.stdin,
  });
  const overrides = parseTagOverrides({ opts: raw, tagFile });
  const inputBytes = await collectStdin(context.stdin);
  const outputBytes = await writeMetadata(inputBytes, {
    tag: overrides.assign,
    format: options.source.format,
  });

  if (options.output.kind === "stdout") {
    return { stdout: "", stdoutBytes: outputBytes, stderr: "[mme] wrote: <stdout>\n" };
  }

  if (options.output.kind === "path") {
    if (options.atomic) {
      await writeAtomic(options.output.path, outputBytes);
    } else {
      await writeFile(options.output.path, outputBytes);
    }

    return { stdout: "", stderr: `[mme] wrote: ${options.output.path}\n` };
  }

  throw new Error("runStreamMode: stream mode requires --output");
};

/**
 * Project a `Track` into the `WriteOptions` accepted by `writeMetadata`.
 *
 * Mirrors core's own internal projection inside `saveTrack`, but re-stated
 * here so the CLI can hand the same shape to `writeMetadata` directly when
 * the atomic write path needs the raw bytes back instead of a side-effecting
 * disk write.
 *
 * @param track - The post-overrides track to persist.
 * @returns The matching `WriteOptions`.
 */
const projectWriteOptions = (track: Track): WriteOptions => ({
  tag: track.tag,
  pictures: track.pictures,
  chapters: track.chapters,
  ...(track.lyrics === undefined ? {} : { lyrics: track.lyrics }),
  format: track.audioFormat,
});
