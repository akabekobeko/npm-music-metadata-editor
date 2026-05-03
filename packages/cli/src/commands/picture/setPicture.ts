import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import {
  loadTrack,
  type PictureInfo,
  PictureKind,
  type PictureKindValue,
} from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { collectStdin } from "../read/collectStdin.js";
import { saveModifiedTrack } from "../saveModifiedTrack.js";
import { inferMimeType } from "./inferMimeType.js";
import { parseKind } from "./parseKind.js";

/** Arguments accepted by {@link setPicture}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** Image source path; `-` reads bytes from stdin. */
  readonly input: string;
  /** Optional `--kind` (raw kebab-case). Defaults to `cover-front`. */
  readonly kind?: string;
  /** Optional `--mime` override. Inferred from the input filename otherwise. */
  readonly mime?: string;
  /** Optional `--description` for the embedded `PictureInfo`. */
  readonly description?: string;
  /**
   * When `true`, replace existing pictures wholesale (or, when paired with
   * `--kind`, only those matching the same kind).
   */
  readonly replace: boolean;
  /** Stdin iterable used when `input === "-"`. */
  readonly stdin: AsyncIterable<Uint8Array>;
};

/** Outcome of running `setPicture`. */
export type SetPictureResult = {
  /** Stdout payload (always empty — `set` only emits stderr status lines). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/**
 * Throw a commander usage error so the bin layer maps it to exit code `2`.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Resolve the MIME type for the picture being added.
 *
 * Precedence: explicit `--mime` wins; otherwise the input filename extension
 * is consulted via {@link inferMimeType}; failing that the user is asked to
 * pass `--mime` explicitly. Stdin sources cannot be inferred from a name and
 * therefore require `--mime`.
 *
 * @param args - The command arguments.
 * @returns The resolved MIME string.
 */
const resolveMime = (args: Args): string => {
  if (args.mime !== undefined) {
    return args.mime;
  }

  if (args.input === "-") {
    return usageError("--input -: --mime is required when reading from stdin");
  }

  const inferred = inferMimeType(args.input);
  if (inferred === undefined) {
    return usageError(
      `--input: cannot infer MIME from extension of "${args.input}"; pass --mime <type>`,
    );
  }

  return inferred;
};

/**
 * Drain the picture bytes from `--input <path>` or stdin (`--input -`).
 *
 * @param args - The command arguments.
 * @returns The raw image bytes.
 */
const readPictureBytes = async (args: Args): Promise<Uint8Array> => {
  if (args.input === "-") {
    return collectStdin(args.stdin);
  }

  const buffer = await readFile(args.input);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

/** Inputs to {@link composeNextPictures}. */
type ComposeArgs = {
  /** Pictures from the loaded `Track`. */
  readonly current: readonly PictureInfo[];
  /** The picture being added. */
  readonly next: PictureInfo;
  /** Whether `--replace` was passed. */
  readonly replace: boolean;
  /**
   * The numeric kind when `--kind` was passed alongside `--replace`;
   * otherwise `undefined`. With `--replace` alone the existing list is
   * cleared wholesale; with both, only pictures of this kind are dropped
   * before appending.
   */
  readonly scopedKind: PictureKindValue | undefined;
};

/**
 * Compose the next pictures list given the existing one and the planned
 * mutation.
 *
 * - `--replace` alone → drop everything, then append.
 * - `--replace --kind X` → drop only pictures of kind `X`, then append.
 * - no `--replace` → append unconditionally.
 *
 * @returns The composed list.
 */
const composeNextPictures = ({
  current,
  next,
  replace,
  scopedKind,
}: ComposeArgs): readonly PictureInfo[] => {
  if (!replace) {
    return [...current, next];
  }

  if (scopedKind === undefined) {
    return [next];
  }

  return [...current.filter((p) => p.kind !== scopedKind), next];
};

/**
 * Detect a duplicate picture (same kind, MIME, and bytes) in `current`.
 *
 * The "skip when already present" rule: an attempt to add a byte-identical
 * picture is a no-op so that re-running a script that pipes the same cover
 * art does not bloat the file.
 *
 * @param current - Existing pictures.
 * @param next - Picture about to be added.
 * @returns `true` when an exact match is already present.
 */
const hasExactDuplicate = (current: readonly PictureInfo[], next: PictureInfo): boolean =>
  current.some(
    (p) =>
      p.kind === next.kind &&
      p.mimeType === next.mimeType &&
      Buffer.compare(p.data, next.data) === 0,
  );

/**
 * Run `mme picture set <file>`.
 *
 * Loads the existing track, builds a fresh `PictureInfo` from the requested
 * input, and writes back via {@link saveModifiedTrack}. The dedup short-circuit
 * kicks in only when `--replace` is *not* set — a user explicitly asking to
 * replace the picture list always wants the disk to be touched.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const setPicture = async (args: Args): Promise<SetPictureResult> => {
  const data = await readPictureBytes(args);
  const mime = resolveMime(args);
  const kind = args.kind === undefined ? PictureKind.CoverFront : parseKind(args.kind);
  const newPicture: PictureInfo = {
    mimeType: mime,
    kind,
    ...(args.description === undefined ? {} : { description: args.description }),
    data,
  };

  const track = await loadTrack(args.file);
  if (!args.replace && hasExactDuplicate(track.pictures, newPicture)) {
    return {
      stdout: "",
      stderr: `[mme] picture already present (kind=${args.kind ?? "cover-front"}, mime=${mime}); skipping\n`,
    };
  }

  const scopedKind = args.replace && args.kind !== undefined ? kind : undefined;
  const nextPictures = composeNextPictures({
    current: track.pictures,
    next: newPicture,
    replace: args.replace,
    scopedKind,
  });
  await saveModifiedTrack(args.file, { ...track, pictures: nextPictures });
  return { stdout: "", stderr: `[mme] wrote: ${args.file}\n` };
};
