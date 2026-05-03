import { loadTrack } from "@akabeko/music-metadata-editor";
import { saveModifiedTrack } from "../saveModifiedTrack.js";
import { parseChaptersJson } from "./parseChaptersJson.js";

/** Arguments accepted by {@link setChapter}. */
type Args = {
  /** Source audio file. */
  readonly file: string;
  /** Path to the chapters JSON file (`-` reads from stdin). */
  readonly json: string;
  /** Stdin iterable used when `json === "-"`. */
  readonly stdin: AsyncIterable<Uint8Array>;
};

/** Outcome of running `setChapter`. */
export type SetChapterResult = {
  /** Stdout payload (always empty). */
  readonly stdout: string;
  /** Stderr payload (status / info lines). */
  readonly stderr: string;
};

/**
 * Run `mme chapter set <file> --json <path>`.
 *
 * Reads the JSON payload (file or stdin), runs {@link parseChaptersJson} to
 * enforce the per-chapter / cross-chapter invariants, and then rewrites the
 * file via {@link saveModifiedTrack} with the new chapter list. Any
 * pre-existing chapters are replaced wholesale; the CLI does not currently
 * expose a differential edit verb.
 *
 * @returns Buffered stdout / stderr payload.
 */
export const setChapter = async (args: Args): Promise<SetChapterResult> => {
  const chapters = await parseChaptersJson({ path: args.json, stdin: args.stdin });
  const track = await loadTrack(args.file);
  await saveModifiedTrack(args.file, { ...track, chapters });
  return { stdout: "", stderr: `[mme] wrote: ${args.file}\n` };
};
