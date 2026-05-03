import { writeFile } from "node:fs/promises";
import { loadTrack } from "@akabeko/music-metadata-editor";
import { extensionForMime } from "./inferMimeType.js";
import { parseKind } from "./parseKind.js";
import { pickPicture } from "./pickPicture.js";

/** Arguments accepted by {@link extractPicture}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** Destination path; `-` writes raw bytes to stdout. */
  readonly output: string;
  /** Optional `--kind` filter (raw kebab-case). */
  readonly kind?: string;
  /** Optional `--index` selector (already parsed by commander). */
  readonly index?: number;
  /** When `true`, append the inferred extension to `output` based on MIME. */
  readonly autoExtension: boolean;
};

/** Outcome of running `extractPicture`. */
export type ExtractPictureResult = {
  /** Stdout payload as raw bytes (used with `--output -`). */
  readonly stdoutBytes?: Uint8Array;
  /** Stdout payload as text (always empty here, kept for shape parity). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/**
 * Append the canonical extension for `mime` to `path` when known.
 *
 * Unrecognised MIMEs leave the path unchanged because there is no defensible
 * default. When the path already ends with the inferred extension, append
 * still happens — the plan defines `--auto-extension` as an unconditional
 * append, leaving extension hygiene to the user.
 *
 * @param path - User-supplied output path.
 * @param mime - MIME of the picture being extracted.
 * @returns The (possibly suffixed) path.
 */
const appendExtension = (path: string, mime: string): string => {
  const ext = extensionForMime(mime);
  return ext === undefined ? path : `${path}${ext}`;
};

/**
 * Run `mme picture extract <file> --output <path>`.
 *
 * Loads the track, picks one picture via {@link pickPicture}, and writes
 * the raw bytes to either stdout (`--output -`) or a path on disk. When
 * nothing matches, an `Error` is thrown — `formatMmeError` translates it
 * into exit code `1` (Failure) at the bin layer.
 *
 * @returns Buffered stdout / stderr payload (and optional raw stdout bytes).
 * @throws `Error` when the kind/index combination resolves to no picture.
 */
export const extractPicture = async (args: Args): Promise<ExtractPictureResult> => {
  const track = await loadTrack(args.file);
  const filter = {
    ...(args.kind === undefined ? {} : { kind: parseKind(args.kind) }),
    ...(args.index === undefined ? {} : { index: args.index }),
  };
  const picture = pickPicture(track.pictures, filter);
  if (picture === undefined) {
    const where = `kind=${args.kind ?? "any"}, index=${args.index ?? 0}`;
    throw new Error(`no picture matched (${where})`);
  }

  if (args.output === "-") {
    return {
      stdoutBytes: picture.data,
      stdout: "",
      stderr: `[mme] extracted picture (${picture.mimeType}, ${picture.data.byteLength} bytes)\n`,
    };
  }

  const target = args.autoExtension ? appendExtension(args.output, picture.mimeType) : args.output;
  await writeFile(target, picture.data);
  return { stdout: "", stderr: `[mme] wrote: ${target}\n` };
};
